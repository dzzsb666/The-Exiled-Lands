"""Inspect user-provided HAR terrain bodies offline; never print headers or credentials."""
import base64
import binascii
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
tile_path = re.compile(r"/games/conan-exiles/exiled-lands/default-v1/(\d+)/(\d+)/(\d+)\.jpg")
captured = set()
files = []
for har in sorted((ROOT / "research").rglob("*.har")):
    entries = json.loads(har.read_text(encoding="utf-8-sig"))["log"]["entries"]
    requests = 0
    valid = set()
    missing = 0
    invalid = 0
    statuses = Counter()
    for entry in entries:
        url = urlsplit(entry["request"]["url"])
        match = tile_path.fullmatch(url.path)
        if url.hostname != "tiles.mapgenie.io" or not match:
            continue
        requests += 1
        response = entry["response"]
        statuses[response["status"]] += 1
        content = response.get("content", {})
        if response["status"] != 200 or not content.get("text"):
            missing += 1
            continue
        try:
            body = base64.b64decode(content["text"], validate=True) if content.get("encoding") == "base64" else b""
        except (ValueError, binascii.Error):
            body = b""
        if not body.startswith(b"\xff\xd8\xff") or not body.endswith(b"\xff\xd9"):
            invalid += 1
            continue
        valid.add(tuple(map(int, match.groups())))
    captured.update(valid)
    files.append({"file": har.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(har.read_bytes()).hexdigest(),
                  "entries": len(entries), "terrainRequests": requests, "statuses": dict(statuses),
                  "validUniqueJpegBodies": len(valid), "missingOrUnsuccessful": missing, "invalidJpegBodies": invalid})
report = {"offlineOnly": True, "files": files, "uniqueTerrainBodies": len(captured),
          "byZoom": dict(sorted(Counter(str(tile[0]) for tile in captured).items())),
          "note": "Counts verify captured JPEG bodies, not complete map coverage. No headers, cookies, or tokens are included."}
out = ROOT / ".qa/local-har-audit.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
print(json.dumps(report, ensure_ascii=False, indent=2))

"""Extract public map assets from the user-supplied HAR, entirely offline.

Never copy request headers, cookies, analytics, ad creatives, or arbitrary scripts.
"""
from pathlib import Path
from urllib.parse import urlsplit
import base64
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
HAR = ROOT / "research/mapgenie.io.har"
OUT = ROOT / ".qa/source-assets"
OUT.mkdir(parents=True, exist_ok=True)
entries = json.loads(HAR.read_text(encoding="utf-8-sig"))["log"]["entries"]
manifest = []

def approved(host, path):
    if host == "tiles.mapgenie.io":
        return path.startswith("/games/conan-exiles/exiled-lands/") or "conan-exiles/exiled-lands/" in path
    if host == "media.mapgenie.io":
        return path.startswith("/v2/assets/prod/games/conan-exiles/") or path.startswith("/v2/assets/prod/fonts/crom/")
    if host == "cdn.mapgenie.io":
        return (path.startswith("/css/") or path.startswith("/fonts/conan-exiles/") or path.startswith("/fonts/ionicons/")
                or path.startswith("/js/vendor/maplibre-gl.") or path.startswith("/js/vendor/toastr-")
                or re.fullmatch(r"/js/map\.[\w]+\.js", path) is not None or path.startswith("/images/games/rdr2/pins/pin-"))
    if host == "mapgenie.io":
        return path in {"/api/v1/maps/258/data", "/conan-exiles/maps/exiled-lands"}
    if host == "fonts.gstatic.com":
        return path.startswith("/s/opensans/")
    if host == "cdnjs.cloudflare.com":
        return any(path.startswith(prefix) for prefix in ["/ajax/libs/jquery/", "/ajax/libs/popper.js/", "/ajax/libs/twitter-bootstrap/", "/ajax/libs/bootstrap/", "/ajax/libs/markdown-it/", "/ajax/libs/intro.js/", "/ajax/libs/magnific-popup.js/", "/ajax/libs/toastr.js/"])
    if host == "ajax.googleapis.com":
        return path == "/ajax/libs/jquery/3.7.0/jquery.min.js"
    if host == "cdn.jsdelivr.net":
        return path == "/npm/markdown-it@13.0.2/dist/markdown-it.min.js"
    return False

for entry in entries:
    url = urlsplit(entry["request"]["url"])
    response = entry["response"]
    content = response.get("content", {})
    if not approved(url.hostname, url.path) or response["status"] != 200 or not content.get("text"):
        continue
    data = base64.b64decode(content["text"]) if content.get("encoding") == "base64" else content["text"].encode("utf-8")
    relative = Path(url.hostname + url.path)
    dest = OUT / relative
    if not dest.resolve().is_relative_to(OUT.resolve()):
        raise ValueError("Unexpected asset path outside output directory")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    manifest.append({"host": url.hostname, "path": url.path, "file": relative.as_posix(), "bytes": len(data),
                     "mime": content.get("mimeType"), "sha256": hashlib.sha256(data).hexdigest()})

(OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"harEntries": len(entries), "approvedAssets": len(manifest),
                  "fonts": [item["file"] for item in manifest if item["mime"].startswith("font/")],
                  "tiles": [item["path"] for item in manifest if item["host"] == "tiles.mapgenie.io"],
                  "libraries": [item["path"] for item in manifest if item["host"] == "cdnjs.cloudflare.com"]}, ensure_ascii=False, indent=2))

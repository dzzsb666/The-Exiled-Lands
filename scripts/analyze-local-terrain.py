"""Compare captured MapGenie terrain with the existing clean map, offline only.

Analysis never generates replacement runtime tiles or changes either source.
Uses the OpenCV runtime already retained by previous mapping work.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "research/image-check-runtime"))
import cv2
import numpy as np
from PIL import Image

tiles = ROOT / "reference/source/tiles.mapgenie.io/games/conan-exiles/exiled-lands/default-v1/12"
base_path = ROOT / "assets/maps/exiled-lands-clean-original-4000x4000.jpg"
native = Image.new("RGB", (1536, 1024))
for x in range(2036, 2042):
    for y in range(2040, 2044):
        with Image.open(tiles / str(x) / f"{y}.jpg") as tile:
            native.paste(tile, ((x - 2036) * 256, (y - 2040) * 256))
native = np.asarray(native)
base = np.asarray(Image.open(base_path).convert("RGB"))
small_base = cv2.resize(base, (2000, 2000), interpolation=cv2.INTER_AREA)
detector = cv2.SIFT_create(nfeatures=24000)
k1, d1 = detector.detectAndCompute(cv2.cvtColor(native, cv2.COLOR_RGB2GRAY), None)
k2, d2 = detector.detectAndCompute(cv2.cvtColor(small_base, cv2.COLOR_RGB2GRAY), None)
pairs = cv2.BFMatcher().knnMatch(d1, d2, k=2)
good = [a for a, b in pairs if a.distance < .65 * b.distance]
a = np.float32([k1[m.queryIdx].pt for m in good])
b = np.float32([k2[m.trainIdx].pt for m in good]) * 2
matrix, mask = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=3)
if matrix is None or mask.sum() < 30:
    raise RuntimeError("Insufficient matching terrain evidence; do not substitute the map.")
inside = mask[:, 0].astype(bool)
residual = np.linalg.norm(a @ matrix[:, :2].T + matrix[:, 2] - b, axis=1)
aligned = cv2.warpAffine(base, matrix, (1536, 1024), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
delta = np.abs(native.astype(float) - aligned.astype(float))
correlation = float(np.corrcoef(cv2.cvtColor(native, cv2.COLOR_RGB2GRAY).ravel(), cv2.cvtColor(aligned, cv2.COLOR_RGB2GRAY).ravel())[0, 1])
out = ROOT / "docs/fidelity"
out.mkdir(exist_ok=True)
result = {
    "analysisOnly": True, "runtimeTilesChanged": False,
    "source": "24 captured z12 MapGenie tiles; x2036–2041, y2040–2043",
    "candidate": str(base_path.relative_to(ROOT)),
    "candidateSha256": hashlib.sha256(base_path.read_bytes()).hexdigest(),
    "matrixCapturedMosaicToClean4000": matrix.tolist(),
    "featureMatches": len(good), "inliers": int(inside.sum()),
    "medianResidualCleanPixels": float(np.median(residual[inside])),
    "p95ResidualCleanPixels": float(np.percentile(residual[inside], 95)),
    "grayCorrelation": correlation, "meanAbsoluteChannelDifference": float(delta.mean()),
    "exactPixelMatch": bool(np.array_equal(native, aligned)),
    "conclusion": "Shared terrain can be geometrically aligned; this is not evidence of identical pixels or full-map equivalence. Keep original captured tiles in the faithful clone.",
}
(out / "terrain-alignment.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
comparison = Image.new("RGB", (1536, 512))
comparison.paste(Image.fromarray(native).resize((768, 512)), (0, 0))
comparison.paste(Image.fromarray(aligned).resize((768, 512)), (768, 0))
comparison.save(out / "terrain-source-vs-clean.jpg", quality=92)
print(json.dumps(result, ensure_ascii=False))

"""Inspect only the user-provided saved page; never request remote resources.

Build a script-free, network-disabled evidence viewer, not an app prototype.
Original files remain untouched. Generated output is ignored under .qa/.
"""
from html.parser import HTMLParser
from html import escape
from pathlib import Path
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "research/Exiled Lands _ Conan Exiles Interactive Map _ MapGenie.html"
ASSETS = SOURCE.with_name(SOURCE.stem + "_files")
OUT = ROOT / ".qa/reference"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "assets").mkdir(exist_ok=True)

css_names = ["bootstrap.min.css", "app.ef9a420e.css", "base-theme.919dc57a.css",
             "theme.css", "conan-exiles-icons.78a26005.css", "ionicons@4.2.6.min.css",
             "maplibre-gl.9ec5b480.css", "toastr.min.css"]
manifest = {"source": str(SOURCE.relative_to(ROOT)), "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "styles": [], "missingFontReferences": [], "icons": [], "canvas": [],
            "localFonts": [], "localMapImages": [], "networkAccess": False}
for name in css_names:
    path = ASSETS / name
    if not path.exists():
        continue
    css = path.read_text(encoding="utf-8")
    manifest["styles"].append({"file": name, "bytes": path.stat().st_size,
                                "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    for font in re.findall(r"url\([\"']?([^\)\"']+\.(?:woff2?|ttf|eot|svg)(?:[^\)\"']*)?)[\"']?\)", css):
        if font not in manifest["missingFontReferences"]:
            manifest["missingFontReferences"].append(font)
    # Disable imports to remote fonts while preserving the supplied local rules.
    css = re.sub(r"@import\s+[^;]+;", "/* Remote import disabled in offline evidence viewer. */", css)
    (OUT / "assets" / name).write_text(css, encoding="utf-8")
icon_css = (ASSETS / "conan-exiles-icons.78a26005.css").read_text(encoding="utf-8")
for name, glyph, color in re.findall(r"\.icon-([\w-]+):before\s*\{\s*content:\s*\"\\([0-9a-f]+)\";\s*(?:color:\s*([^;]+);)?", icon_css):
    manifest["icons"].append({"name": name, "codepoint": glyph, "color": color or None})
for path in ASSETS.iterdir():
    if path.suffix.lower() in {".woff", ".woff2", ".ttf", ".eot"}:
        manifest["localFonts"].append(path.name)
    if path.name in {"logo-512.png", "logo-small.png"}:
        shutil.copyfile(path, OUT / "assets" / path.name)
    elif path.suffix.lower() in {".jpg", ".jpeg", ".webp"} and path.stat().st_size > 1024:
        manifest["localMapImages"].append(path.name)

class SafePage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output = []
        self.skip = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "iframe", "object", "embed"}:
            self.skip.append(tag)
            return
        if self.skip:
            return
        values = dict(attrs)
        if tag == "meta" and not ("charset" in values or values.get("name") == "viewport" or values.get("http-equiv", "").lower() == "content-type"):
            return
        if tag == "link":
            name = Path(values.get("href", "").split("?")[0]).name
            if values.get("rel") != "stylesheet" or name not in css_names:
                return
            values = {"rel": "stylesheet", "href": "assets/" + name}
        else:
            values = {key: val for key, val in values.items()
                      if not key.lower().startswith("on") and key not in {"srcset", "integrity", "nonce", "srcdoc"}}
            if tag == "a":
                values["href"] = "#"
                values.pop("target", None)
            if "src" in values:
                name = Path(values["src"].split("?")[0]).name
                if (OUT / "assets" / name).is_file():
                    values["src"] = "assets/" + name
                else:
                    values.pop("src")
            if tag == "canvas":
                manifest["canvas"].append({key: values.get(key) for key in ("width", "height", "style")})
        self.output.append("<" + tag + "".join(" " + key + ("=\"" + escape(val, quote=True) + "\"" if val is not None else "") for key, val in values.items()) + ">")
        if tag == "head":
            self.output.append('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'none\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\' data:; connect-src \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if self.skip:
            if tag == self.skip[-1]:
                self.skip.pop()
            return
        self.output.append("</" + tag + ">")

    def handle_data(self, data):
        if not self.skip:
            self.output.append(data)

    def handle_entityref(self, name):
        if not self.skip:
            self.output.append("&" + name + ";")

    def handle_charref(self, name):
        if not self.skip:
            self.output.append("&#" + name + ";")

page = SafePage()
page.feed(SOURCE.read_text(encoding="utf-8"))
(OUT / "index.html").write_text("<!doctype html>" + "".join(page.output), encoding="utf-8")
(OUT / "inventory.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"styles": len(manifest["styles"]), "iconDefinitions": len(manifest["icons"]),
                  "fontFiles": len(manifest["localFonts"]), "mapImages": len(manifest["localMapImages"]),
                  "canvas": manifest["canvas"], "viewer": str((OUT / "index.html").relative_to(ROOT))}, ensure_ascii=False))

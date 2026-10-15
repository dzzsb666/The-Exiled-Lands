"""Replay the supplied public map source with local assets and zero remote requests.

This English evidence build is separate from the Chinese application. Ads and
tracking are removed explicitly; only captured map scripts can execute.
"""
from pathlib import Path
from urllib.parse import urlsplit
from html.parser import HTMLParser
from html import escape
import json
import re
import shutil
import ast

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / ".qa/source-assets"
OUT = ROOT / ".qa/replay"
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ASSETS / "manifest.json").read_text(encoding="utf-8"))
local_files = {item["host"] + item["path"]: item for item in manifest}
origins = ["cdn.mapgenie.io", "media.mapgenie.io", "tiles.mapgenie.io", "fonts.gstatic.com", "ajax.googleapis.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"]

def local_url(url):
    parsed = urlsplit(url)
    key = parsed.netloc + parsed.path
    return "/source/" + key if key in local_files else None

def rewrite_urls(text):
    for origin in origins:
        text = text.replace("https://" + origin, "/source/" + origin).replace("https:\\/\\/" + origin, "/source/" + origin)
    return text

for item in manifest:
    if item["host"] == "mapgenie.io":
        continue
    source = ASSETS / item["file"]
    dest = OUT / "source" / item["file"]
    dest.parent.mkdir(parents=True, exist_ok=True)
    if item["mime"] in {"text/css", "text/javascript", "application/javascript"}:
        text = rewrite_urls(source.read_text(encoding="utf-8"))
        if item["mime"] == "text/css":
            text = re.sub(r"@import\s+url\([^)]*\)\s*;", "", text)
        if item["path"].endswith("conan-exiles-icons.78a26005.css"):
            start, end = text.index("@font-face"), text.index("}") + 1
            text = text[:start] + "@font-face{font-family:icomoon;src:url('/source/cdn.mapgenie.io/fonts/conan-exiles/icons/icomoon.ttf') format('truetype');font-weight:normal;font-style:normal;font-display:block;}" + text[end:]
        if item["path"].endswith("ionicons@4.2.6.min.css"):
            text = re.sub(r"@font-face\{[^}]+\}", "@font-face{font-family:Ionicons;src:url('/source/cdn.mapgenie.io/fonts/ionicons/ionicons.woff2') format('woff2');font-weight:normal;font-style:normal;}", text)
        if re.fullmatch(r"/js/map\.[\w]+\.js", item["path"]):
            search_call = 'window.axios.get("/api/v1/search",{params:{query:n}})'
            if text.count(search_call) != 1:
                raise RuntimeError("Unexpected source search implementation")
            text = text.replace(search_call, 'window.offlineSearch(n)')
        dest.write_text(text, encoding="utf-8")
    else:
        shutil.copyfile(source, dest)

font = next(item["file"] for item in manifest if item["host"] == "fonts.gstatic.com")
(OUT / "offline-fonts.css").write_text("@font-face{font-family:'Open Sans';font-style:normal;font-weight:300 800;font-display:swap;src:url('/source/" + font + "') format('woff2');}", encoding="utf-8")
(OUT / "no-ads.css").write_text("#nitro-floating-wrapper,#nitro-floating,#blobby-left,#blobby-overlay,.pro-upgrade-element,#categories .presets-panel,#categories .settings-section{display:none!important}", encoding="utf-8")
source_html = (ASSETS / "mapgenie.io/conan-exiles/maps/exiled-lands").read_text(encoding="utf-8")
decoder = json.JSONDecoder()
flags = ["mapUrl", "baseUrl", "cdnUrl", "tilesCdnUrl", "storageCdnUrl", "mapData", "specialData", "isEditor", "isWizard", "isMapEditor", "isWizardPinEditor", "isWizardSuggestions", "isWizardRegions", "isWizardRealign", "isWizardNotes", "isWizardMapView", "isWizardBulkEdit", "isPreview", "isWizardCoordinateGrid", "isWizardRoads", "isWizardMergePins", "isEmbedded", "isMini", "partner", "embedType", "needsVerification", "game", "config"]
values = {}
for key in flags:
    match = re.search(r"window\." + key + r"\s*=\s*", source_html)
    if match:
        values[key] = decoder.raw_decode(source_html[match.end():])[0]
values["user"] = None
values["mapUrl"] = "/"
values["baseUrl"] = "https://mapgenie.io/conan-exiles"
values["storageCdnUrl"] = "/unavailable-storage"
config_js = "\n".join("window." + key + "=" + json.dumps(value, ensure_ascii=False) + ";" for key, value in values.items())
config_js = rewrite_urls(config_js)
for match in re.finditer(r"(?:var|const|let) (MARKER_[A-Z_0-9]+)\s*=\s*", source_html):
    tail = source_html[match.end():]
    value = ast.literal_eval(tail.split(";", 1)[0]) if tail.startswith("'") else decoder.raw_decode(tail)[0]
    config_js += "\nvar " + match.group(1) + "=" + rewrite_urls(json.dumps(value)) + ";"
config_js += "\nwindow.mapboxgl=window.maplibregl;window.Analytics={trackEngagement(){},trackEvent(){},setDefaultParams(){}};window.isMobile=innerWidth<768;window.isOverwolf=false;window.md=window.markdownit({html:false});\n"
config_js += "\nfor(const key of ['cdnUrl','tilesCdnUrl']) window[key]=location.origin+window[key];MARKER_IMAGES_URL=location.origin+MARKER_IMAGES_URL;window.mapData.mapConfig.glyphs_url=location.origin+window.mapData.mapConfig.glyphs_url;\n"
config_js += "\nwindow.offlineSearch=async function(query){const data=await fetch('/api/v1/maps/258/data').then(r=>r.json());const q=query.trim().toLocaleLowerCase();const locations=data.locations.filter(p=>[p.title,window.mapData.categories[p.category_id]?.title,p.description].some(v=>typeof v==='string'&&v.toLocaleLowerCase().includes(q))).map(p=>p.id);return {data:{locations,notes:[],categories:[]}};};\n"
(OUT / "offline-config.js").write_text(config_js, encoding="utf-8")
api = OUT / "api/v1/maps/258/data"
api.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(ASSETS / "mapgenie.io/api/v1/maps/258/data", api)

void_tags = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
drop_ids = {"nitro-floating-wrapper", "nitro-floating", "blobby-left", "blobby-overlay", "blobby-left-inner"}
scripts = [item for item in manifest if item["mime"] in {"text/javascript", "application/javascript"}]
order = ["maplibre-gl.db497461.js", "markdown-it.min.js", "jquery.min.js", "popper.min.js", "jquery.magnific-popup.min.js", "bootstrap.min.js", "intro.min.js", "toastr-2.1.3-modified.min.js"]
script_urls = []
for name in order:
    match = next((item for item in scripts if item["path"].endswith("/" + name)), None)
    if match:
        script_urls.append("/source/" + match["file"])
map_js = next(item for item in scripts if re.fullmatch(r"/js/map\.[\w]+\.js", item["path"]))

class CleanSource(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.output = []
        self.stack = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        drop = tag in {"script", "iframe", "noscript", "object", "embed"} or values.get("id") in drop_ids
        hidden = self.skip > 0 or drop
        if tag not in void_tags:
            self.stack.append((tag, hidden))
            if hidden:
                self.skip += 1
        if hidden:
            return
        if tag == "meta":
            if not ("charset" in values or values.get("name") == "viewport" or values.get("http-equiv", "").lower() == "content-type"):
                return
        if tag == "link":
            url = local_url(values.get("href", ""))
            if values.get("rel") != "stylesheet" or not url:
                return
            values = {"rel": "stylesheet", "href": url}
        else:
            values = {key: value for key, value in values.items() if not key.lower().startswith("on") and key not in {"nonce", "integrity", "srcset", "srcdoc"}}
            if "src" in values:
                url = local_url(values["src"])
                if url:
                    values["src"] = url
                else:
                    values.pop("src")
            if values.get("class"):
                values["class"] = " ".join(c for c in values["class"].split() if c not in {"footer-large", "footer-small"})
        self.output.append("<" + tag + "".join(" " + key + ("=\"" + escape(value, quote=True) + "\"" if value is not None else "") for key, value in values.items()) + ">")
        if tag == "head":
            self.output.append('<meta name="csrf-token" content="offline-public-map"><meta name="base-url" content="">')
            self.output.append('<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; connect-src \'self\' blob:; worker-src \'self\' blob:; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">')
            self.output.append('<link rel="stylesheet" href="/no-ads.css">')
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in void_tags:
            self.handle_endtag(tag)
    def handle_endtag(self, tag):
        if tag in void_tags:
            return
        if not self.stack:
            return
        opened, hidden = self.stack.pop()
        if hidden:
            self.skip -= 1
            return
        if tag == "head":
            self.output.append('<link rel="stylesheet" href="/offline-fonts.css">')
        if tag == "body":
            self.output.extend('<script src="' + url + '"></script>' for url in script_urls)
            self.output.append('<script src="/offline-config.js"></script><script src="/source/' + map_js["file"] + '"></script>')
        self.output.append("</" + tag + ">")
    def handle_data(self, data):
        if self.skip == 0:
            self.output.append(data)
    def handle_entityref(self, name):
        if self.skip == 0:
            self.output.append("&" + name + ";")
    def handle_charref(self, name):
        if self.skip == 0:
            self.output.append("&#" + name + ";")

page = CleanSource()
page.feed(source_html)
clean_html = "<!doctype html>" + "".join(page.output)
(OUT / "index.html").write_text("\n".join(line.rstrip() for line in clean_html.splitlines()).rstrip() + "\n", encoding="utf-8")
print(json.dumps({"output": str(OUT.relative_to(ROOT)), "scripts": script_urls, "mapScript": map_js["file"], "offlineOnly": True}))

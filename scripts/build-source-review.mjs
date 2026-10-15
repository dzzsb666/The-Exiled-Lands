import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse } from "@babel/parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const reference = path.join(root, "reference");
const target = path.join(root, "public/review");
if (!fs.existsSync(path.join(reference, "index.html")))
  throw new Error("Missing sanitized English source fixture.");
const ui = read("data/interface-translations.json");
const map = read("public/data/map.json");
const points = new Map(map.points.map((p) => [p.id, p]));
const categories = new Map(map.categories.map((c) => [c.id, c]));
const groups = new Map(map.groups.map((g) => [g.id, g]));
const prefix = (text) => text.replaceAll("/source/", "/review/source/");

function translateLiterals(text) {
  const edits = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "StringLiteral" && Object.hasOwn(ui, node.value))
      edits.push({ start: node.start, end: node.end, text: JSON.stringify(ui[node.value]) });
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(parse(text, { sourceType: "script" }));
  for (const edit of edits.sort((a, b) => b.start - a.start))
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  return text;
}

const assets = [];
function copyTree(dir, relative = "") {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.posix.join(relative, item.name);
    if (item.isDirectory()) copyTree(path.join(dir, item.name), file);
    else {
      const dest = path.join(target, "source", file);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      let bytes = fs.readFileSync(path.join(dir, item.name));
      if (/\.(css|js)$/.test(file)) {
        let text = prefix(bytes.toString("utf8"));
        if (file.endsWith("/theme/v3/theme.css"))
          text = text.replace('content: "MAPS";', 'content: "地图";');
        if (/\/js\/vendor\/maplibre-gl\.[\w]+\.js$/.test(file))
          text = translateLiterals(text);
        if (/\/js\/map\.[\w]+\.js$/.test(file)) {
          const apiCall = 'm("/api/v1/maps/".concat(e,"/data"))';
          if (text.split(apiCall).length !== 2)
            throw new Error("Unexpected original map data loader.");
          text = text.replace(apiCall, 'm("/review/data/locations.json")');
          // Original controls are clickable before the asynchronous map manager is ready.
          const filterStart = 'key:"setLocationsFilter",value:function(){var e=this.getLocationsFilter()';
          if (text.split(filterStart).length !== 2)
            throw new Error("Unexpected original map filter implementation.");
          text = text.replace(filterStart, 'key:"setLocationsFilter",value:function(){if(!this.map)return;var e=this.getLocationsFilter()');
          text = translateLiterals(text);
        }
        bytes = Buffer.from(text);
      }
      fs.writeFileSync(dest, bytes);
      assets.push({ file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
  }
}
copyTree(path.join(reference, "source"));
const payload = read("reference/api/v1/maps/258/data");
for (const point of payload.locations) {
  point.original_title = point.title;
  const confirmed = points.get(point.id);
  if (confirmed?.name) point.title = confirmed.name;
  // Keep untranslated source descriptions; local links open this same map.
  if (point.description)
    point.description = point.description.replaceAll("https://mapgenie.io/conan-exiles/maps/exiled-lands?", "/review/index.html?");
}
fs.mkdirSync(path.join(target, "data"), { recursive: true });
fs.writeFileSync(path.join(target, "data/locations.json"), JSON.stringify(payload));
fs.writeFileSync(path.join(target, "fonts.css"), prefix(fs.readFileSync(path.join(reference, "offline-fonts.css"), "utf8")));
let config = prefix(fs.readFileSync(path.join(reference, "offline-config.js"), "utf8"));
config = config.replace('window.mapUrl="/";', 'window.mapUrl="/review/index.html";');
config = config.slice(0, config.indexOf("window.offlineSearch="));
const names = {
  categories: Object.fromEntries([...categories].filter(([, c]) => c.name).map(([id, c]) => [id, c.name])),
  groups: Object.fromEntries([...groups].map(([id, g]) => [id, g.name])),
};
config += `
const confirmedNames=${JSON.stringify(names)};
for(const group of window.mapData.groups){
  group.title=confirmedNames.groups[group.id]||group.title;
  for(const category of group.categories) category.title=confirmedNames.categories[category.id]||category.title;
}
for(const category of Object.values(window.mapData.categories)) category.title=confirmedNames.categories[category.id]||category.title;
window.mapData.map.title="流放之地";
window.offlineSearch=async function(query){
  const data=await fetch('/review/data/locations.json').then(r=>r.json());
  const q=query.trim().toLocaleLowerCase();
  const locations=data.locations.filter(p=>[p.title,p.original_title,window.mapData.categories[p.category_id]?.title,p.description].some(v=>typeof v==='string'&&v.toLocaleLowerCase().includes(q))).map(p=>p.id);
  return {data:{locations,notes:[],categories:[]}};
};
`;
fs.writeFileSync(path.join(target, "map-config.js"), config);
fs.writeFileSync(path.join(target, "no-ads.css"), `/* Remove original advertising and upgrade promotions; no layout redesign. */
#nitro-floating-wrapper,#nitro-floating,#blobby-left,#blobby-overlay,.pro-upgrade-element,#categories .presets-panel,#categories .settings-section{display:none!important}
`);
let html = prefix(fs.readFileSync(path.join(reference, "index.html"), "utf8"))
  .replaceAll("/offline-config.js", "/review/map-config.js")
  .replaceAll("/offline-fonts.css", "/review/fonts.css")
  .replaceAll('href="/no-ads.css"', 'href="/review/no-ads.css"')
  .replace('<html lang="en">', '<html lang="zh-CN">');
html = html.replace(/>([^<>]+)</g, (whole, text) => {
  const trimmed = text.trim();
  return Object.hasOwn(ui, trimmed) ? ">" + text.replace(trimmed, ui[trimmed]) + "<" : whole;
});
html = html.replace("</head>", '<link rel="stylesheet" href="/review/no-ads.css"></head>');
for (const [source, translated] of Object.entries(ui))
  html = html.replaceAll(`aria-label="${source}"`, `aria-label="${translated}"`)
    .replaceAll(`placeholder="${source}"`, `placeholder="${translated}"`);
html = html.replace('href="https://mapgenie.io/conan-exiles/maps/exiled-lands"', 'href="/review/index.html"');
fs.writeFileSync(path.join(target, "index.html"), html.split(/\r?\n/).map((line) => line.trimEnd()).join("\n").trimEnd() + "\n");
fs.writeFileSync(path.join(target, "asset-manifest.json"), JSON.stringify({
  source: "User-provided saved webpage and HAR, 2026-10-15",
  adsExcluded: true, remoteRequestsAllowed: false,
  tiles: { capturedZoom: 12, capturedCount: 24, fullZoom12Count: 256, complete: false },
  sourceLocations: payload.locations.length, assets,
}, null, 2));
console.log(JSON.stringify({ review: "/review/", assets: assets.length, points: payload.locations.length, fullMapComplete: false }));

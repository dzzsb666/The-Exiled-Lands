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
        if (file.endsWith(".css")) text = text
          .replace(/@import url\(['"]https:\/\/fonts\.googleapis\.com\/[^'"]+['"]\);/g, "")
          .replaceAll("https://media.mapgenie.io/", "/review/source/media.mapgenie.io/");
        if (file.endsWith("/theme/v3/theme.css"))
          text = text.replace('content: "MAPS";', 'content: "地图";');
        if (/\/js\/(?:vendor\/maplibre-gl|maplibre)\.[\w]+\.js$/.test(file))
          text = translateLiterals(text);
        if (/\/js\/map\.[\w]+\.js$/.test(file)) {
          const sourceSearchCall = 'window.axios.get("/api/v1/search",{params:{query:n}})';
          if (text.includes(sourceSearchCall)) {
            if (text.split(sourceSearchCall).length !== 2)
              throw new Error("Unexpected original search implementation.");
            text = text.replace(sourceSearchCall, "window.offlineSearch(n)");
          } else if (!text.includes("window.offlineSearch(n)"))
            throw new Error("Missing local source search adapter.");
          const apiCall = text.match(/[\w$]+\("\/api\/v1\/maps\/"\.concat\(e,"\/data"\)\)/)?.[0];
          if (!apiCall || text.split(apiCall).length !== 2)
            throw new Error("Unexpected original map data loader.");
          const apiFunction = apiCall.slice(0, apiCall.indexOf("("));
          text = text.replace(apiCall, `${apiFunction}(259===Number(e)?"/review/data/siptah-locations.json":"/review/data/locations.json")`);
          // Original controls are clickable before the asynchronous map manager is ready.
          const filterStart = 'key:"setLocationsFilter",value:function(){var e=this.getLocationsFilter()';
          if (text.split(filterStart).length !== 2)
            throw new Error("Unexpected original map filter implementation.");
          text = text.replace(filterStart, 'key:"setLocationsFilter",value:function(){if(!this.map)return;var e=this.getLocationsFilter()');
          // Local search can finish before the asynchronous source map is initialized.
          const initialFilter = 'key:"getInitialLocationsFilter",value:function(e){return';
          if (text.split(initialFilter).length !== 2)
            throw new Error("Unexpected original initial map filter implementation.");
          text = text.replace(initialFilter, 'key:"getInitialLocationsFilter",value:function(e){var t=window.store.getState().search.searchResults;if(t&&t.locations)return["in",["get","locationId"],["literal",t.locations]];return');
          // Each map keeps its own settings; leave the parallel Siptah implementation intact.
          if (file.endsWith("/map.113b2a48.js")) {
            for (const setting of ["remember_categories", "visible_categories:id_"]) {
              const originalKey = `"mg:settings:game_".concat(window.game.id,":${setting}")`;
              if (text.split(originalKey).length !== 2)
                throw new Error("Unexpected original category preference key.");
              text = text.replace(originalKey, `"mg:settings:game_".concat(window.game.id,(window.mapData.map.id===258?":map_258":"")+":${setting}")`);
            }
            const markerSize = 'if(null===t)return e(this.iconSize);';
            if (text.split(markerSize).length !== 2)
              throw new Error("Unexpected original old-map marker size.");
            text = text.replace(markerSize, 'if(null===t&&window.mapData.map.id===258)return["interpolate",["linear"],["zoom"],7,e(.2*this.iconSize),14,e(this.iconSize)];if(null===t)return e(this.iconSize);');
            const markerScale = 'if(null===e)return this.iconSize;';
            if (text.split(markerScale).length !== 2)
              throw new Error("Unexpected original popup marker scale.");
            text = text.replace(markerScale, 'if(null===e)return window.mapData.map.id===258?this.iconSize*(.2+.8*(Math.max(7,Math.min(14,this.map.getZoom()))-7)/7):this.iconSize;');
            const layersReady = 'var je=(0,Z().PL)().locationLinesConfig||{};';
            if (text.split(layersReady).length !== 2)
              throw new Error("Unexpected original map layer assembly.");
            text = text.replace(layersReady, 'if(window.mapData.map.id===258){const exiledCircleLayer=Re.find(layer=>layer.id===x);if(exiledCircleLayer){const radius=exiledCircleLayer.paint["circle-radius"];exiledCircleLayer.paint["circle-radius"]=["interpolate",["linear"],["zoom"],7,["*",.2,radius],14,radius];}}' + layersReady);
          }
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
  for (const media of point.media || [])
    if (media.url?.startsWith("https://media.mapgenie.io/storage/media/"))
      media.url = media.url.replace("https://media.mapgenie.io/", "/review/source/media.mapgenie.io/");
}
fs.mkdirSync(path.join(target, "data"), { recursive: true });
fs.writeFileSync(path.join(target, "data/locations.json"), JSON.stringify(payload));
const siptahPayload = read("reference/api/v1/maps/259/data");
const siptahData = read("reference/maps/259/config.json");
const translations = read("data/translations.json");
for (const point of siptahPayload.locations) {
  point.original_title = point.title;
  const category = siptahData.categories[point.category_id];
  const confirmedCategory = categories.get(point.category_id);
  // Reuse only identical generic types in the same original category, and confirmed dictionaries.
  if ([754, 755, 756].includes(category.group_id) && point.title === category.title && confirmedCategory?.name)
    point.title = confirmedCategory.name;
  else if ((point.category_id === 3332 && point.title === "Named Thrall") ||
    (category.title === "Sabretooth" && point.title === "Sabertooth") ||
    (point.category_id === 3362 && point.title === "Iron Node"))
    point.title = translations[point.title].name;
  else if (point.category_id === 3308 && translations[point.title])
    point.title = translations[point.title].name;
  if (point.description) point.description = point.description
    .replaceAll("https://mapgenie.io/conan-exiles/maps/isle-of-siptah?", "/review/siptah.html?")
    .replaceAll("https://mapgenie.io/conan-exiles/maps/exiled-lands?", "/review/index.html?");
}
fs.writeFileSync(path.join(target, "data/siptah-locations.json"), JSON.stringify(siptahPayload));
const csvCell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
const pendingSiptah = [
  ["kind", "id", "english", "context"],
  ...Object.values(siptahData.categories).filter(c => !categories.get(c.id)?.name)
    .map(c => ["category", c.id, c.title, "西普塔岛侧栏分类"]),
  ...siptahPayload.locations.filter(p => p.title === p.original_title)
    .map(p => ["point", p.id, p.original_title, siptahData.categories[p.category_id].title]),
];
fs.writeFileSync(path.join(root, "data/pending-siptah-translations.csv"), "\uFEFF" + pendingSiptah.map(row => row.map(csvCell).join(",")).join("\n") + "\n");
fs.writeFileSync(path.join(target, "fonts.css"), prefix(fs.readFileSync(path.join(reference, "offline-fonts.css"), "utf8")));
let config = prefix(fs.readFileSync(path.join(reference, "offline-config.js"), "utf8"));
// The current original MapLibre bundle initializes window.mapboxgl itself.
config = config.replace("window.mapboxgl=window.maplibregl;", "");
config = config.replace('window.mapUrl="/";', 'window.mapUrl="/review/index.html";');
config = config.slice(0, config.indexOf("window.offlineSearch="));
const names = {
  categories: Object.fromEntries([...categories].filter(([, c]) => c.name).map(([id, c]) => [id, c.name])),
  groups: Object.fromEntries([...groups].map(([id, g]) => [id, g.name])),
};
config += `
// Preserve links created by the retired React entry without changing point identity.
const legacyPointUrl=new URL(location.href);
if(legacyPointUrl.searchParams.has('point')&&!legacyPointUrl.searchParams.has('locationIds')){
  legacyPointUrl.searchParams.set('locationIds',legacyPointUrl.searchParams.get('point'));
  legacyPointUrl.searchParams.delete('point');
  history.replaceState(null,'',legacyPointUrl.href);
}
const confirmedNames=${JSON.stringify(names)};
for(const group of window.mapData.groups){
  group.title=confirmedNames.groups[group.id]||group.title;
  for(const category of group.categories) category.title=confirmedNames.categories[category.id]||category.title;
}
for(const category of Object.values(window.mapData.categories)) category.title=confirmedNames.categories[category.id]||category.title;
window.mapData.map.title="流放之地";
// Keep the source map's own navigation and share targets on this local copy.
const originalMapUrl='https://mapgenie.io/conan-exiles/maps/exiled-lands';
const localMapUrl=new URL('/review/index.html',location.href);
for(const anchor of document.querySelectorAll('.social a[href]'))
  anchor.href=anchor.href.replace(encodeURIComponent(originalMapUrl),encodeURIComponent(localMapUrl.href));
window.offlineSearch=async function(query){
  const data=await fetch('/review/data/locations.json').then(r=>r.json());
  const q=query.trim().toLocaleLowerCase();
  const locations=data.locations.filter(p=>[p.title,p.original_title,window.mapData.categories[p.category_id]?.title,p.description].some(v=>typeof v==='string'&&v.toLocaleLowerCase().includes(q))).map(p=>p.id);
  return {data:{locations,notes:[],categories:[]}};
};
`;
const exiledDefaults = `
// First visit: places only. Native category actions persist later choices, including none.
for(const category of Object.values(window.mapData.categories)) category.visible=category.group_id===750;
try {
  const base='mg:settings:game_'+window.game.id+':map_258:';
  if(localStorage.getItem(base+'remember_categories')===null){
    for(const category of Object.values(window.mapData.categories))
      localStorage.setItem(base+'visible_categories:id_'+category.id,category.group_id===750?'true':'');
    localStorage.setItem(base+'remember_categories','true');
  }
}catch(error){console.warn('Cannot save map filters',error)}
`;
fs.writeFileSync(path.join(target, "map-config.js"), config + exiledDefaults);
// Preserve the source renderer and map-specific configuration for the second map.
const originalStaticData = JSON.parse(config.match(/^window\.mapData=(.+);$/m)[1]);
siptahData.mapConfig.glyphs_url = originalStaticData.mapConfig.glyphs_url;
const siptahConfig = config.replace(/^window\.mapData=.+;$/m, `window.mapData=${JSON.stringify(siptahData)};`)
  .replaceAll('window.mapUrl="/review/index.html";', 'window.mapUrl="/review/siptah.html";')
  .replace('window.mapData.map.title="流放之地";', 'window.mapData.map.title="西普塔岛";')
  .replace("const originalMapUrl='https://mapgenie.io/conan-exiles/maps/exiled-lands';", "const originalMapUrl='https://mapgenie.io/conan-exiles/maps/isle-of-siptah';")
  .replace("new URL('/review/index.html',location.href)", "new URL('/review/siptah.html',location.href)")
  .replace("fetch('/review/data/locations.json')", "fetch('/review/data/siptah-locations.json')");
fs.writeFileSync(path.join(target, "siptah-config.js"), siptahConfig);
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
    .replaceAll(`title="${source}"`, `title="${translated}"`)
    .replaceAll(`placeholder="${source}"`, `placeholder="${translated}"`);
html = html.replaceAll('href="https://mapgenie.io/conan-exiles/maps/exiled-lands"', 'href="/review/index.html"');
html = html.replaceAll('href="https://mapgenie.io/conan-exiles/maps/isle-of-siptah"', 'href="/review/siptah.html"');
const localizedHtml = html.split(/\r?\n/).map((line) => line.trimEnd()).join("\n").trimEnd() + "\n";
fs.writeFileSync(path.join(target, "index.html"), localizedHtml);
const siptahHtml = localizedHtml.replace('/review/map-config.js', '/review/siptah-config.js')
  .replaceAll('Exiled Lands |', 'Isle of Siptah |')
  .replace('<title>流放之地 |', '<title>西普塔岛 |')
  .replace('map map-258 ', 'map map-259 ')
  .replaceAll('maps%2Fexiled-lands', 'maps%2Fisle-of-siptah')
  .replaceAll('class="map-link selected" href="/review/index.html"', 'class="map-link" href="/review/index.html"')
  .replaceAll('class="map-link" href="/review/siptah.html"', 'class="map-link selected" href="/review/siptah.html"');
fs.writeFileSync(path.join(target, "siptah.html"), siptahHtml);
// The public entry must use the same source renderer as the review page.
fs.writeFileSync(path.join(root, "index.html"), localizedHtml);
const terrainFiles = assets.filter(a => a.file.startsWith("tiles.mapgenie.io/"));
const terrainByMap = Object.fromEntries(["exiled-lands", "isle-of-siptah"].map(slug => [slug,
  terrainFiles.filter(a => a.file.includes(`/${slug}/default-v1/`)).reduce((counts, a) => {
    const z = a.file.match(/default-v1\/(\d+)\//)[1];
    counts[z] = (counts[z] || 0) + 1; return counts;
  }, {})]));
const fullTerrainComplete = ["exiled-lands", "isle-of-siptah"].every(slug =>
  [1, 4, 16, 64, 256, 1024, 4096].every((count, i) => terrainByMap[slug][i + 8] === count));
fs.writeFileSync(path.join(target, "asset-manifest.json"), JSON.stringify({
  source: "Saved source fixture (2026-10-15), current public program/configuration and complete terrain (2026-10-28)",
  adsExcluded: true, remoteRequestsAllowed: false,
  tiles: { capturedCount: terrainFiles.length, byMap: terrainByMap, complete: fullTerrainComplete },
  sourceLocations: payload.locations.length, siptahSourceLocations: siptahPayload.locations.length, assets,
}, null, 2));
console.log(JSON.stringify({ review: "/review/", assets: assets.length, points: payload.locations.length, siptahPoints: siptahPayload.locations.length, fullMapComplete: fullTerrainComplete }));

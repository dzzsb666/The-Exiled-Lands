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
          // On Siptah, keep markers proportional to the map as the user zooms out.
          if (file.endsWith("/map.113b2a48.js")) {
            // Keep Siptah preferences separate from the Exiled Lands map.
            text = text.replaceAll('":remember_categories"', '":map_259:remember_categories"')
              .replaceAll('":visible_categories:id_"', '":map_259:visible_categories:id_"')
              .replaceAll('":icon_scaling_enabled"', '":map_259:icon_scaling_enabled"');
            const markerSize = 'if(null===t)return e(this.iconSize);';
            if (text.split(markerSize).length !== 2)
              throw new Error("Unexpected original marker size implementation.");
            text = text.replace(markerSize, 'if(null===t){if(window.mapData.map.id===259)return["interpolate",["linear"],["zoom"],8,e(.25*this.iconSize),12,e(.65*this.iconSize),14,e(this.iconSize)];return e(this.iconSize)};');
          }
          text = translateLiterals(text);
        }
        bytes = Buffer.from(text);
      }
      if (!fs.existsSync(dest) || !fs.readFileSync(dest).equals(bytes))
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
const staticNameMatches = new Map(read("data/siptah-static-name-matches.json").points.map(p => [p.id, p]));
const petConfirmations = new Map(read("data/siptah-pet-confirmations.json").map(p => [p.id, p]));
const recipeConfirmations = new Map(read("data/siptah-recipe-confirmations.json").map(p => [p.id, p]));
const bossConfirmations = new Map(read("data/siptah-boss-confirmations.json").map(p => [p.english, p.name]));
const fighterConfirmations = new Map(read("data/siptah-fighter-confirmations.json").map(p => [p.id, p]));
const emoteConfirmations = new Map(read("data/siptah-emote-confirmations.json").map(p => [p.id, p]));
const merchantConfirmations = new Map(read("data/siptah-merchant-confirmations.json").map(p => [p.id, p]));
const archerConfirmations = new Map(read("data/siptah-archer-confirmations.json").map(p => [p.id, p]));
const cookConfirmations = new Map(read("data/siptah-cook-confirmations.json").map(p => [p.id, p]));
const alchemistConfirmations = new Map(read("data/siptah-alchemist-confirmations.json").map(p => [p.id, p]));
const blacksmithConfirmations = new Map(read("data/siptah-blacksmith-confirmations.json").map(p => [p.id, p]));
const priestConfirmations = new Map(read("data/siptah-priest-confirmations.json").map(p => [p.id, p]));
const armorerConfirmations = new Map(read("data/siptah-armorer-confirmations.json").map(p => [p.id, p]));
const carpenterConfirmations = new Map(read("data/siptah-carpenter-confirmations.json").map(p => [p.id, p]));
const performerConfirmations = new Map(read("data/siptah-performer-confirmations.json").map(p => [p.id, p]));
const tannerConfirmations = new Map(read("data/siptah-tanner-confirmations.json").map(p => [p.id, p]));
const taskmasterConfirmations = new Map(read("data/siptah-taskmaster-confirmations.json").map(p => [p.id, p]));
const npcConfirmations = new Map(read("data/siptah-npc-confirmations.json").map(p => [p.id, p]));
const smelterConfirmations = new Map(read("data/siptah-smelter-confirmations.json").map(p => [p.id, p]));
const dictionaryConfirmations = new Map(read("data/siptah-dictionary-confirmations.json").map(p => [p.id, p]));
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
  else if (point.category_id === 3369 && point.title === "Boss")
    point.title = "BOSS"; // User confirmed 2026-10-29; generic Siptah point title only.
  else if (point.category_id === 3390 && point.title === "Gold")
    point.title = "金矿"; // User confirmed 2026-10-29; Siptah resource nodes only.
  else if (point.category_id === 3355 && point.title === "Turtle")
    point.title = "乌龟"; // User confirmed 2026-10-29; Siptah pet spawns only.
  else if (point.category_id === 3378 && point.title === "Foal")
    point.title = "马驹"; // User confirmed 2026-10-29; Siptah pet spawns only.
  else if (point.category_id === 3377 && point.title === "Dog")
    point.title = "狗"; // User confirmed 2026-10-29; Siptah pet spawns only.
  else if (point.category_id === 3369 && bossConfirmations.has(point.title))
    point.title = bossConfirmations.get(point.title); // Generic labels only; no rank or named identity inferred.
  else if (category.title === "Lore" && /^Siptah's Journal (?:[1-9]|1[0-9]|2[0-4])$/.test(point.title))
    point.title = `西普塔日记${point.title.match(/\d+$/)[0]}`; // User confirmed the full numbered series.
  else if (petConfirmations.has(point.category_id) && point.title === category.title) {
    const confirmed = petConfirmations.get(point.category_id);
    if (confirmed.english !== category.title || category.group_id !== 755)
      throw new Error(`Siptah pet category mismatch at ${category.id}`);
    point.title = confirmed.name;
  }
  const recipeName = recipeConfirmations.get(point.id);
  if (recipeName) {
    if (point.category_id !== 3304 || point.original_title !== recipeName.english || point.title !== point.original_title)
      throw new Error(`Siptah recipe point mismatch at ${point.id}`);
    point.title = recipeName.name;
  }
  const fighterName = fighterConfirmations.get(point.id);
  if (fighterName) {
    if (point.category_id !== 3326 || point.original_title !== fighterName.english || point.title !== point.original_title)
      throw new Error(`Siptah fighter point mismatch at ${point.id}`);
    point.title = fighterName.name;
  }
  const emoteName = emoteConfirmations.get(point.id);
  if (emoteName) {
    if (point.category_id !== 3305 || point.original_title !== emoteName.english || point.title !== point.original_title)
      throw new Error(`Siptah emote point mismatch at ${point.id}`);
    point.title = emoteName.name;
  }
  const merchantName = merchantConfirmations.get(point.id);
  if (merchantName) {
    if (point.category_id !== 3318 || point.original_title !== merchantName.english || point.title !== point.original_title)
      throw new Error(`Siptah merchant point mismatch at ${point.id}`);
    point.title = merchantName.name;
  }
  const archerName = archerConfirmations.get(point.id);
  if (archerName) {
    if (point.category_id !== 3319 || point.original_title !== archerName.english || point.title !== point.original_title)
      throw new Error(`Siptah archer point mismatch at ${point.id}`);
    point.title = archerName.name;
  }
  const cookName = cookConfirmations.get(point.id);
  if (cookName) {
    if (point.category_id !== 3325 || point.original_title !== cookName.english || point.title !== point.original_title)
      throw new Error(`Siptah cook point mismatch at ${point.id}`);
    point.title = cookName.name;
  }
  const alchemistName = alchemistConfirmations.get(point.id);
  if (alchemistName) {
    if (point.category_id !== 3320 || point.original_title !== alchemistName.english || point.title !== point.original_title)
      throw new Error(`Siptah alchemist point mismatch at ${point.id}`);
    point.title = alchemistName.name;
  }
  const blacksmithName = blacksmithConfirmations.get(point.id);
  if (blacksmithName) {
    if (point.category_id !== 3323 || point.original_title !== blacksmithName.english || point.title !== point.original_title)
      throw new Error(`Siptah blacksmith point mismatch at ${point.id}`);
    point.title = blacksmithName.name;
  }
  const priestName = priestConfirmations.get(point.id);
  if (priestName) {
    if (point.category_id !== 3328 || point.original_title !== priestName.english || point.title !== point.original_title)
      throw new Error(`Siptah priest point mismatch at ${point.id}`);
    point.title = priestName.name;
  }
  const armorerName = armorerConfirmations.get(point.id);
  if (armorerName) {
    if (point.category_id !== 3321 || point.original_title !== armorerName.english || point.title !== point.original_title)
      throw new Error(`Siptah armorer point mismatch at ${point.id}`);
    point.title = armorerName.name;
  }
  const carpenterName = carpenterConfirmations.get(point.id);
  if (carpenterName) {
    if (point.category_id !== 3324 || point.original_title !== carpenterName.english || point.title !== point.original_title)
      throw new Error(`Siptah carpenter point mismatch at ${point.id}`);
    point.title = carpenterName.name;
  }
  const performerName = performerConfirmations.get(point.id);
  if (performerName) {
    if (point.category_id !== 3327 || point.original_title !== performerName.english || point.title !== point.original_title)
      throw new Error(`Siptah performer point mismatch at ${point.id}`);
    point.title = performerName.name;
  }
  const tannerName = tannerConfirmations.get(point.id);
  if (tannerName) {
    if (point.category_id !== 3330 || point.original_title !== tannerName.english || point.title !== point.original_title)
      throw new Error(`Siptah tanner point mismatch at ${point.id}`);
    point.title = tannerName.name;
  }
  const taskmasterName = taskmasterConfirmations.get(point.id);
  if (taskmasterName) {
    if (point.category_id !== 3331 || point.original_title !== taskmasterName.english || point.title !== point.original_title)
      throw new Error(`Siptah taskmaster point mismatch at ${point.id}`);
    point.title = taskmasterName.name;
  }
  const npcName = npcConfirmations.get(point.id);
  if (npcName) {
    if (point.category_id !== 3315 || point.original_title !== npcName.english || point.title !== point.original_title)
      throw new Error(`Siptah NPC point mismatch at ${point.id}`);
    point.title = npcName.name;
  }
  const smelterName = smelterConfirmations.get(point.id);
  if (smelterName) {
    if (point.category_id !== 3329 || point.original_title !== smelterName.english || point.title !== point.original_title)
      throw new Error(`Siptah smelter point mismatch at ${point.id}`);
    point.title = smelterName.name;
  }
  const dictionaryName = dictionaryConfirmations.get(point.id);
  if (dictionaryName) {
    if (point.category_id !== 3308 || point.original_title !== dictionaryName.english || point.title !== point.original_title)
      throw new Error(`Siptah dictionary point mismatch at ${point.id}`);
    point.title = dictionaryName.name;
  }
  const staticName = staticNameMatches.get(point.id);
  if (staticName) {
    if (staticName.english !== point.original_title || (point.title !== point.original_title && point.title !== staticName.chinese))
      throw new Error(`Static map name conflict at Siptah point ${point.id}`);
    point.title = staticName.chinese;
  }
  if (point.description) point.description = point.description
    .replaceAll("https://mapgenie.io/conan-exiles/maps/isle-of-siptah?", "/review/siptah.html?")
    .replaceAll("https://mapgenie.io/conan-exiles/maps/exiled-lands?", "/review/index.html?");
}
fs.writeFileSync(path.join(target, "data/siptah-locations.json"), JSON.stringify(siptahPayload));
const csvCell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
const pendingSiptah = [
  ["kind", "id", "english", "context"],
  ...Object.values(siptahData.categories).filter(c => !categories.get(c.id)?.name && ![3287, 3288, 3355, 3377, 3378, 3390].includes(c.id) && !petConfirmations.has(c.id))
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
const siptahDefaults = `
// User-confirmed Siptah category names; point titles stay independent.
const confirmedSiptahPets=${JSON.stringify(Object.fromEntries([...petConfirmations].map(([id, p]) => [id, p.name])))};
for(const group of window.mapData.groups)
  for(const category of group.categories)
    if(confirmedSiptahPets[category.id])category.title=confirmedSiptahPets[category.id];
for(const category of Object.values(window.mapData.categories))
  if(confirmedSiptahPets[category.id])category.title=confirmedSiptahPets[category.id];
window.mapData.categories[3287].title='暗窖';
window.mapData.categories[3288].title='活祭祀';
window.mapData.categories[3369].title='BOSS';
window.mapData.categories[3355].title='乌龟';
window.mapData.categories[3378].title='马驹';
window.mapData.categories[3377].title='狗';
window.mapData.categories[3390].title='金矿';
for(const group of window.mapData.groups)
  for(const category of group.categories)
    if(category.id===3287)category.title='暗窖';
    else if(category.id===3288)category.title='活祭祀';
    else if(category.id===3369)category.title='BOSS';
    else if(category.id===3355)category.title='乌龟';
    else if(category.id===3378)category.title='马驹';
    else if(category.id===3377)category.title='狗';
    else if(category.id===3390)category.title='金矿';
// The source renderer already remembers category choices. Enable it on first visit.
try {
  const key='mg:settings:game_'+window.game.id+':map_259:remember_categories';
  if(localStorage.getItem(key)===null){
    const prefix='mg:settings:game_'+window.game.id+':map_259:visible_categories:id_';
    for(const category of Object.values(window.mapData.categories))
      localStorage.setItem(prefix+category.id,category.group_id===750?'true':'');
    localStorage.setItem(key,'true');
  }
}catch(error){console.warn('Cannot save map filters',error)}
`;
fs.writeFileSync(path.join(target, "siptah-config.js"), siptahConfig + siptahDefaults);
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

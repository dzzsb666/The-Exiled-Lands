import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse } from "@babel/parser";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const text = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(text(file));

test("source review keeps all point identities and native coordinates; translates confirmed titles only", () => {
  const source = json("reference/api/v1/maps/258/data").locations;
  const translated = json("public/review/data/locations.json").locations;
  const confirmed = new Map(json("public/data/map.json").points.map((p) => [p.id, p.name]));
  assert.equal(source.length, 2812);
  assert.equal(translated.length, source.length);
  assert.deepEqual(json("public/review/data/locations.json").coordinateAreas, json("reference/api/v1/maps/258/data").coordinateAreas);
  source.forEach((p, index) => {
    const actual = translated[index];
    for (const key of ["id", "category_id", "latitude", "longitude", "region_id", "map_id"])
      assert.deepEqual(actual[key], p[key], `${p.id}:${key}`);
    assert.equal(actual.original_title, p.title);
    assert.equal(actual.title, confirmed.get(p.id) || p.title);
    assert.equal(actual.description, typeof p.description === "string"
      ? p.description.replaceAll("https://mapgenie.io/conan-exiles/maps/exiled-lands?", "/review/index.html?")
      : p.description);
  });
});

test("all 64 source category sprites and real fonts are retained without substitute drawings", () => {
  const sprites = json("public/review/source/media.mapgenie.io/v2/assets/prod/games/conan-exiles/markers/markers.json");
  const css = text("public/review/source/cdn.mapgenie.io/css/themes/icons/conan-exiles-icons.78a26005.css");
  const categories = json("data/categories.json");
  assert.equal(categories.length, 64);
  for (const category of categories) {
    assert.ok(sprites[category.icon], category.icon);
    assert.ok(css.includes(`.icon-${category.icon}`), category.icon);
  }
  for (const file of [
    "cdn.mapgenie.io/fonts/conan-exiles/icons/icomoon.ttf",
    "cdn.mapgenie.io/fonts/ionicons/ionicons.woff2",
    "media.mapgenie.io/v2/assets/prod/fonts/crom/ttf/41704e3fedec.ttf",
    "media.mapgenie.io/v2/assets/prod/games/conan-exiles/markers/markers.png",
  ]) assert.deepEqual(fs.readFileSync(path.join(root, "public/review/source", file)), fs.readFileSync(path.join(root, "reference/source", file)));
});

test("public entry uses the source renderer and all category icons keep their original identity", () => {
  assert.equal(text("index.html"), text("public/review/index.html"));
  assert.doesNotMatch(text("index.html"), /src\/main\.tsx|lucide|leaflet|id="root"/i);
  const staticData = (file) => JSON.parse(text(file).match(/^window\.mapData=(.+);$/m)[1]);
  const source = staticData("reference/offline-config.js");
  const localized = staticData("public/review/map-config.js");
  const sprites = json("public/review/source/media.mapgenie.io/v2/assets/prod/games/conan-exiles/markers/markers.json");
  const positions = JSON.parse(text("reference/offline-config.js").match(/^var MARKER_SPRITE_POSITIONS_V3=(.+);$/m)[1]);
  for (const category of json("data/categories.json")) {
    const original = source.categories[category.id];
    assert.equal(category.icon, original.icon, `${category.id}: icon identity`);
    assert.deepEqual(localized.categories[category.id], original, `${category.id}: source styling`);
    const sourceSprite = positions[category.id];
    const iconSprite = sprites[original.icon];
    for (const key of ["x", "y", "width", "height"])
      assert.equal(sourceSprite[key] / sourceSprite.pixelRatio, iconSprite[key] / iconSprite.pixelRatio, `${category.id}:${key}`);
  }
  for (const group of source.groups)
    assert.deepEqual(localized.groups.find((g) => g.id === group.id), group, `${group.id}: original category order and styling`);
});

test("marker sizes, anchors, colors and circle paint retain the original source values", () => {
  const original = text("reference/source/cdn.mapgenie.io/js/map.113b2a48.js");
  const localized = text("public/review/source/cdn.mapgenie.io/js/map.113b2a48.js");
  const styles = (script) => {
    const result = [];
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "ObjectExpression" && node.properties.some((p) =>
        p.key?.value === "icon-size" || p.key?.value === "circle-stroke-opacity"))
        result.push(script.slice(node.start, node.end).replaceAll("\r\n", "\n"));
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    };
    visit(parse(script, { sourceType: "script" }));
    return result;
  };
  const originalStyles = styles(original);
  assert.ok(originalStyles.length > 0);
  assert.deepEqual(styles(localized), originalStyles);
  assert.match(localized, /Se=\.6,Ce=1/); // Original default icon scale is 1.
  assert.match(localized, /markerAnchor:"bottom"/);
  assert.match(localized, /circleLocationsPaint:\{"circle-radius":6\}/);
  const sprites = json("public/review/source/media.mapgenie.io/v2/assets/prod/games/conan-exiles/markers/markers.json");
  for (const category of json("data/categories.json")) {
    const icon = sprites[category.icon];
    assert.equal(icon.width / icon.pixelRatio, 33, category.icon);
    assert.equal(icon.height / icon.pixelRatio, 44, category.icon);
  }
});

test("review contains only allowlisted assets, blocks remote loads and excludes ad containers", () => {
  const manifest = json("public/review/asset-manifest.json");
  const html = text("public/review/index.html");
  const config = text("public/review/map-config.js");
  assert.equal(manifest.adsExcluded, true);
  assert.equal(manifest.remoteRequestsAllowed, false);
  assert.match(html, /connect-src 'self' blob:/);
  assert.match(html, /frame-src 'none'/);
  assert.doesNotMatch(html, /<iframe|<script[^>]+src="https?:|id="(?:nitro-floating|blobby-)|name="auth-token"/i);
  assert.doesNotMatch(html, /googletagmanager|doubleclick|ziffstatic|scorecardresearch|clarity\.js|prebid/i);
  assert.match(config, /window\.user=null;/);
  assert.match(config, /trackEngagement\(\)\{\}/);
  assert.match(html, /class="map-link selected" href="\/review\/index\.html"/);
  assert.doesNotMatch(html, /href="https:\/\/mapgenie\.io\/conan-exiles\/maps\/exiled-lands"/);
  assert.match(html, /title="登录后记录探索进度并添加个人点位"/);
  assert.match(html, /maplibre\.f1d91794\.js" data-worker-url="\/review\/source\/cdn\.mapgenie\.io\/js\/vendor\/maplibre-gl-worker\.5766dbb5\.js"/);
  const renderer = text("public/review/source/cdn.mapgenie.io/js/map.113b2a48.js");
  assert.match(renderer, /window\.offlineSearch\(n\)/);
  assert.doesNotMatch(renderer, /window\.axios\.get\("\/api\/v1\/search"/);
  assert.doesNotMatch(html, /aria-label="(?:Share on [^"]+|Close)"/);
  for (const item of manifest.assets) {
    assert.match(item.file, /^(cdn\.mapgenie\.io|media\.mapgenie\.io|tiles\.mapgenie\.io|fonts\.gstatic\.com|ajax\.googleapis\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//);
    const bytes = fs.readFileSync(path.join(root, "public/review/source", item.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
  }
});

test("localized source remains valid JavaScript and reports terrain coverage accurately", () => {
  parse(text("public/review/source/cdn.mapgenie.io/js/map.113b2a48.js"), { sourceType: "script" });
  parse(text("public/review/map-config.js"), { sourceType: "script" });
  const manifest = json("public/review/asset-manifest.json");
  const tiles = manifest.assets.filter((item) => item.file.startsWith("tiles.mapgenie.io/"));
  assert.equal(tiles.length, manifest.tiles.capturedCount);
  const expected = [1, 4, 16, 64, 256, 1024, 4096];
  const full = ["exiled-lands", "isle-of-siptah"].every(slug => expected.every((count, i) =>
    tiles.filter(item => item.file.includes(`/${slug}/default-v1/${i + 8}/`)).length === count));
  assert.equal(manifest.tiles.complete, full);
  for (const tile of tiles) assert.match(tile.file, /\/(exiled-lands|isle-of-siptah)\/default-v1\/(8|9|10|11|12|13|14)\/\d+\/\d+\.jpg$/);
});

test("Siptah preserves its own point identities, counts and map settings", () => {
  const source = json("reference/api/v1/maps/259/data");
  const actual = json("public/review/data/siptah-locations.json");
  const config = JSON.parse(text("public/review/siptah-config.js").match(/^window\.mapData=(.+);$/m)[1]);
  const originalConfig = json("reference/maps/259/config.json");
  assert.equal(source.locations.length, 5231);
  assert.equal(new Set(actual.locations.map(p => p.id)).size, 5231);
  assert.deepEqual(actual.coordinateAreas, source.coordinateAreas);
  source.locations.forEach((p, i) => {
    const a = actual.locations[i];
    for (const key of ["id", "map_id", "category_id", "latitude", "longitude", "region_id", "media"])
      assert.deepEqual(a[key], p[key], `${p.id}:${key}`);
    assert.equal(a.original_title, p.title);
  });
  assert.deepEqual(config.categories, originalConfig.categories);
  assert.deepEqual(config.groups, originalConfig.groups);
  assert.deepEqual(config.mapConfig.tile_sets, originalConfig.mapConfig.tile_sets);
  assert.equal(config.map.id, 259);
  assert.equal(config.mapConfig.tile_sets[0].max_zoom, 16);
  assert.match(text("public/review/siptah.html"), /class="map-link selected" href="\/review\/siptah\.html"/);
  assert.match(text("public/review/index.html"), /href="\/review\/siptah\.html"/);
  assert.doesNotMatch(text("public/review/siptah.html"), /<iframe|<script[^>]+src="https?:|nitro-floating|blobby-overlay/i);
});

test("point media images are available locally without changing media identity", () => {
  const source = json("reference/api/v1/maps/258/data").locations;
  const actual = json("public/review/data/locations.json").locations;
  for (let i = 0; i < source.length; i++) for (let j = 0; j < (source[i].media || []).length; j++) {
    const media = source[i].media[j], local = actual[i].media[j];
    assert.deepEqual({ ...local, url: media.url }, media);
    assert.ok(local.url.startsWith("/review/source/media.mapgenie.io/storage/media/"));
    assert.ok(fs.existsSync(path.join(root, "public", local.url.slice(1))));
  }
});

test("map initialization retains a search that finished before the map was ready", () => {
  const script = text("public/review/source/cdn.mapgenie.io/js/map.113b2a48.js");
  let handler;
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "ObjectExpression" && node.properties.some((p) => p.key?.name === "key" && p.value?.value === "getInitialLocationsFilter"))
      handler = node.properties.find((p) => p.key?.name === "value").value;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(parse(script));
  assert.ok(handler);
  let searchResults = { locations: [199370, 199371] };
  const filter = vm.runInNewContext(`(${script.slice(handler.start, handler.end)})`, {
    window: { store: { getState: () => ({ search: { searchResults } }) } },
  });
  const context = { getLocationsFilter: () => "category-filter" };
  const result = () => JSON.parse(JSON.stringify(filter.call(context, null)));
  assert.deepEqual(result(), ["in", ["get", "locationId"], ["literal", [199370, 199371]]]);
  searchResults = { locations: [] };
  assert.deepEqual(result(), ["in", ["get", "locationId"], ["literal", []]]);
  searchResults = null;
  assert.equal(filter.call(context, null), "category-filter");
  assert.deepEqual(JSON.parse(JSON.stringify(filter.call(context, [88250]))), ["match", ["get", "locationId"], [88250], true, false]);
});

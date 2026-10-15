import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parse } from "@babel/parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const text = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (file) => JSON.parse(text(file));

test("source review keeps all point identities and native coordinates; translates confirmed titles only", () => {
  const source = json("reference/api/v1/maps/258/data").locations;
  const translated = json("public/review/data/locations.json").locations;
  const confirmed = new Map(json("public/data/map.json").points.map((p) => [p.id, p.name]));
  assert.equal(source.length, 2812);
  assert.equal(translated.length, source.length);
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
  for (const item of manifest.assets) {
    assert.match(item.file, /^(cdn\.mapgenie\.io|media\.mapgenie\.io|tiles\.mapgenie\.io|fonts\.gstatic\.com|ajax\.googleapis\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//);
    const bytes = fs.readFileSync(path.join(root, "public/review/source", item.file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256);
  }
});

test("localized source remains valid JavaScript and reports incomplete terrain honestly", () => {
  parse(text("public/review/source/cdn.mapgenie.io/js/map.70aefaa6.js"), { sourceType: "script" });
  parse(text("public/review/map-config.js"), { sourceType: "script" });
  const manifest = json("public/review/asset-manifest.json");
  const tiles = manifest.assets.filter((item) => item.file.startsWith("tiles.mapgenie.io/"));
  assert.equal(tiles.length, 24);
  assert.equal(manifest.tiles.complete, false);
  assert.equal(manifest.tiles.fullZoom12Count, 256);
  assert.ok(tiles.every((item) => item.file.includes("/default-v1/12/")));
});

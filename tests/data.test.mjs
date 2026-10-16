import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  validateProgress,
  loadPreferences,
  PREFERENCES_KEY,
} from "../src/storage.ts";
import { mapGrid } from "../src/map-grid.ts";
const read = (file) =>
  JSON.parse(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const map = read("../public/data/map.json");
test("all imported points retain unique IDs and valid categories and projected positions", () => {
  assert.equal(map.points.length, 2812);
  assert.equal(map.categories.length, 64);
  assert.equal(new Set(map.points.map((p) => p.id)).size, 2812);
  const cats = new Set(map.categories.map((c) => c.id));
  for (const p of map.points) {
    assert(cats.has(p.categoryId));
    assert(Number.isFinite(p.x) && Number.isFinite(p.y));
    assert(
      p.x >= 0 && p.x <= 4000 && p.y >= 0 && p.y <= 4000,
      `Point ${p.id} outside map`,
    );
  }
  for (const c of map.categories)
    assert.equal(
      c.count,
      map.points.filter((p) => p.categoryId === c.id).length,
    );
});
test("every Chinese label has a recorded source, and pending names remain empty", () => {
  for (const p of map.points) {
    if (p.name) {
      assert(p.translationSource, `No source for ${p.id}`);
      assert(!p.name.includes("*"));
    } else assert.equal(p.translationSource, null);
  }
  assert.equal(
    map.points.find((p) => p.id === 120177).name,
    "地底之王征服者配方",
  );
  assert.equal(map.categories.find((c) => c.id === 3327).name, "艺人");
  assert.equal(map.categories.find((c) => c.id === 3346).name, "岩背怪");
  assert.equal(map.categories.find((c) => c.id === 3321).name, "制甲匠");
  assert.equal(map.categories.find((c) => c.id === 3332).name, "随机奴隶");
  for (const [id, name] of [[3290, "大型聚落"], [3285, "遗迹"], [3284, "景点"], [3292, "黑手会"], [3293, "西米利亚"], [3294, "沙漠之犬"]])
    assert.equal(map.categories.find((c) => c.id === id).name, name);
  assert.equal(map.points.find((p) => p.id === 199370).name, "传奇奴隶");
  assert.equal(map.points.find((p) => p.id === 198566).name, "鳄鱼");
  assert.equal(map.points.find((p) => p.id === 198695).name, "幼鹿");
  assert.equal(map.points.find((p) => p.id === 199381).name, "搬运工");
  assert.equal(map.points.find((p) => p.id === 198880).name, "剑齿虎");
  assert.equal(map.points.find((p) => p.id === 120164).name, "遗宝猎人套装");
  assert.equal(map.points.find((p) => p.id === 88250).name, "比特雅金的印章");
  assert.equal(map.points.find((p) => p.id === 88189).name, "阿梅莱亚废墟");
});
test("ten projected obelisks agree with the map control points within 14 pixels", () => {
  const points = map.points.filter((p) => p.categoryId === 3286);
  assert.equal(points.length, 10);
  // Actual independently retained control points are recorded in docs/projection-controls.json.
  const controls = read("../docs/projection-controls.json");
  assert.equal(controls.length, 10);
  for (const c of controls) {
    const p = points.find((p) => p.id === c.id);
    assert(p);
    assert(
      Math.hypot(p.x - c.x, p.y - c.y) < 14,
      `Obelisk ${c.id} projection mismatch`,
    );
  }
});
test("progress import validates schema and rejects malformed or excessive values", () => {
  const good = {
    version: 1,
    found: [120177, 120177],
    notes: { 120177: "备注" },
    pins: [{ id: "pin-1", name: "营地", note: "", x: 500, y: 1000 }],
  };
  assert.equal(validateProgress(good).found.length, 1);
  for (const bad of [
    null,
    {},
    { ...good, version: 2 },
    { ...good, found: ["120177"] },
    { ...good, pins: [{ ...good.pins[0], x: Infinity }] },
    { ...good, pins: [{ ...good.pins[0], y: 4001 }] },
    { ...good, notes: { 1: {} } },
    { ...good, pins: [good.pins[0], good.pins[0]] },
  ])
    assert.throws(() => validateProgress(bad));
});
test("map grids agree with retained landmark coordinates", () => {
  assert.equal(mapGrid(1315.9698, 3265.5165), "F4");
  assert.equal(mapGrid(988.2788, 3253.3294), "D4");
  assert.equal(mapGrid(514.7432, 1696.4137), "B11");
  for (const [x, y] of [
    [100, 500],
    [-1, 1000],
    [500, 5000],
    [NaN, 600],
    [200, Infinity],
  ])
    assert.equal(mapGrid(x, y), null);
});
test("view preferences preserve intentional empty filters and recover from corrupt storage", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let payload = JSON.stringify({
    version: 1,
    enabled: [],
    hideFound: true,
    onlyPending: false,
    labels: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (key) => (key === PREFERENCES_KEY ? payload : null) },
  });
  try {
    assert.deepEqual(loadPreferences().enabled, []);
    assert.equal(loadPreferences().hideFound, true);
    payload = "{invalid";
    assert.equal(loadPreferences().enabled, null);
    payload = JSON.stringify({ version: 1, enabled: ["3290"] });
    assert.equal(loadPreferences().enabled, null);
    payload = JSON.stringify({
      version: 1,
      enabled: [3290, 3290],
      hideFound: "true",
    });
    assert.deepEqual(loadPreferences().enabled, [3290]);
    assert.equal(loadPreferences().hideFound, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateProgress } from "../src/storage.ts";
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
  assert.equal(map.points.find((p) => p.id === 120164).name, "遗宝猎人套装");
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

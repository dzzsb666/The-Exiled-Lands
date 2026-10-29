import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { parse } from "@babel/parser";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const config = read("public/review/map-config.js");
const defaults = config.slice(config.indexOf("// First visit: places only."));
const base = "mg:settings:game_75:map_258:";

test("old map defaults are private to that map and never overwrite a saved empty selection", () => {
  const saved = new Map([["mg:settings:game_75:visible_categories:id_3362", "true"]]);
  const categories = { 3290: { id: 3290, group_id: 750 }, 3362: { id: 3362, group_id: 756 } };
  const context = { window: { game: { id: 75 }, mapData: { categories } },
    localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) }, console };
  vm.runInNewContext(defaults, context);
  assert.equal(saved.get(base + "remember_categories"), "true");
  assert.equal(saved.get(base + "visible_categories:id_3290"), "true");
  assert.equal(saved.get(base + "visible_categories:id_3362"), "");
  assert.equal(saved.get("mg:settings:game_75:visible_categories:id_3362"), "true");
  saved.delete(base + "visible_categories:id_3290");
  vm.runInNewContext(defaults, context);
  assert.equal(saved.has(base + "visible_categories:id_3290"), false);
  context.localStorage.getItem = () => { throw new Error("Storage blocked"); };
  context.console = { warn() {} };
  assert.doesNotThrow(() => vm.runInNewContext(defaults, context));
  assert.equal(categories[3290].visible, true);
  assert.equal(categories[3362].visible, false);
});

test("old map sprites and popup offsets use the same bounded zoom scale", () => {
  const script = read("public/review/source/cdn.mapgenie.io/js/map.113b2a48.js");
  const handlers = {};
  const visit = node => {
    if (!node || typeof node !== "object") return;
    if (node.type === "ObjectExpression") {
      const key = node.properties.find(p => p.key?.name === "key")?.value?.value;
      if (["markerIconSize", "markerScale"].includes(key)) {
        const handler = node.properties.find(p => p.key?.name === "value").value;
        handlers[key] = vm.runInNewContext(`(${script.slice(handler.start, handler.end)})`, {
          window: { mapData: { map: { id: 258 } } }, Z: () => ({ ld: () => null }),
        });
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(parse(script));
  assert.deepEqual(JSON.parse(JSON.stringify(handlers.markerIconSize.call({ iconSize: 1 }))),
    ["interpolate", ["linear"], ["zoom"], 7, 0.2, 14, 1]);
  for (const [zoom, expected] of [[6, .2], [7, .2], [10.5, .6], [14, 1], [16, 1]])
    assert.ok(Math.abs(handlers.markerScale.call({ iconSize: 1, map: { getZoom: () => zoom } }) - expected) < 1e-10);
});

test("old map dungeon titles use the user's latest confirmed names", () => {
  const points = JSON.parse(read("public/review/data/locations.json")).locations;
  for (const [id, title] of [[942407, "碎神副本"], [942406, "酒馆副本"], [942399, "沉没都市"]])
    assert.equal(points.find(p => p.id === id).title, title);
});

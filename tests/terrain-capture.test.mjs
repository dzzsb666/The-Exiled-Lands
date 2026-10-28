import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tilePlan, isJpeg } from '../scripts/capture-terrain.mjs';

test('terrain collection stays inside the original configured map and zoom bounds', () => {
  for (const id of [258, 259]) {
    const config = JSON.parse(fs.readFileSync(new URL(`../reference/maps/${id}/config.json`, import.meta.url), 'utf8'));
    const plan = tilePlan(config);
    assert.equal(plan.length, 5461);
    assert.equal(new Set(plan.map(t => t.url)).size, 5461);
    assert.ok(plan.every(t => new URL(t.url).hostname === 'tiles.mapgenie.io' && t.url.includes(`/${config.map.slug}/default-v1/`)));
    for (const tile of plan) assert.ok(isJpeg(fs.readFileSync(new URL(`../reference/source/tiles.mapgenie.io${new URL(tile.url).pathname}`, import.meta.url))), tile.url);
    assert.throws(() => tilePlan({ ...config, map: { ...config.map, slug: 'another-map' } }));
  }
  assert.ok(isJpeg(Buffer.from([255, 216, 255, 1, 255, 217])));
  assert.equal(isJpeg(Buffer.from('<html>Not an image</html>')), false);
  assert.equal(isJpeg(Buffer.from([255, 216, 255, 1])), false);
});

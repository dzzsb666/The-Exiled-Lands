import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function tilePlan(config) {
  const expected = { 258: 'exiled-lands', 259: 'isle-of-siptah' }[config.map.id];
  const set = config.mapConfig.tile_sets[0];
  if (!expected || config.map.slug !== expected || set.path !== `conan-exiles/${expected}/default-v1` || set.extension !== 'jpg')
    throw new Error('Unexpected map or terrain source');
  const tasks = [];
  if (set.min_zoom !== 8 || set.tiles_max_zoom !== 14) throw new Error('Changed source zoom bounds');
  for (let z = set.min_zoom; z <= set.tiles_max_zoom; z++) {
    const b = set.bounds[z];
    for (const v of [b.x.min, b.x.max, b.y.min, b.y.max])
      if (!Number.isInteger(v) || v < 0 || v >= 2 ** z) throw new Error('Invalid source tile bounds');
    if (b.x.max < b.x.min || b.y.max < b.y.min) throw new Error('Reversed bounds');
    for (let x = b.x.min; x <= b.x.max; x++) for (let y = b.y.min; y <= b.y.max; y++) {
      const relative = `${set.path}/${z}/${x}/${y}.jpg`;
      tasks.push({ map: expected, z, x, y, url: `https://tiles.mapgenie.io/games/${relative}`,
        file: path.join(root, 'reference/source/tiles.mapgenie.io/games', relative) });
    }
  }
  if (tasks.length > 6000) throw new Error('Unexpectedly large configured map');
  return tasks;
}

export function isJpeg(bytes) {
  return bytes.length > 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
}

async function capture() {
  const tasks = [258, 259].flatMap(id => tilePlan(JSON.parse(fs.readFileSync(path.join(root, `reference/maps/${id}/config.json`), 'utf8'))));
  const records = [], errors = [];
  let cursor = 0, downloaded = 0, cached = 0, stopped = null;
  fs.mkdirSync(path.join(root, '.qa'), { recursive: true });
  const reportPath = path.join(root, '.qa/terrain-capture-progress.json');
  const save = () => fs.writeFileSync(reportPath, JSON.stringify({ source: 'Original page tile template and configured bounds', planned: tasks.length,
    checked: records.length + errors.length, downloaded, cached, stopped, complete: !stopped && !errors.length && records.length === tasks.length, errors, records }, null, 2));
  async function worker() {
    while (!stopped && cursor < tasks.length) {
      const task = tasks[cursor++];
      try {
        if (fs.existsSync(task.file)) {
          const bytes = fs.readFileSync(task.file);
          if (!isJpeg(bytes)) throw new Error('Invalid cached JPEG');
          records.push({ ...task, bytes: bytes.length, sha256: sha(bytes), cached: true }); cached++;
        } else {
          const response = await fetch(task.url, { signal: AbortSignal.timeout(20000) });
          if ([401, 403, 429].includes(response.status)) {
            stopped = `Access restriction HTTP ${response.status}: ${task.url}`;
            errors.push({ ...task, status: response.status });
            await response.body?.cancel(); break;
          }
          if (!response.ok) {
            errors.push({ ...task, status: response.status });
            await response.body?.cancel();
          } else {
            const bytes = Buffer.from(await response.arrayBuffer());
            if (!isJpeg(bytes)) throw new Error('Response is not a complete JPEG');
            fs.mkdirSync(path.dirname(task.file), { recursive: true });
            const temporary = `${task.file}.part`;
            fs.writeFileSync(temporary, bytes); fs.renameSync(temporary, task.file);
            records.push({ ...task, bytes: bytes.length, sha256: sha(bytes), cached: false }); downloaded++;
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      } catch (error) { errors.push({ ...task, error: error.message }); }
      if ((records.length + errors.length) % 100 === 0) {
        save(); console.log(JSON.stringify({ checked: records.length + errors.length, planned: tasks.length, downloaded, errors: errors.length, map: task.map, zoom: task.z }));
      }
    }
  }
  try { await Promise.all(Array.from({ length: 12 }, worker)); }
  finally { save(); }
  console.log(JSON.stringify({ checked: records.length + errors.length, planned: tasks.length, downloaded, cached, errors: errors.length, stopped }));
  if (stopped || errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await capture();

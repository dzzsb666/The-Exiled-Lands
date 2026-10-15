// Offline inventory: derive coverage from the captured source configuration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = fs.readFileSync(path.join(root, "reference/offline-config.js"), "utf8");
const assignment = parse(config).program.body.find((node) =>
  node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" &&
  node.expression.left.object?.name === "window" && node.expression.left.property?.name === "mapData");
const value = assignment.expression.right;
const source = JSON.parse(config.slice(value.start, value.end));
const set = source.mapConfig.tile_sets[0];
const tileRoot = path.join(root, "reference/source/tiles.mapgenie.io/games", set.path);
const levels = [];
for (let z = set.min_zoom; z <= set.tiles_max_zoom; z++) {
  const bounds = set.bounds[z];
  const captured = [];
  for (let x = bounds.x.min; x <= bounds.x.max; x++) {
    for (let y = bounds.y.min; y <= bounds.y.max; y++) {
      const file = path.join(tileRoot, String(z), String(x), `${y}.${set.extension}`);
      if (fs.existsSync(file)) captured.push([x, y]);
    }
  }
  const configured = (bounds.x.max - bounds.x.min + 1) * (bounds.y.max - bounds.y.min + 1);
  levels.push({ z, configuredBounds: bounds, configuredTileCount: configured, capturedCount: captured.length, captured });
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/review/asset-manifest.json"), "utf8"));
const report = {
  source: "User-provided HAR and map configuration; no remote requests", mapId: source.map.id,
  tilePath: set.path, extension: set.extension, complete: levels.every((level) => level.configuredTileCount === level.capturedCount),
  note: "Configured bounds include background/padding; counts do not prove every coordinate contains playable terrain. Do not invent uncaptured tiles.",
  fontsAvailable: manifest.assets.filter((a) => /\.(ttf|woff2?)$/.test(a.file)).map((a) => a.file), levels,
};
fs.writeFileSync(path.join(root, "docs/fidelity/tile-coverage.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ complete: report.complete, levels: levels.map(({ z, configuredTileCount, capturedCount }) => ({ z, configuredTileCount, capturedCount })) }));

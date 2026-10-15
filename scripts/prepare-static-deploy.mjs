import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const files = [];
function add(file, bytes) {
  files.push({
    file,
    size: bytes.length,
    sha: createHash("sha1").update(bytes).digest("hex"),
    base64: bytes.toString("base64"),
  });
}
function walk(dir, prefix = "") {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix + item.name;
    if (item.isDirectory()) walk(path.join(dir, item.name), relative + "/");
    else add(relative, fs.readFileSync(path.join(dir, item.name)));
  }
}
walk(dist);
const sourceConfig = JSON.parse(
  fs.readFileSync(path.join(root, "vercel.json"), "utf8"),
);
add(
  "vercel.json",
  Buffer.from(JSON.stringify({ headers: sourceConfig.headers })),
);
const required = [
  "index.html",
  "data/map.json",
  "data/pending-translations.csv",
  "maps/exiled-lands-4000-v1.jpg",
  "vercel.json",
];
for (const name of required)
  if (!files.some((file) => file.file === name && file.size > 0))
    throw new Error(`Missing deployment file: ${name}`);
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g))
  if (!files.some((file) => file.file === match[1].slice(1)))
    throw new Error(`Missing HTML asset: ${match[1]}`);
if (
  !files.some((file) => file.file.endsWith(".js")) ||
  !files.some((file) => file.file.endsWith(".css"))
)
  throw new Error("Missing application JS/CSS");
const data = JSON.parse(
  fs.readFileSync(path.join(dist, "data/map.json"), "utf8"),
);
if (data.points.length !== 2812 || data.categories.length !== 64)
  throw new Error("Unexpected map data counts");
const dir = path.join(root, ".vercel-upload");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(files));
console.log(
  JSON.stringify({
    manifest: ".vercel-upload/manifest.json",
    files: files.length,
    totalBytes: files.reduce((n, f) => n + f.size, 0),
    points: data.points.length,
    categories: data.categories.length,
  }),
);

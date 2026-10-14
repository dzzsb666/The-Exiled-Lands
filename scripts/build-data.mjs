import fs from "node:fs";
const read = (file) =>
  JSON.parse(
    fs.readFileSync(new URL(`../data/${file}`, import.meta.url), "utf8"),
  );
const source = read("source-points.json");
const translations = read("translations.json");
const overrides = read("point-overrides.json");
const categories = read("categories.json");
const points = source.points.map((p) => {
  const entry = overrides[p.id] || translations[p.title];
  return {
    ...p,
    name: entry?.name || null,
    translationSource: entry?.source || null,
    note: entry?.note || null,
  };
});
const counts = new Map();
points.forEach((p) =>
  counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1),
);
const output = {
  ...source,
  categories: categories.map((c) => ({ ...c, count: counts.get(c.id) || 0 })),
  points,
};
fs.mkdirSync(new URL("../public/data/", import.meta.url), { recursive: true });
fs.writeFileSync(
  new URL("../public/data/map.json", import.meta.url),
  JSON.stringify(output),
);
const pending = new Map();
for (const c of categories.filter((c) => !c.name))
  pending.set(`category-${c.id}`, {
    kind: "分类",
    id: c.id,
    title: c.title,
    context: source.groups.find((g) => g.id === c.groupId).name,
    count: c.count || counts.get(c.id) || 0,
  });
for (const p of points.filter((p) => !p.name)) {
  const key = `${p.categoryId}:${p.title}`;
  if (!pending.has(key))
    pending.set(key, {
      kind: "点位",
      id: p.id,
      title: p.title,
      count: 0,
      context: (() => {
        const c = categories.find((c) => c.id === p.categoryId);
        return (
          source.groups.find((g) => g.id === c.groupId).name +
          " / " +
          (c.name || c.title)
        );
      })(),
    });
  pending.get(key).count++;
}
const quote = (s) => `"${String(s).replaceAll('"', '""')}"`;
const csv =
  "\uFEFF类型,所属分类（使用语境）,示例ID,英文名称,涉及点数,游戏内简体中文（待用户填写）\n" +
  [...pending.values()]
    .map((p) =>
      [p.kind, p.context, p.id, p.title, p.count, ""].map(quote).join(","),
    )
    .join("\n");
fs.writeFileSync(
  new URL("../data/pending-translations.csv", import.meta.url),
  csv,
);
fs.writeFileSync(
  new URL("../public/data/pending-translations.csv", import.meta.url),
  csv,
);
console.log(
  JSON.stringify({
    points: points.length,
    categories: categories.length,
    localizedPoints: points.filter((p) => p.name).length,
    pendingEntries: pending.size,
  }),
);

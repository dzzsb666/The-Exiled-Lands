# 流放之地交互地图 · 中文核对版

用户要求仅做中文本地化，其余界面参照MapGenie原站，排除广告与追踪。约束见[AGENTS.md](AGENTS.md)，[保真验收](design-qa.md)当前仍为blocked，不能把构建成功当作完整复刻通过。

2026-10-28：两张动态地图使用原站当前程序、CSS、真实图集与字体。完整10922张原站瓦片覆盖两图8–14图片档位；操作上限分别为15和16。流放之地2812个点位，西普塔岛5231个点位，27张现有点位媒体已本地化。

入口：流放之地 / 或 /review/index.html；西普塔岛 /review/siptah.html。旧?point=ID链接继续兼容。没有Lucide/Leaflet替代入口；未确认译名保持英文。账号/PRO后台仍由原站提供，保留原站链接。详情见[采集核对](docs/MAP-CAPTURE-AUDIT-2026-10-28.md)与[缺口清单](docs/NEEDED-MATERIALS.md)。

## 开发与核对

```sh
npm ci
npm run dev
npm test
npm run build
```

开发与构建前会重新生成数据和原站素材页面，首页`index.html`由`scripts/build-source-review.mjs`生成，请通过生成器修改。生产构建输出到`dist`。

回归检查覆盖全部2812个点位的ID和原生坐标、确认译名、64类图标身份及图集坐标、字体与素材哈希、首页使用原站渲染器、去广告/CSP和搜索加载时序。

## 中文核对

`data/translations.json`保存用户确认的名称及来源，`data/point-overrides.json`保存单点覆盖，`data/categories.json`保存分类译名。当前2647个点位标题已有确认名称（其中Boss按用户要求保留英文），165个标题待确认；长篇说明未全部翻译。未核实的候选只记入[候选记录](docs/TRANSLATION-CANDIDATES.md)，不进入正式译名表。

`data/pending-translations.csv`为流放之地待核对清单，`data/pending-siptah-translations.csv`为西普塔岛待核对清单。确认后更新相应JSON，再运行`npm run build:review`；没有自动翻译流程。原始英文身份和说明保留，内部地图点位链接指向本地。

## GitHub与Vercel

最新修正已同步至`main`与`codex/source-fidelity`。用户实际站点是[正式地图](https://the-exiled-lands-kappa.vercel.app/)，已由main推送触发Vercel部署，原站图集、字体、CSS、地图程序及瓦片均已在线核对；发布记录见[DEPLOYMENT.md](docs/DEPLOYMENT.md)。此前本会话连接的heifang同名项目是另一个网址，不能混作用户的站点。导入仓库时使用Vite，构建命令`npm run build`，输出目录`dist`，配置见`vercel.json`。

原始HAR可能含请求头和账号信息，只保留在被Git忽略的`research`目录；仓库只保存筛选、净化后的公开地图素材。来源与边界见[来源记录](docs/SOURCES.md)、[英文参照](reference/README.md)。第三方代码和游戏素材的权利归原权利人，项目不宣称原创这些素材。

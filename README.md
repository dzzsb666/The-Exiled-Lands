# 流放之地交互地图 · 中文核对版

用户要求仅做中文本地化，其余界面参照MapGenie原站，排除广告与追踪。约束见[AGENTS.md](AGENTS.md)，[保真验收](design-qa.md)当前仍为blocked，不能把构建成功当作完整复刻通过。

2026-10-16修正首页入口：`/`与`/review/index.html`现在使用相同的原站素材页面，不再加载旧React/Lucide/Leaflet实现。原站HTML、CSS、字体、64类标记图集、分类映射、原生经纬度与地图程序来自用户提供的本地保存包和HAR。旧`?point=ID`链接可继续打开对应点位。

底图目前只有24张z12瓦片，其他区域和缩放层级仍缺图。账号/PRO后台、其他地图与部分外部媒体尚未实现；当前登录链接仍指向原站。旧版自制的本地进度、备注、个人标记、备份等功能没有移植到新入口，也不代表已按原站行为实现。需要补充的资料见[缺口清单](docs/NEEDED-MATERIALS.md)。

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

`data/translations.json`保存用户确认的名称及来源，`data/point-overrides.json`保存单点覆盖，`data/categories.json`保存分类译名。当前2620个点位标题已有显示译名，192个标题保留英文；长篇说明未全部翻译。未核实的候选只记入[候选记录](docs/TRANSLATION-CANDIDATES.md)，不进入正式译名表。

`data/pending-translations.csv`为待核对清单。确认后更新相应JSON，再运行`npm run build:review`；没有自动翻译流程。原始英文身份和说明保留，内部地图点位链接指向本地。

## GitHub与Vercel

最新修改位于`codex/source-fidelity`分支。用户自行处理Vercel部署，本会话不执行部署；旧线上站点不会因本地修正自动更新。导入仓库时使用Vite，构建命令`npm run build`，输出目录`dist`，配置见`vercel.json`。

原始HAR可能含请求头和账号信息，只保留在被Git忽略的`research`目录；仓库只保存筛选、净化后的公开地图素材。来源与边界见[来源记录](docs/SOURCES.md)、[英文参照](reference/README.md)。第三方代码和游戏素材的权利归原权利人，项目不宣称原创这些素材。

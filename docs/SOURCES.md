# 来源与保留规则

- 底图：Funcom 官方论坛用户 darthphysicist 于 2023-04-04 发布的 T_FullscreenMap。此前保存于本地，原始4000×4000 JPEG字节未修改。
  https://forums.funcom.com/t/is-there-an-unmarked-map-of-the-exiled-lands-siptah/225634/5
- 点位事实：此前会话保存的 MapGenie 流放之地数据快照；以2812个原始 ID、分类 ID、英文标题、地图位置为基础。不把快照当作实时数据。
  https://mapgenie.io/conan-exiles/maps/exiled-lands
- 中文地点：此前用户已验收的静态地图所使用的 `exiled-lands-points-v2.json`。该文件最初采用TH.GL简体地点资料，少量未有中文的工作译名不导入。整体验收与用户逐项校对的名称分别在译名来源字段中说明。
  https://conanexiles.th.gl/zh-Hans/guides/Locations?map=ExiledLands
- 学习点与三星类别：此前用户验收的地图修订文件；保留名称身份边界，例如“攀爬套装”表示该NPC提供的学习点，不把它当NPC本名。
- 用户本会话明确确认：Performer=艺人；Taskmaster=监工；Shaleback=岩背怪；Frostwolf=霜狼；Relic Hunter Camp=遗宝猎人营地；Dafari Camp=达法人营地。前两项属奴隶职业，接着两项属宠物，最后两项属营地。

## 坐标变换

MapGenie快照 latitude/longitude 通过十个方尖碑与既有底图配准。像素原点在左上角，宽高4000。

```
x = (17479.909570408014 × longitude + 18293.265988403116) / 3
y = (-17660.170344924696 × latitude + 18401.51471807706) / 3
```

十个控制点在 `projection-controls.json` 中保留。拟合在12K标注图中的最大残差39.1px，折算4000图约13.03px。Leaflet 使用 `CRS.Simple`，显示点位转为 `[4000-y, x]`，避免上下翻转。

底图SHA-256：82fb465bff1b1d1955cd3f577ae8559556ee829401f0e66361f16100836cdde2。

## 未导入内容

原网站程序、用户账号/云同步、评论、付费内容、说明图片和长篇文本未导入。未确认中文不自行补写；档案馆有争议的旧清单不导入。网站提供点位原站链接供核对。

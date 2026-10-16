# 来源与保留规则

- 底图：Funcom 官方论坛用户 darthphysicist 于 2023-04-04 发布的 T_FullscreenMap。此前保存于本地，原始4000×4000 JPEG字节未修改。
  https://forums.funcom.com/t/is-there-an-unmarked-map-of-the-exiled-lands-siptah/225634/5
- 点位事实：此前会话保存的 MapGenie 流放之地数据快照；以2812个原始 ID、分类 ID、英文标题、地图位置为基础。不把快照当作实时数据。
  https://mapgenie.io/conan-exiles/maps/exiled-lands
- 中文地点：此前用户已验收的静态地图所使用的 `exiled-lands-points-v2.json`。该文件最初采用TH.GL简体地点资料，少量未有中文的工作译名不导入。整体验收与用户逐项校对的名称分别在译名来源字段中说明。
  https://conanexiles.th.gl/zh-Hans/guides/Locations?map=ExiledLands
- 学习点与三星类别：此前用户验收的地图修订文件；保留名称身份边界，例如“攀爬套装”表示该NPC提供的学习点，不把它当NPC本名。
- 用户本会话明确确认：Performer=艺人；Taskmaster=监工；Shaleback=岩背怪；Frostwolf=霜狼；Relic Hunter Camp=遗宝猎人营地；Dafari Camp=达法人营地。前两项属奴隶职业，接着两项属宠物，最后两项属营地。
- 用户本会话资源分类确认：Black Ice=黑冰；Brimstone=硫磺；Coal=煤；Crystal=水晶；Ice=冰；Iron=铁；Obsidian=黑曜石；Silver=银矿；Star Metal=星辰矿。这些是资源采集点，未据此自动翻译其他颜色水晶、石鼻兽或装备名称。
- 用户2026-10-15确认：Armorer=制甲匠；Random Thrall沿用“随机奴隶”，分类含义为随机种类奴隶的刷新点。此分类的原始点位标题`Named Thrall`尚未确认中文，仍保留英文，不把分类名套用为NPC姓名。
- 用户本轮确认：Capital City=大型聚落；Ruin=遗迹；Vista=景点；Black Hand Camp=黑手会；Cimmerian Camp=西米利亚；Desert Dogs Camp=沙漠之犬。后面三项为营地分类，严格沿用用户原文，不自行添加“营地”。
- 用户2026-10-16确认奴隶分类：Alchemist=炼金术士；Archer=弓箭手；Bearer=搬运工；Blacksmith=铁匠；Carpenter=木匠；Cook=厨师。仅用于职业/类型筛选，不据此替换英文NPC姓名。
- 用户2026-10-16继续确认：Fighter=斗士；Priest=祭司；Smelter=司炉；Tanner=制革。用于奴隶职业分类，严格保留用户原文，不添加“工”或“匠”。至此14项奴隶分类均有用户确认的中文。
- 用户2026-10-16确认营地分类：Exile Camp=流放者营地；Frost Giant Camp=冰霜巨人营地；Lemurian Camp=勒穆里亚营地；Other Camp=其他营地；Vanir Camp=华纳神族营地。至此11项营地分类均已确认中文，具体地点专名不据此改写。
- 用户2026-10-16确认宠物分类：Bear=熊；Boar=野猪；Crocodile=鳄鱼；Elephant=大象；Fawn=幼鹿；Jaguar=美洲狮。Jaguar严格按用户指定用语保留，不自行改为其他译法；带Cub/Calf等字样的具体点位名称仍另行核对。
- 用户2026-10-16补齐宠物分类：Lion=狮子；Ostrich=鸵鸟；Panther=黑豹；Rhino=犀牛；Sabretooth=剑齿虎；Spotted Hyena=斑点鬣狗；Striped Hyena=条纹鬣狗；Tiger=老虎；Wolf=狼。17项宠物分类均已确认，具体幼兽或蛋的点名仍另行核对。
- 用户2026-10-16确认剩余分类：Dictionary=词典；Lore=文献；Merchant=商人；NPC=NPC（保留英文）；Miscellaneous=杂项。64项分类均已有确认显示名称，不代表点位本名或长篇说明全部翻译完成。
- 已确认动物与职业名称的同语境复用：仅当点位属于宠物/奴隶分类，且英文标题与该分类英文逐字相同时，沿用该分类确认译名。共597处通用标题，无新译文；Named Thrall、NPC专名、幼兽后缀及Sabertooth等不同拼写不适用。单点覆盖和既有确认词条仍优先。
- 用户其他会话已明确确认、2026-10-15同步：Bin-Yakin's Seal（原绘图记录写作Bit-Yakin's Seal）=比特雅金的印章；Ruins of al-Merayah=阿梅莱亚废墟。依据`assets/maps/exiled-lands-points-revision23.json`中的用户确认注记，分别匹配原站点位88250和88189。

## 原站素材中文核对入口

`/review/index.html`使用用户提供的原站HTML/HAR中保存的原程序、字体、CSS、图标图集与2812个原生经纬度点位，去广告并本地化；本页不使用下文旧React首页的近似投影。原始HAR和请求头不提交。长篇说明保留英文，内部地图链接改为本地。登录/PRO服务和部分外部媒体没有实现。

现有完整成品图为`assets/maps/exiled-lands-bosses-revision26-HD-12000.jpg`。完整干净底图与24张原站瓦片的离线比对显示地形吻合但非像素相同，见`fidelity/terrain-alignment.json`；未生成替代瓦片。缺口详见[需要补充的资料](NEEDED-MATERIALS.md)。

## 旧React首页的坐标变换

MapGenie快照 latitude/longitude 通过十个方尖碑与既有底图配准。像素原点在左上角，宽高4000。

```
x = (17479.909570408014 × longitude + 18293.265988403116) / 3
y = (-17660.170344924696 × latitude + 18401.51471807706) / 3
```

十个控制点在 `projection-controls.json` 中保留。拟合在12K标注图中的最大残差39.1px，折算4000图约13.03px。Leaflet 使用 `CRS.Simple`，显示点位转为 `[4000-y, x]`，避免上下翻转。

网格沿用原有地图生成脚本中的标定：A列从x约171开始，第17行从y约185开始，单格约226.7像素。点位详情、搜索结果与鼠标位置使用同一换算。网格为导航参考，边界附近仍应以实际点位为准。

底图SHA-256：82fb465bff1b1d1955cd3f577ae8559556ee829401f0e66361f16100836cdde2。

## 未导入内容

旧React首页没有导入原网站程序、用户账号/云同步、评论、付费内容、说明图片和长篇文本。中文核对入口已导入保存的原程序及说明原文，但账号服务和未保存的外部媒体仍缺。未确认中文不自行补写；档案馆有争议的旧清单不导入。

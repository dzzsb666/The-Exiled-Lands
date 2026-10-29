# 西普塔岛点位与译名核对

日期：2026-10-29。范围：本地保存的原站地图 259 数据与当前中文动态地图；不以静态成图反推坐标。

## 点位数据

- 原始 `reference/api/v1/maps/259/data`：5231 条；当前 `public/review/data/siptah-locations.json`：5231 条，ID 唯一。
- 逐条核对 ID、map_id、category_id、latitude、longitude；未发现差异。63 个分类均能在保存的配置中找到。
- 此项证明本地导入没有改变原始点位身份和坐标；尚未证明原站每个点位在游戏世界中的位置都准确，也未逐点完成画面验收。
- Vault 分类有 15 个点：14 个远古宝库名称及 Accursed Citadel。不能把 15 个都当作已核实的远古宝库内部地图。

## 待确认中文

- 用户 2026-10-29 确认：西普塔岛 Boss 分类及同名通用点位标题显示为 `BOSS`，不翻译；44 个同名点位已据此处理，其他具体生物名和 `Boss (?)` 不受影响。
- 用户确认 Vault 分类显示为“暗窖”（2026-10-29）。仅改侧栏分类，15 个对应入口的专有名称仍逐个核对；其中 Accursed Citadel 仍保持其原站分类身份。
- 用户 2026-10-29 确认 Leyshrine 分类为“活祭祀”；静态地图 r24 的六个名称已对应动态地图的六处地点。
- 已找到已完成静态地图的点位数据 `research/static-map-history/assets-maps/siptah-discovery-r24-points.json`。可追溯匹配表为 `data/siptah-static-name-matches.json`：107 个唯一英文标题精确对应，6 个活祭祀按静态名称和原站后缀对应，19 个同名同译点位复用，另 1 个 Demesne/Demense 原站拼写差异按唯一身份对应；共 133 处应用静态名称。原始点位 ID、坐标和分类未改。
- Boatswain's Beacon 的两处静态记录译名不同，不能仅按英文标题给唯一的动态点位套名；Wreck of the Sea Girl 在当前动态源中没有对应点；Elephant Graveyard 在静态资料中仍未获确认中文。三者保留待核对。
- 第二轮又从静态 r24 的 learning 清单和项目已确认的同名表情、NPC 译名中对应 29 个点位；后续发现原站 Gates of X'chotl 的一处标题含转义反斜杠，按静态图两处同名记录补为“希科特之扉”。匹配表现有 163 条记录。未把静态 Boss 的星级写进动态地图只有生物名的点位。
- 用户 2026-10-29 确认 Gold 资源分类及 135 个同名点位统一为“金矿”；只应用于 category_id 3390，不扩展至其他含 Gold 的标题。
- 用户 2026-10-29 确认 Pets → Turtle 分类及 46 个同名宠物点位统一为“乌龟”；只应用于 category_id 3355。
- 用户 2026-10-29 确认 Pets → Foal 分类及 14 个同名宠物点位为“马驹”；只应用于 category_id 3378。
- 用户 2026-10-29 确认 Pets → Dog 分类及 13 个同名宠物点位为“狗”；只应用于 category_id 3377。
- 用户 2026-10-29 对宠物组给出三处更正：Jungleclaw＝丛林爪虎、Rocknose＝石鼻兽、Sand Reaper＝沙漠掠魂怪；同一批其余八项按用户对确认表仅指出更正项的回复应用。11 个分类及其 57 个同名点位记录在 `data/siptah-pet-confirmations.json`，只作用于西普塔岛宠物分类。
- 用户更正 Accursed Banners＝“受诅战旗”；按同批确认规则应用配方分类中其余 10 个未被更正的建议。用户随后明确确认 Axe of the Lion（206445）＝“雄狮斧”，已应用点位标题，合计本批 12 处记录在 `data/siptah-recipe-confirmations.json`。原始地图把 206445 归 Recipe 分类且说明为空，物品来源资料将其列为传奇单手斧；不凭分类断定该点是配方学习处，也未修改原始分类。
- 用户确认 BOSS 分类标题中的 26 个概括名称，四项明确更正为 Rockslide＝岩滑堆、Rotbranch＝腐枝怪、The Lone Wanderer＝独行看守、The Judge＝法官；共应用 82 个点位，记录在 `data/siptah-boss-confirmations.json`。Bigfoot 7 点和 Demon Bull 2 点保留英文；不将任何 BOSS 点位统一判为三星或同一个具名首领。
- 用户 2026-10-29 按点位 ID 确认 Fighter 分类首批六名：N'gora＝恩戈拉、Onis the Quite Angry＝盛怒者欧尼斯、Nruka＝恩鲁卡、Accursed Berserker＝受诅狂战士、Sonja the Accursed＝受诅松雅、Umbra the Slayer＝杀手昂布拉。记录在 `data/siptah-fighter-confirmations.json`，仅应用于对应六点。
- 用户续确认 Fighter 六名：Kunar the Invader＝入侵者库纳尔、Quartermaster Kung＝军需官昆、Nurus the Backstabber＝背刺人努露斯、Kruth One-blow＝必杀悍将克鲁斯、Petr Storm-Heir＝风暴后裔彼特、Beast Tamer Frida the Accursed＝受诅驯兽师弗里达。照用户完整写法应用对应点位，不改原始分类。
- 用户确认 Fighter 最后两名：Ator the Slavemaster＝奴隶主阿托尔、The Minstrel＝乐师；该分类剩余标题已核对完毕。
- 用户确认 Emote 分类首批六个原站标题：Prayer to Yog＝约格的祷文、Tinker's Notes＝修补匠的笔记本、Eighty Shades of Pink＝《八十度粉》、Thinker's Notes＝思考者的笔记、Jester's Jokebook＝小丑的笑话册、Prayer to Mitra＝米彻的祷文。照用户完整写法应用对应点位；没有推断学到的表情动作。
- 用户确认 Emote 分类最后五个原站标题：Cimmerian Book of Taunts＝《西米里亚嘲讽之书》、Prayer to Set＝赛特的祷文、Aquilonian Bedtime Stories＝阿奎洛尼亚睡前故事、One Hundred Shades of Pink＝《一百度粉》、Groveller's Manual＝屈节者的手册；该分类剩余标题已核对完毕。
- 用户确认 Merchant 分类首批六名：Urik, Master Tamer＝驯兽大师尤里科、Shawna the Strange＝怪人肖纳、Handler PutKet'Leon＝商人帕吉特雷昂、Hannah the Broker＝掮客汉娜、Ephremis the Broker＝掮客艾福睿梅斯、Tamer Kapi＝彻皮。按点位 ID 记录在 `data/siptah-merchant-confirmations.json`；称号照用户完整写法，不以英文重译。
- 用户补充 Merchant 最后一名 Owen the Beautiful＝美丽的欧文。老图同名商人点位 198404 原本仍在待确认清单，现同步采用本次确认名称；西普塔岛 Merchant 分类已核对完毕。
- 用户确认 Archer 四名：Sarnai Thorn＝荆棘萨奈、Cristian the Blade＝锋刃克里斯蒂安、Markos the Accursed＝受诅马柯斯、Hap-Zebah＝哈普赛巴；仅应用于对应点位，原始分类不变。
- 用户确认 Cook 四名具名角色：Marra＝船上厨师马拉、Vatessa the Potent＝大力的维特萨、Taster the Accursed＝受诅塔斯特、Alterra the Baker＝面包师阿特拉；仅应用对应点位。
- Vista 待确认三点复查静态地图 r1–r24：Wreck of the Sea Dog（88421）、Simmi's Beacon（88479）未见对应记录；Elephant Graveyard（88484）存在，但 `name` 始终为空且标为“参考图名称待辨认”。因此三者不能直接复用静态图中文名，继续保留英文待用户确认。
- 用户给出 Alchemist 三名及对应资料链接：Darmok the Accursed＝受诅达莫克、Tingris of Zingara＝辛加拉的廷利斯、Amn'Et the Alchemist＝炼金术士阿姆艾特。用户提供链接已记录在 `data/siptah-alchemist-confirmations.json`；联网读取该站失败，中文名称以用户本次确认为准。
- 用户给出 Blacksmith 三名及对应资料链接：Iria Soot Face＝煤烟脸伊瑞亚、Heker the Henpecked＝妻管严海克尔、Paket the Hammer＝大锤帕克特。用户提供链接已记录在 `data/siptah-blacksmith-confirmations.json`；联网读取该站失败，中文名称以用户本次确认为准。
- 用户确认 Priest 三名：Dewain the Accursed＝受诅德维恩、Guzala the Worshipful＝虔诚的古扎拉、Aldris of the True Faith＝真信者阿椎斯；资料链接记录在 `data/siptah-priest-confirmations.json`，Aldris 按原始点位英文与用户确认名对应。
- 用户确认 Armorer 两名：Finnbar the Accursed＝受诅芬霸、Llor the Accursed＝受诅洛尔；用户提供的资料链接记录在 `data/siptah-armorer-confirmations.json`。
- 用户确认 Carpenter 两名：Imigo the Carpenter＝木匠依米戈、Acastel the Accursed＝受诅阿卡斯特；用户提供的资料链接记录在 `data/siptah-carpenter-confirmations.json`。
- 用户确认 Performer 两名：Danyo the Seductive＝迷人的丹佑、Imiu of Derketo＝得喀托的伊缪；用户提供的资料链接记录在 `data/siptah-performer-confirmations.json`。
- 用户确认 Tanner 两名：Bak'h＝巴克哈、Nyle the Accursed＝受诅奈尔；用户提供的资料链接记录在 `data/siptah-tanner-confirmations.json`。
- 用户确认 Taskmaster 两名：Ana the Torturer＝酷刑者阿娜、Ruka the Fierce＝凶狠的鲁卡；用户提供的资料链接记录在 `data/siptah-taskmaster-confirmations.json`。
- 用户确认 NPC 点位 Valeria（201230）＝瓦莱里亚，资料链接记录在 `data/siptah-npc-confirmations.json`。
- 用户确认 Smelter 点位 Astak Black Foot（201334）＝黑脚阿斯塔克，依据本地保存的简中数据库索引条目 `creature_astak_blackfoot`。
- 用户确认 Siptah's Journal 1–24 统一为“西普塔日记1”至“西普塔日记24”，保留各点原序号。
- 用户确认 Dictionary 三项：Tongue of the Serpent Man＝辞典(蛇人腔)、Kothian (?)＝辞典(寇斯语)（?）、Khitani (?)＝辞典(契泰语)（?）；后两项保留原站不确定标记，用户提供的物品链接记录在 `data/siptah-dictionary-confirmations.json`。
- 用户要求按坐标复用静态图名称。使用 107 处唯一同名点拟合坐标，误差中位数约 0.004 静态图原生像素：88480 对应克利弗残骸，88479 对应水手长的灯塔，88421 对应海的女儿残骸，三处误差小于 0.01 像素。后两处动态与静态英文标题不同，故匹配依据是用户指定的坐标；原英文保留。88454 附近没有对应静态点，88484 的静态中文栏为空。
- 当前有 11 条点位标题保持原英文；63 个分类的显示名称均已确认，包括暂留英文的 Bigfoot 7、Demon Bull 2 和两个无静态中文对应的地点。
- 下一批按英文、分类及点位数量逐项核对尚无已确认译名的条目。不得从分类译名自动推定不同英文 NPC 的身份或专名。
- 全部待确认项保存在 `data/pending-siptah-translations.csv`。用户确认前保留英文；文献类按既有约定放最后。

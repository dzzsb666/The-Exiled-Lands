# 中文名称的使用规则

游戏名称只使用此前用户验收地图中已有的名称，或用户逐项明确给出的中文名称。保留英文身份、原始点位 ID 和来源；不从第三方简体数据库自动补译。

`translations.json` 是中英对照表，`point-overrides.json` 是只适用于指定点位的显示名称（例如“三星鳄鱼”或“攀爬套装”，不冒充 NPC 本名）。`categories.json` 的 null 表示尚待用户确认。

`pending-translations.csv` 列出未确认的名称。修改 JSON 后运行 `node scripts/build-data.mjs`，再运行 `npm run build`。CSV 仅用于核对，不自动采纳填写内容。

档案馆第14版清单在后续会话中被用户指出有误，因此不导入动态地图。已有“工作译名”、带星号名称和无法确定身份的条目也不作为已确认中文使用。

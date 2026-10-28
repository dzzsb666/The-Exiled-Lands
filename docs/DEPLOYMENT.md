# 双地图发布记录

2026-10-28：完整双地图代码和素材已推送GitHub main与codex/source-fidelity，运行代码提交af2ef2773d83b795c2dda90564a2cba25d19e4e0。用户现有Vercel Git集成构建成功；没有新建长期自动部署。

- [流放之地](https://the-exiled-lands-kappa.vercel.app/)
- [西普塔岛](https://the-exiled-lands-kappa.vercel.app/review/siptah.html)
- [Vercel成功记录](https://vercel.com/dzz893437690-8401s-projects/the-exiled-lands/3joeezB4oxVPznYiAuDXJmkmmWvE)，由GitHub提交状态确认success，域名清单与本次构建一致。

两图完整10922张瓦片、2812+5231个点位、27张现有点位媒体均已接入。活动程序为原站当前map.113b2a48.js及MapLibre/Worker，使用原图集、字体和样式，排除广告与追踪。

发布前从Git归档重新构建，16项测试与完整静态清单校验通过。干净构建共11003个文件（含不公开的vercel.json）。线上逐项读回全部11002个公开文件：11001个SHA-1和大小完全一致；未使用的旧favicon.svg仅Windows归档CRLF与线上Linux LF差异，内容归一后一致。全部10988个原站素材逐字节一致，涵盖所有瓦片、图集、字体、程序、Worker、CSS和点位图片。摘要见[线上核验](fidelity/live-dual-map-assets-2026-10-28.json)，完整逐文件记录保留本地.qa，不含认证信息。

正式域名双地图已在用户Chrome实际打开并截图；西普塔岛线上放大操作后的画面也已保存。证据为fidelity/live-exiled-2026-10-28.png、live-siptah-2026-10-28.png和live-siptah-zoom-2026-10-28.png。手机分类、详情和全部缩放档位已有本地浏览器复测，不能把本地截图标作线上截图。

原始HAR、Cookie、请求头和账号信息不进入Git或部署。reference/siptah-source中的用户静态地图资料未修改、未提交。

尚未迁入账号/PRO后台；未确认译名保持英文，整站1:1最终验收仍为blocked，见根目录design-qa.md。这次发布解决的是两图完整地形、缩放与公开点位接入，不能称作全部账号服务复刻。

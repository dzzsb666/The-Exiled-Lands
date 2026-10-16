# 当前上线方式

最新结果：用户实际站点[the-exiled-lands-kappa.vercel.app](https://the-exiled-lands-kappa.vercel.app/)已通过GitHub main自动部署原站素材修正版（代码提交`c8eaa43095c6ea4dfea27d0a8d5b0371ca52c6bf`），[Vercel部署记录](https://vercel.com/dzz893437690-8401s-projects/the-exiled-lands/EGuUc5zFEo2NjQDPKmRjdi4PhAnn)由GitHub提交状态确认success。修正了嵌套assets/dist被Git忽略导致9个资源404的问题；干净Git归档构建、12项测试与发布清单验证通过。线上68个公开文件均HTTP200，其中67个与干净构建SHA-1完全一致；旧版未使用的`favicon.svg`仅CRLF/LF换行不同，内容归一后相同。全部原站图集、字体、CSS、地图程序和瓦片均匹配。报告见`fidelity/kappa-live-assets-2026-10-16.json`。浏览器画面读取仍超时，不能声称已经获得线上截图。

2026-10-16目标核对更正：用户实际打开的网站是`https://the-exiled-lands-kappa.vercel.app/`，属于`dzz893437690-8401s-projects`下另一个同名项目。下文正式网址是本会话此前连接的heifang项目，不能视为用户当前项目已更新。核查时kappa首页仍为旧React入口；已将原站素材修正版快进推送到GitHub main。当前Vercel连接直接读取用户团队项目返回403，尚未确认kappa项目是否自动构建并更新。

2026-10-16用户追加要求“部署了给我看下”，本次据此发布最新原站素材修正版。默认仍由用户处理后续Vercel操作，本次发布不表示获得长期自动部署授权。

- 正式网址：[流放之地地图](https://the-exiled-lands.vercel.app/)。
- 独立部署网址：https://the-exiled-lands-dislnqkn8-heifang-s-projects.vercel.app/ 。
- 项目：the-exiled-lands，ID `prj_TbhB15Bd3hJazzjHDHf0Po2Jfnbt`。
- 团队：heifang's projects，ID `team_qyqgnVWN36UdHAWqSI99dLtx`。
- 部署ID：`dpl_HdWr23m1vWDdWY44St5DuVvL2pBh`。
- 环境：production；Vercel状态READY，正式域名已分配，aliasError为空。
- 构建来源：`codex/source-fidelity`分支提交`4c6d023ba2fa15d8a64465e24bb730d76c60a1ac`。界面和图标入口修复始于`4c9f361`，其后仅加强发布清单校验。
- 发布方式：本地已验证的Vite静态构建，逐项上传69个文件，再使用完整文件清单创建生产部署；未修改Git生产分支或配置新的Git集成。

## 发布验证

构建与12项测试通过。发布清单检查首页与原站素材核对页一致、2812个点位/64类分类，以及全部57个原站素材的字节数与SHA-256。每项文件上传前检查Base64解码长度与SHA-1。

发布后通过正式域名逐项读取68个公开文件，全部HTTP200，SHA-1与发布清单一致。`vercel.json`为平台配置，不作为公开文件检查。报告：[线上文件核对](fidelity/live-deployment-assets-2026-10-16.json)。

内置浏览器已创建正式网址标签，但读取页面画面、截图反复超时，`open_in_codex`返回queued；不能声称已成功在用户当前窗口展示，也不能把本地截图冒充线上截图。线上中文搜索及手机交互未完成本轮浏览器复验；发布前对应原站素材页面已有本地验证。

当前只收录24张z12底图瓦片，拖出覆盖范围或切换缩放仍会缺图；账号/PRO及其他保真缺口见[验收记录](../design-qa.md)。发布成功不等于整站复刻完成。

## 无状态发布清单

```sh
npm run build
node scripts/prepare-static-deploy.mjs
```

清单位于被Git忽略的`.vercel-upload/manifest.json`，含公开构建文件的SHA-1、字节数与Base64内容。上传每项成功后，部署API必须使用完整`{file, sha, size}`清单，不能只提交增量文件。原始HAR、请求头、Cookie和账号信息不进入部署。

## 先前发布记录

2026-10-14旧React静态核对版：提交`7749416e100c4d63df9137ce62407be7b136ce61`，部署`dpl_6rV5STKkV7P8U76x8zg9xVrE8WW1`。该版首页使用自选图标，已由本次生产部署替换。

此前Vercel Git连接返回`repo_no_access`，故采用静态文件上传；本次没有重新配置仓库集成，GitHub推送不能视作自动上线证明。

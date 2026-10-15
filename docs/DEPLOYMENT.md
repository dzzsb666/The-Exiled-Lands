# 当前上线方式

用户最新指示：Vercel操作由用户自行处理。后续地图改进只推送GitHub，不再由本会话部署。因此以下网址和提交记录只对应此前已发布的静态核对版，不能代表仓库最新版本。

- 生产网址：https://the-exiled-lands.vercel.app/
- Vercel 项目：the-exiled-lands；项目ID `prj_TbhB15Bd3hJazzjHDHf0Po2Jfnbt`。
- 所属团队：heifang's projects；团队ID `team_qyqgnVWN36UdHAWqSI99dLtx`。
- 当前发布：审核过的本地 Vite 静态构建，通过 Vercel 文件上传与部署 API 发布。
- 已发布代码提交：`7749416e100c4d63df9137ce62407be7b136ce61`。
- 最终部署ID：`dpl_6rV5STKkV7P8U76x8zg9xVrE8WW1`。
- 源码已推送到 https://github.com/dzzsb666/The-Exiled-Lands 的 main 分支。

## 自动关联尚未完成

Vercel 连接的 Git 身份对该仓库缺少写入/管理访问，`create_git_project` 返回 `repo_no_access`。本机Git凭据可以推送仓库，但这与 Vercel 的 Git 集成权限相互独立。因此当前 GitHub 推送不会自动上线；网站已经独立部署可用。

补齐 Vercel 对该 GitHub 仓库的访问后，可在项目 Git 设置中连接 `dzzsb666/The-Exiled-Lands`，框架改为 Vite、构建命令 `npm run build`、输出目录 `dist`。不要把当前静态构建发布的 null 框架设置误用于源代码构建。

## 无状态发布清单

```sh
npm run build
node scripts/prepare-static-deploy.mjs
```

发布清单位于被Git忽略的 `.vercel-upload/manifest.json`。脚本确认首页、全部首页引用的JS/CSS、地图图片、点位数据和译名核对表均已存在；核对2812个点位和64个分类后才输出包含SHA-1、字节数和Base64文件内容的完整清单。上传每个文件后，部署 API 使用对应 `{file, sha, size}`。每次部署必须传完整文件清单，不能只传新增文件。

Vercel `READY` 仅表示部署流程完成，不能代替验证首页和所有静态资源。上线后检查首页HTTP200、JS/CSS加载、地图底图和JSON点位、搜索定位，以及手机全图和详情。

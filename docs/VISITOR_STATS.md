# 首页访客分布地图

首页社区区域上方使用发起者提供的 **MapMyVisitors 官方图片式地图**。地图与统计页链接直接放在 `<body>` 内，关闭 JavaScript 也可显示和点击；本站不需要服务器，不加载旧地球的 jQuery、Velocity 或 iframe。

- 地图：`https://mapmyvisitors.com/map.png?d=ntLJGOeKJKC9srHXo9NO33yzZqYIH9yzYRgX1K1u8JU&cl=ffffff`
- [对应的国家 / 地区统计页](https://mapmyvisitors.com/web/1c9hd)
- 配置：`web/visitor-map-config.json`
- 展示与本地加载状态：`web/index.html`、`web/visitor-map.css`、`web/visitor-map.js`

2026-11-14 接入核对：上述图片返回 HTTP 200、`image/png`，实际尺寸为 180 × 112；统计页返回 HTTP 200，页面包含本站 `AIinfra-JobHub` 标识。使用原始官方图片参数，不增加未经确认的尺寸参数。图片加载成功不等于已经核验每条访问记录，国家或地区统计以提供方数据为准。

## 展示行为

首页直接请求一次官方图片，没有额外隐藏计数图片，不对图片定时刷新。点击地图或「查看国家 / 地区统计」按钮打开真实统计页。浏览器可显示已有缓存的图片；提供方更新、去重和缓存可能造成延迟。加载失败时仍保留统计页入口，可手动重试；不显示本地示意地图或虚构数字。重试产生一次新的图片加载。

`visitor-map.js` 只处理图片加载状态、中英文提示和其他公开页的计数，不加载服务商 JavaScript、不读取笔记或表单。已经从缓存加载的图片也能被识别。地图图片本身由 MapMyVisitors 生成；本站不解析图片来推导总访问量或国家数。

## 统计范围

首页、课程、入门自查、知识库、故障案例、练习、项目、求职准备和人才速览接入统计。首页使用可见地图；其他这些公开页面按 [官方安装说明](https://mapmyvisitors.com/learn/tools/add-a-visitor-map-widget/) 使用同一公开 key 的图片，以 1 × 1 隐藏展示。投递记录、招聘草稿、作品编辑和搜索页不加载统计。

统计表示已接入页面的访问，不等于在线人数、注册用户或独立学员数。国家 / 地区为 IP 近似定位，代理和 VPN 会影响来源；地图点不是访客国籍或精确位置。新 key 使用自己的统计，不能自动继承旧地球 key 的记录，也不能恢复接入前的流量。

图片请求采用 `strict-origin-when-cross-origin`，跨站只发送来源站点的 origin，不带当前页面的查询参数或表单内容。MapMyVisitors 会按其 [隐私政策](https://mapmyvisitors.com/b/policy) 处理 IP 等访问数据；本站不声称统计服务不收集 IP。

## 修改与验证

更换统计站点时，同步更新 `web/visitor-map-config.json` 和首页图片 `src`、两个统计页 `href`。静态 HTML 中将 `&` 写为 `&amp;`，JSON 中保留 `&`。两者保留同步是为了让地图无需 JavaScript 也能显示，测试会核对它们是否一致。只使用本人站点的公开代码，不需要密码或私密 API key。

运行 `node --test tests/visitor-map.test.cjs` 和 `python3 scripts/build.py`，再推送到 `main` 发布。部署后确认首页正文中的图片与统计页链接、手机宽度、加载失败提示；实际访客数据在提供方统计页检查，不能拿本机数字替代。

如需暂停所有统计，须同时移除首页的外部地图图片和所有公开页面的 `visitor-map.js` 引用，然后重新构建发布；单独修改配置不会移除首页静态图片。已经积累的数据在提供方账号内管理。

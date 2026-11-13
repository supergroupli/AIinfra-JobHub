# 在你的 GitHub 账号下上线

本项目已使用你的公开仓库 [supergroupli/AIinfra-JobHub](https://github.com/supergroupli/AIinfra-JobHub)。
目标网站地址为 [supergroupli.github.io/AIinfra-JobHub](https://supergroupli.github.io/AIinfra-JobHub/)，部署结果以 Actions 为准。
以下从零创建步骤供重新部署或复制项目时参考，不需要重复创建现有仓库。

只需 **一个公开仓库**。不需要服务器、信用卡、域名，也不用先建立 Organization。
以后有共同维护者时，再考虑迁移到社区组织。

## 1. 创建仓库

打开 [GitHub 新建仓库](https://github.com/new)：

- Owner：选择你的个人账号。
- Repository name：建议 `ai-infra-community`。
- Description：`An open community to learn AI infrastructure, share portfolios, and discover opportunities.`
- Visibility：选择 **Public**。
- 不勾选 README，不添加 `.gitignore`，不选择 License：本地已准备这些文件。
- 点击 **Create repository**，把仓库链接发给协作者。

仓库名不是必须叫这个；工作流会自动读取实际账号和仓库名。
项目显示名称暂为 AI Infra Commons，可以再修改，不表示名称已注册或独占。

## 2. 把本目录上传到 main

需要包含隐藏目录 `.github`，它保存提交表单和自动发布工作流。
在本目录的终端执行以下命令，将 `YOUR-ACCOUNT` 和仓库名换为真实值：

```sh
git init -b main
git add .
git commit -m "Create AI Infra Commons community starter"
git remote add origin https://github.com/YOUR-ACCOUNT/ai-infra-community.git
git push -u origin main
```

本目录当前若已存在 Git 仓库或 remote，请先检查，不重复初始化或覆盖。
通过 GitHub 正常登录完成推送即可，不要在聊天、代码或网页中粘贴 token。
也可以使用 GitHub Desktop 添加本地目录后推送。

## 3. 启用交流和网页

1. 仓库 **Settings → General → Features**，启用 **Issues** 和 **Discussions**。
2. **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 在 **Actions** 中找到 **Validate and publish community**，运行或重新运行。
4. 成功后，在 Pages 设置或部署任务中打开实际返回的地址。

通常地址为 `https://你的账号.github.io/ai-infra-community/`。
如果首次 push 时尚未启用 Pages，首次发布可能失败；完成第 2 步后重跑即可。
工作流仅在 `main` push 或手动运行时发布，PR 只验证；无需给全仓库开放 write token 权限。

建议 Discussions 分类：

- Announcements：公告、维护计划。
- Q&A：推理系统问题，可标记答案。
- Show and tell：作品和实验复盘。
- Study groups：共学、源码阅读与复现。
- Ideas：产品建议、志愿维护。

职位与自荐用 Issues 表单，避免把结构化收录和自由讨论混在一起。
提交者需要 GitHub 账号，浏览网站和公开目录不要求登录。

## 4. 上线后的第一轮检查

- 中英切换、手机排版、四条学习路线可以正常打开。
- 勾选学习任务后刷新，当前浏览器仍能看到进度。
- “发布机会”“公开我的作品名片”能跳到本仓库的对应 Issue 表单。
- Discussions 入口已经启用。
- 当前职位和人才目录显示真实空状态；不要用真实公司名称制作虚假招聘示例。
- 可以通过小型 Pull Request 修改学习资料，检查通过并合并后，网站更新。

具体收录方法见 [维护手册](MAINTAINING.md)。Issue 不会自动上架，提交后立即公开。

## 5. 第一批内容

建议先聚焦 LLM inference / serving：

1. 找到愿意参与的 3–5 名维护或共学伙伴。
2. 邀请 3–5 个团队本人提交真实机会，明确地区、报酬和官方申请入口。
3. 邀请 10 位开发者自愿展示作品，允许独立项目和文档贡献。
4. 一起完成一次 vLLM 或 SGLang 实验复盘，并由另一人尝试复现。

这些是启动目标，不是网站已有数据。不要未经同意联系他人或批量搬运个人简历。
优先观察：信息是否准确、对方有没有回复、作品是否有帮助、有没有真正发生合作。
招聘结果只在当事人愿意分享时记录。

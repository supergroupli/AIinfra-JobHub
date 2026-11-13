# 聘枢 · AI Infra JobHub

**Learn. Build. Connect. / 学习、做作品、找到同行。**

[Website / 网站](https://supergroupli.github.io/AIinfra-JobHub/) ·
[Projects / 实战项目](https://supergroupli.github.io/AIinfra-JobHub/projects/) ·
[Portfolio / 作品档案](https://supergroupli.github.io/AIinfra-JobHub/portfolio/) ·
[Repository / 仓库](https://github.com/supergroupli/AIinfra-JobHub) ·
[Discussions / 社区交流](https://github.com/supergroupli/AIinfra-JobHub/discussions)

**Resume submissions / 简历投递：[career@yzinfra.com](mailto:career@yzinfra.com)**

The resume link opens your email client. Emails are received by the mailbox operator
and are not automatically published to GitHub. Public portfolio submissions are a separate opt-in.
简历通过邮件客户端发送，由该邮箱运营方接收处理，不会自动发布到 GitHub；公开作品名片由本人另行选择提交。

A community learning library for people building AI infrastructure: ten-day study guides,
voluntary public portfolios and curated work opportunities. Independent, open and
free to participate. It is not affiliated with vLLM, SGLang or LMCache.

面向全球 AI Infra 开发者的公益社区：10 天学习手册、作品名片、公开机会与社区讨论。
不是完整的招聘系统或完整课程平台；当前没有真实职位、成员或招聘合作方。

## What is included / 已实现

- Responsive Chinese/English website with learning, opportunities, builders and community sections.
- Eleven ten-day guides: foundations, vLLM, SGLang, LMCache, Mooncake, NVIDIA Dynamo, Triton, PyTorch Distributed, Ray, Kubernetes and NCCL.
- 110 bilingual days with concept explanations, practice, deliverables, acceptance checks, official reading and alternatives for learners without the required hardware.
- Two guided courses (foundations and vLLM): 20 illustrated lessons, step-by-step lab commands, expected results, troubleshooting and 40 explained quiz questions. Three browser teaching models illustrate request timing, KV memory and prefix caching.
- Downloadable Python lab kits with CPU exercises, boundary checks and evidence/report exports. The vLLM GPU path pins its engine and model revision; GPU commands are documented, not claimed as hardware-tested here.
- Three career-oriented paths, searchable/filterable catalog, shareable course URLs and downloadable Chinese/English handbooks.
- Self-reported progress, daily notes and evidence links saved in the current browser, with learning-record export and a bilingual portfolio template.
- Eight bilingual practice projects with pinned-environment expectations, deliverables, acceptance criteria, source links and explicit evidence boundaries.
- A browser-local portfolio builder: editable engineering records, draft recovery, Markdown preview, copy and export. Project suggestions never overwrite a draft.
- A public feedback form for blockers, content corrections and independent project reproductions.
- Keyword, technology and work-arrangement filters over reviewed public records; skill overlap is not an ability or hiring score.
- Public GitHub issue forms for opportunities and voluntary portfolios.
- Resume submission links to `career@yzinfra.com` in the navigation and opportunities section.
- Dependency-free static build, publication-rule tests and GitHub Pages Actions workflow.

已实现 11 门 × 10 天的双语学习手册、三条职业路径、课程筛选、独立阅读器、本地进度与笔记、文档与记录导出，以及公开机会和作品名片。
系统基础与 vLLM 已升级为带图解、逐步实验、常见报错和测验解析的课程。先下载实验 ZIP，按第 1 天说明操作；基础课只需 Python 3.9+，vLLM 的 CPU 模拟练习与 GPU 实测路径分别说明。生成的报告需要补充自己的改动、解释与局限，下载示例不等于独立作品。
没有私密简历库、站内私聊、后台登录、AI 自动招聘决策或在线 GPU；学习进度不同步到云端。
Issue 收录采用人工审核后编辑 JSON、合入 PR 的流程，不会自动从 Issue 同步。

## Launch / 上线

This project uses the public repository `supergroupli/AIinfra-JobHub`.
To launch your own copy, create one **public** repository, for example `YOUR-ACCOUNT/ai-infra-community`.
Keep the new repository empty: the files here include the README, `.gitignore` and license.
See [the Chinese launch guide](docs/LAUNCH.md) for the exact steps.

1. Upload/push these files to `main`, including `.github/`.
2. Enable **Settings → General → Features → Discussions**.
3. Set **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Run or rerun **Validate and publish community** in Actions.
5. Open the URL reported by the deployment, usually `https://YOUR-ACCOUNT.github.io/ai-infra-community/`.

The build reads the repository identity from `GITHUB_REPOSITORY`; no personal access token,
API key, database or extra domain is required. Check the repository's Actions tab for deployment status.

## Local preview / 本地预览

Python 3.9 or newer is enough to build and preview; no Python dependencies to install.
For the browser-state regression tests, run `node --test tests/*.test.cjs` with Node.js. CI runs both suites.

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173/`. To activate GitHub links locally, set `repository` in
`site.config.json` to the real `OWNER/REPO`. Leaving it empty shows a connection explanation.
Do not open `index.html` directly as a `file://` URL: the page fetches `data.json`.

## Content and maintenance / 内容与维护

| Path | Purpose |
| --- | --- |
| `web/` | Static HTML, CSS, JavaScript and portfolio template |
| `content/courses/*.json` | Ten-day bilingual courses with primary-source reading |
| `content/paths.json` | Three career-oriented course sequences |
| `web/projects/` | Bilingual practice-project data and searchable project library |
| `web/portfolio/` | Browser-local project portfolio editor and Markdown export |
| `web/labs/` | Downloadable CPU lab source, learner exercises and reference checks; ZIPs are built automatically |
| `web/learning-widgets.js` | Browser quizzes, copy controls and explicit teaching simulations |
| `content/jobs.json` | Reviewed opportunity records; starts empty |
| `content/people.json` | Voluntary public portfolios; starts empty |
| `scripts/build.py`, `scripts/learning.py` | Validation; course HTML, Markdown and sitemap generation to ignored `dist/` |
| `.github/ISSUE_TEMPLATE/` | Public submission forms |
| `.github/workflows/pages.yml` | PR checks and deployment from `main` |

Read [DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) for the development roadmap,
[COMPETITIVE_STRATEGY.md](docs/COMPETITIVE_STRATEGY.md) for differentiation and validation priorities,
[RESEARCH.md](docs/RESEARCH.md) for technology selection, [BRAND.md](docs/BRAND.md) for the original SVG logo,
[PRODUCT.md](docs/PRODUCT.md) for product scope and [MAINTAINING.md](docs/MAINTAINING.md)
for schemas, review, expiry and removal. Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Hosting boundary / 托管边界

GitHub Pages hosts static content. Public repositories can use Pages on GitHub Free.
Pages has usage limits and restrictions on sites primarily facilitating commercial
transactions; being free of charge alone does not establish permission. This starter
is designed as an educational community and public directory, not a transactional
hiring service. Reassess hosting terms if recruitment becomes the primary activity.
GPU experiments run on learners' own compatible hardware, not on this website or its CI.

Official references checked on 2026-11-13:

- [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Pages Actions workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)
- [GitHub Discussions](https://docs.github.com/en/discussions/quickstart)

## License / 许可

The website code, build scripts and original learning materials are available under
the [MIT license](LICENSE). Public job and profile submissions are excluded from this
code license: submitters authorize display of their own submitted information.
Linked third-party materials retain their original licenses. Do not copy entire upstream courses or documents here.

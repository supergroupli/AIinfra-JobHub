# 聘枢 · AI Infra JobHub

首页提供官方访客分布地图，点击可查看国家 / 地区统计，右上角可打开 GitHub 为项目点 Star。访问统计的配置、范围与隐私说明见 [访问统计维护文档](docs/VISITOR_STATS.md)。

**Learn. Build. Connect. / 学习、做作品、找到同行。**

[Website / 网站](https://supergroupli.github.io/AIinfra-JobHub/) ·
[Find your starting point / 入门自查](https://supergroupli.github.io/AIinfra-JobHub/start/) ·
[Career preparation / 求职准备](https://supergroupli.github.io/AIinfra-JobHub/career/) ·
[Application tracker / 投递记录](https://supergroupli.github.io/AIinfra-JobHub/applications/) ·
[Hiring brief / 招聘需求](https://supergroupli.github.io/AIinfra-JobHub/hiring/) ·
[Builders & reviews / 人才与评审](https://supergroupli.github.io/AIinfra-JobHub/talent/) ·
[Projects / 实战项目](https://supergroupli.github.io/AIinfra-JobHub/projects/) ·
[Portfolio / 作品档案](https://supergroupli.github.io/AIinfra-JobHub/portfolio/) ·
[Repository / 仓库](https://github.com/supergroupli/AIinfra-JobHub) ·
[Discussions / 社区交流](https://github.com/supergroupli/AIinfra-JobHub/discussions)

[Core concepts / 原理知识库](https://supergroupli.github.io/AIinfra-JobHub/knowledge/) ·
[Diagnosis labs / 故障诊断](https://supergroupli.github.io/AIinfra-JobHub/cases/) ·
[Practice & review / 练习与复习](https://supergroupli.github.io/AIinfra-JobHub/practice/) ·
[Learning search / 学习搜索](https://supergroupli.github.io/AIinfra-JobHub/search/)

The learning library combines 130 daily lessons, 18 core-concept chapters, 9 runnable CPU diagnosis cases and 260 course questions. Concepts include worked examples and primary sources; cases reveal evidence step by step. The practice center keeps first-attempt and latest results separately, with an explicit review list and JSON backup. Full-text search reaches explanations, lab steps and troubleshooting. Bilingual concept and case handbooks can be downloaded for offline reading.

学习库包含 130 个日课、18 篇原理专题、9 个可运行 CPU 排障案例和 260 道课程题。专题提供逐步算例与官方来源，案例分阶段揭示证据；练习中心区分首次与最近结果，支持错题重练、手动复习清单和 JSON 备份。全文搜索覆盖讲解、实验与报错；知识和案例手册提供中英文离线下载。案例是原创合成数据教学，不代表生产事故或 GPU 实测。

**[RSI Infra · 20 天共同进阶必修 / 20-day advanced core](https://supergroupli.github.io/AIinfra-JobHub/learn/rsi-infra/)**：任务契约、评测隔离、预算、候选搜索、配对计时、经验更新、同预算消融、晋升回滚与结课报告。含 20 张日课图解、40 道解析题和 3 种专用交互模型。CPU 实验包不需要 API key；Day 4/9 为真实 Python 计时，其余成本模型和部署设计单独标注。研究来源及范围见 [RSI_RESEARCH.md](docs/RSI_RESEARCH.md)。

**Resume submissions / 简历投递：[career@yzinfra.com](mailto:career@yzinfra.com)**

**项目发起人：李超群｜所属公司：元智引擎公司。**
Project initiator: Li Chaoqun (李超群), 元智引擎公司.

The resume link opens your email client. Emails are received by the mailbox operator
and are not automatically published to GitHub. Public portfolio submissions are a separate opt-in.
简历通过邮件客户端发送，由该邮箱运营方接收处理，不会自动发布到 GitHub；公开作品名片由本人另行选择提交。

A community learning library for people building AI infrastructure: 10- and 20-day study guides,
voluntary public portfolios and curated work opportunities. Independent, open and
free to participate. It is not affiliated with vLLM, SGLang or LMCache.

面向全球 AI Infra 开发者的公益社区：10 / 20 天学习手册、作品名片、公开机会与社区讨论。
不是完整的招聘系统或完整课程平台；当前没有真实职位、成员或招聘合作方。

## What is included / 已实现

- Responsive Chinese/English website with learning, opportunities, builders and community sections.
- Twelve guided courses: eleven ten-day technology guides plus a twenty-day RSI Infra common-core course, sequenced after role foundations.
- 130 bilingual days with concept explanations, practice, deliverables, acceptance checks, official reading and alternatives for learners without the required hardware.
- Twelve guided courses: 130 illustrated lessons, step-by-step lab commands, expected results, troubleshooting and at least 260 explained quiz questions. Sixteen browser teaching models cover request timing, caches, transfer, scheduling, GPU allocation, kernels, training memory and collectives; every course uses at least three different models.
- Downloadable Python lab kits with CPU exercises, boundary checks and evidence/report exports. The vLLM GPU path pins its engine and model revision; GPU commands are documented, not claimed as hardware-tested here.
- Three career-oriented paths with role-specific core and elective courses, searchable/filterable catalog, shareable course URLs and downloadable Chinese/English handbooks.
- Three seven-day career preparation plans with 27 capstone acceptance checks, clearly labeled teaching examples, role-specific local progress and downloadable briefs. The plan prepares a portfolio and applications; it does not promise employment.
- A recruiter-facing builder directory with contribution/evidence cards, filters and a browser-local reading shortlist. Reviews have explicit states and evidence requirements; both directories currently contain no invented records.
- Real Ray 2.60.0 Core/Serve and PyTorch 2.6.0 CPU/Gloo experiments verified on Ubuntu 22.04 / Python 3.11.18. Permanent JSON results, dependency snapshots, source hashes and the [actual run](https://github.com/supergroupli/AIinfra-JobHub/actions/runs/43455249219) are linked in the courses. These verify small CPU correctness cases, not GPU performance.
- Self-reported progress, daily notes and evidence links saved in the current browser, with learning-record export and a bilingual portfolio template.
- Importable JSON backups for each course's progress/notes and the current portfolio draft: preview before applying, preserve current nonempty fields by default, or explicitly replace that record. Markdown remains a readable export, not an import format.
- Nine bilingual practice projects with pinned-environment expectations, deliverables, acceptance criteria, source links and explicit evidence boundaries.
- A browser-local portfolio builder: editable engineering records, draft recovery, Markdown preview, copy and export. Project suggestions never overwrite a draft.
- A public feedback form for blockers, content corrections and independent project reproductions.
- Daily lesson help links prefill the course/day/source-check date, and a separate opt-in public project-review form supports the curated review queue.
- Keyword, technology and work-arrangement filters over reviewed public records; skill overlap is not an ability or hiring score.
- Public GitHub issue forms for opportunities and voluntary portfolios.
- Resume submission links to `career@yzinfra.com` in the navigation and opportunities section.
- Dependency-free static build, publication-rule tests and GitHub Pages Actions workflow.

已实现 12 门双语学习手册（11 门 × 10 天 + RSI Infra × 20 天）、三条职业路径、课程筛选、独立阅读器、本地进度与笔记、文档与记录导出，以及公开机会和作品名片。
12 门课均有逐日图解、实验命令、预期输出、常见报错和测验解析。先下载对应实验 ZIP，按第 1 天说明操作；必做实验可从 Python 3.9+ 和普通电脑起步，真实框架、GPU 和集群扩展另外说明环境。生成的报告需要补充自己的改动、解释与局限，下载示例不等于独立作品。

“必修”是本站的学习路径建议：系统基础是共同基础，RSI Infra 是完成岗位核心课后的共同进阶必修，其他技术课随目标岗位变化，并非每个 AI Infra 岗位都要求所有框架。

| 方向 | 必修顺序 | 选修示例 |
| --- | --- | --- |
| 推理工程 | 系统基础 → vLLM → SGLang → RSI Infra | LMCache、Mooncake、Dynamo |
| 性能工程 | 系统基础 → Triton → PyTorch Distributed → NCCL → RSI Infra | vLLM、SGLang、Mooncake |
| 平台工程 | 系统基础 → Ray → Kubernetes → RSI Infra | vLLM、Dynamo、LMCache |

基础技术课按 10 天、RSI Infra 按 20 天安排；可以先通过实验自检，再跳过已经掌握的部分。网页上的模型展示公式、单位和边界，不用于预测真实硬件性能。

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
| `web/career/` | Seven-day preparation plans, three capstones and annotated teaching examples |
| `web/talent/` | Public builder filters, local reading shortlist and curated review queue |
| `web/backup.js` | Validated local JSON backup/import for course records and portfolio drafts |
| `web/labs/` | Downloadable CPU lab source, learner exercises and reference checks; ZIPs are built automatically |
| `web/learning-widgets.js`, `web/engineering-models.js` | Browser quizzes, copy controls and explicit teaching simulations |
| `scripts/teaching_models.py` | Bilingual model labels, assumptions, formulas and static fallback results |
| `content/jobs.json` | Reviewed opportunity records; starts empty |
| `content/people.json` | Voluntary public portfolios; starts empty |
| `content/reviews.json` | Consented public review requests with source, state and expiry; starts empty |
| `content/framework-checks.json` | Actual framework-run evidence tied to exact source hashes |
| `scripts/build.py`, `scripts/learning.py` | Validation; course HTML, Markdown and sitemap generation to ignored `dist/` |
| `.github/ISSUE_TEMPLATE/` | Public submission forms |
| `.github/workflows/pages.yml` | PR checks and deployment from `main` |
| `.github/workflows/framework-labs.yml` | Manually triggered real CPU framework checks and raw evidence artifacts |

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

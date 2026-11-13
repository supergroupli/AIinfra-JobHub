# AI Infra Commons

**Learn. Build. Connect. / 学习、做作品、找到同行。**

[Website / 网站](https://supergroupli.github.io/AIinfra-JobHub/) ·
[Repository / 仓库](https://github.com/supergroupli/AIinfra-JobHub) ·
[Discussions / 社区交流](https://github.com/supergroupli/AIinfra-JobHub/discussions)

A community starter for people building AI infrastructure: guided learning paths,
voluntary public portfolios and curated work opportunities. Independent, open and
free to participate. It is not affiliated with vLLM, SGLang or LMCache.

面向全球 AI Infra 开发者的公益社区启动版本：学习路线、作品名片、公开机会与社区讨论。
不是完整的招聘系统或完整课程平台；当前没有真实职位、成员或招聘合作方。

## What is included / 已实现

- Responsive Chinese/English website with learning, opportunities, builders and community sections.
- Four starter learning paths: inference foundations, vLLM, SGLang and LMCache; 12 tasks with concrete deliverables and official source links.
- Self-reported learning progress saved in the current browser, plus a bilingual portfolio template.
- Keyword, technology and work-arrangement filters over reviewed public records; skill overlap is not an ability or hiring score.
- Public GitHub issue forms for opportunities and voluntary portfolios.
- Dependency-free static build, publication-rule tests and GitHub Pages Actions workflow.

已实现中英切换、响应式页面、12 个学习任务、本地进度、作品模板、公开目录筛选、提交表单与部署工作流。
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

Python 3.9 or newer is enough; no dependencies to install.

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
| `content/tracks.json` | Bilingual paths, tasks and primary-source links |
| `content/jobs.json` | Reviewed opportunity records; starts empty |
| `content/people.json` | Voluntary public portfolios; starts empty |
| `scripts/build.py` | Validation and static build to ignored `dist/` |
| `.github/ISSUE_TEMPLATE/` | Public submission forms |
| `.github/workflows/pages.yml` | PR checks and deployment from `main` |

Read [PRODUCT.md](docs/PRODUCT.md) for product scope and [MAINTAINING.md](docs/MAINTAINING.md)
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

# 开发、预览与发布

开发者操作说明由原主 README 迁入。下列命令在仓库根目录执行；技术选型和服务政策的核对日期保留在对应记录中，变更托管用途时应重新核查。

[返回开发文档](README.md) · [参与贡献](../../CONTRIBUTING.md)

## Launch / 上线

This project uses the public repository `supergroupli/AIinfra-JobHub`.
To launch your own copy, create one **public** repository, for example `YOUR-ACCOUNT/ai-infra-community`.
Keep the new repository empty: the files here include the README, `.gitignore` and license.
See [the Chinese launch guide](../LAUNCH.md) for the exact steps.

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
node --test tests/*.test.cjs
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
| `content/courses/*.json` | 10- and 20-day bilingual courses with primary-source reading |
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

Read [ROADMAP.md](ROADMAP.md) for the development roadmap,
[COMPETITIVE_STRATEGY.md](../COMPETITIVE_STRATEGY.md) for differentiation and validation priorities,
[RESEARCH.md](../RESEARCH.md) for technology selection, [BRAND.md](../BRAND.md) for the original SVG logo,
[PRODUCT.md](../PRODUCT.md) for product scope and [MAINTAINING.md](../MAINTAINING.md)
for schemas, review, expiry and removal. Contributions follow [CONTRIBUTING.md](../../CONTRIBUTING.md).

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

# Contributing / 参与共建

You can contribute a learning explanation, reproducible experiment, translation,
documentation fix or improvement to this website. A merged upstream code change
is not a prerequisite for participating.

欢迎学习笔记、可复现实验、中英翻译、文档修正和网站改进。参与不以已有上游 PR 为门槛。

开发环境、目录结构和发布方式见 [开发文档](docs/development/README.md)。主 README 用于介绍聘枢产品；开发日志、验证结果和迭代复盘请放在 `docs/development/`。

For opportunities or your own public portfolio, use the repository's Issue forms.
For conversation, use Discussions. For source changes, open a pull request with
the problem, change and validation. Do not publish someone else's profile without consent.

职位和自荐使用 Issue 表单；交流使用 Discussions；代码或内容改动用 PR。
不要未经同意发布他人资料，不制造虚假职位，不宣传“保证录用”。

Validate locally with Python 3.9+:

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build.py
node --test tests/*.test.cjs
```

See `docs/MAINTAINING.md` for directory schemas and review. Keep technology tags
consistent across the build script, filters and Issue forms. Provide English and
Chinese summaries when changing a learning path; maintainers can help translate submissions.

Practice projects live in `web/projects/projects.json`. Include a concrete problem,
pinned environment, raw evidence, personal contribution, limitations and a useful next step.
Link prerequisite courses by their existing IDs. Keep Chinese and English lists aligned.
For a blocker or independent reproduction, use the learning and project feedback Issue form;
state whether a result was measured, simulated or only designed.

实战项目必须能交付代码、原始记录或明确的设计分析；不得虚构实测结果、就业承诺或认证。
作品生成器只保存浏览器草稿，不会自动把填写内容变成公开 Issue。

Be respectful. No harassment, discrimination, spam, demands for candidate fees,
or publication of confidential information. Discuss technical work and evidence.
Newcomers and independent projects are welcome.

尊重不同背景，不骚扰、不歧视、不群发垃圾内容、不收取求职费用、不披露机密。
围绕技术工作与证据讨论，也欢迎新手与独立项目。

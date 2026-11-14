# 工程实现记录 · 2026-11-14

本记录由原仓库主 README 的实现清单迁入，保存这一阶段的功能范围和验证边界。它是有日期的工程快照，不作为对外产品介绍，也不表示后续功能一直保持相同数量。

[返回开发文档](README.md) · [查看产品介绍](../../README.md)

## 实现范围


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

## 进一步核查

- [实际框架实验与原始证据](../FRAMEWORK_VALIDATION.md)
- [RSI 课程选题、实验范围与来源](../RSI_RESEARCH.md)
- [访客地图的配置与统计口径](../VISITOR_STATS.md)
- [迭代记录与路线图](ROADMAP.md)

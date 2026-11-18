# 维护公开目录

## 知识、诊断与练习内容

`web/knowledge/topics.json` 保存双语原理专题，`web/cases/cases.json` 保存双语排障案例。每条应包含原创解释、明确假设、可核算示例、真实课程日课引用与原始资料。修改技术结论前查官方来源；不要把理论估算、合成数据或资料阅读写成 GPU 实测。构建调用 `scripts/handbooks.py` 验证引用并生成中英离线手册，案例手册含完整解析。

`web/labs/diagnostics/` 是 Python 标准库教学分析程序和9份合成输入。增加或改变 fixture 后，运行 `tests/test_diagnostic_labs.py`；检查输入校验、报告、哈希及预期数值。构建通过现有排除规则生成 `labs/diagnostics.zip`，不打包本地 out、缓存或临时产物。

`scripts/practice.py` 从课程原有 quiz 生成题库，禁止另抄一份答案造成分叉。ID 使用课程/日/题号，内容 SHA-256 随题文、选项、答案、解析及日标题变化；旧指纹记录保留为历史，不计入当前答题结果。答题与复习数据只在本机保存，导入需预览、确认，冲突保留本机。同一页面一次提交只计一次尝试。

`scripts/search.py` 生成公开学习全文索引，包含日课、原理、案例和项目。搜索按全部关键词匹配，以标题、摘要、正文顺序加权；目标链接根据类型与安全 ID 构造。不要索引浏览器记录，不把测验答案或案例最终解析放入搜索摘要。维护首页和课程上的入口时，同时检查中英文和窄屏布局。

## 入门、投递与招聘工具

`web/start/` 根据目标方向、设备、时间和自述基础，解释推荐理由并链接到现有课程日课。它不评定能力，不保证就业；增加课程或改动日课时，应同时检查推荐链接和配套测试。

`web/applications/` 保存个人投递记录、阶段和下一步日期；到期提示按当前设备本地日期计算，只有打开页面才会显示，不发送提醒或代投。`web/hiring/` 帮助招聘者整理岗位需求、作品要求与面试问题，公开发布仍由本人进入 GitHub 表单提交，再经维护者审核。两个工具均支持 Markdown 导出及 JSON 备份与确认式导入；导入冲突保留已有内容，不自动覆盖。

三个工具使用各自独立的浏览器存储键，不把草稿写入公开 JSON，不携带草稿到 GitHub 表单 URL。浏览器清理、设备更换或存储失败都会影响本机记录；页面应保持当前输入可用并提供导出。维护时需覆盖异常数据、导入冲突、URL 校验和 Markdown 转义。

## 实战项目与作品档案

`web/career/` 是三条 7 天作品与投递准备路线，关联现有项目与课程。示例必须显著标为教学构造；本地勾选不转成能力认证、第三方评审或真实人才。`web/talent/` 展示已审核、未过期的自愿公开名片，阅读清单仅存本机 ID，不发送消息。名片可增加双语 `targetRole`，其他字段沿用原 schema。

## 作品评审队列

`04-review.yml` 接收本人主动公开的作品评审请求。提交立即公开；维护者确认同意、源码与具体问题后，手工编辑 `content/reviews.json`，经构建发布到人才页。不要把未发生的评审写入队列。

每条记录包含：唯一 `id`、双语 `title`/`summary`、`author`、公开 `portfolio`、本仓库 Issue 的 `source`、`consent:true`、`updatedAt`、`expiresAt`（确认后 1–90 天）。`status` 为 `queued`（待领取）、`in-review`（评审中）、`changes-requested`（需修改）、`reproduced`（已复现）；后三项需要实际 `reviewer`。已复现还需 `evidence` 指向具体 GitHub Issue 或完整 commit；维护者应核对其版本、环境、执行步骤和边界。链接存在本身不证明内容真实。

没有人领取时保持待领取；不承诺固定答疑时限。撤回请求时删除当前记录并重新发布；公开 Issue 与 Git 历史不会随目录删除而自动消失。

## 真实框架验证与备份

Ray 与 PyTorch Gloo 的真实 CPU 检查使用手动 `framework-labs.yml`。步骤与已测范围见 [FRAMEWORK_VALIDATION.md](FRAMEWORK_VALIDATION.md)。运行成功后保存最小必要的原始 JSON、依赖快照、run URL、commit 与 SHA-256 清单到实验目录的 `validation/日期/`，不用即将过期的 Actions artifact 作为唯一证据。

课程验证标记来自 `content/framework-checks.json`。构建核对当前脚本与证据文件哈希；脚本改变后，必须重跑并更新证据，或移除已失效的验证条目。平台运行记录不等于学员独立作品、同伴复现、GPU 测试或生产性能结论。

课程和作品页支持带版本的 JSON 备份；导入只在浏览器进行，先检查类型/课程/长度再预览。默认合并保留已有非空字段，课程完成记录取并集；替换仅影响当前课程或当前作品草稿。学习 Markdown、求职路线 Markdown 都是可阅读副本，不能自动导回；本机清单与七天路线进度当前没有 JSON 导入。

逐日求助链接只预填课程、天数与资料核对日期，不包含私人笔记；用户补上自己的真实环境和报错后自行提交。查询参数采用 [GitHub 官方的 Issue 表单预填机制](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue)。

`web/projects/projects.json` 维护双语项目。构建会检查日期、双语步骤、交付与验收条目、HTTPS 官方来源和真实课程引用；不要把尚未运行的方案写成实测成果。项目详情通过 `projects/?project=ID` 分享，并将相同 ID 传给作品档案页提供写作提示。

`web/portfolio/` 是浏览器内的编辑与导出工具。作品草稿不属于公开目录，不进入 GitHub 仓库，不自动上传或发邮件；清除浏览器数据会丢失本地草稿。公开作品名片仍走本人主动提交与人工审核。学习与项目反馈使用 `03-project-feedback.yml`，独立复现记录要明确版本、环境、差异和原始结果。

## 简历邮件

求职者可以通过网站的邮件链接投递至 `career@yzinfra.com`。邮箱由其运营方接收与处理，网站没有邮件服务器，也不检查是否送达。请由邮箱管理员确认收件配置、附件处理和访问范围。未另行取得本人公开同意，不得把简历邮件复制到 Issue、Git 文件或公开名片目录。

## 收录流程

1. 收到公开 Issue 后，检查提交者是否有权代表该机会；开发者名片只接受本人提交。核对所填 GitHub 账号与发帖账号。
2. 检查公开展示同意、技术方向、官方链接、工作地区和语言。机会需要报酬范围、币种和周期；志愿协作必须标明无薪。要求含糊时先补充。
3. 不收录私密简历、证件、住址、密钥或客户材料。若 Issue 已有敏感信息，先协助作者编辑/删除，并按 GitHub 流程处理历史；不要复制进 Git。
4. 维护者将同意展示的最少字段整理到 `content/jobs.json` 或 `content/people.json`，用 `source` 链接原 Issue，设置最近确认日期和截止日期。推荐 30 天，最多 90 天。
5. 通过 Pull Request 复核资料与中英摘要，运行校验，合并到 `main` 后自动构建。
6. 在原 Issue 中记录收录状态。该交流由维护者按社区流程处理，建站代码不会代替任何人自动发消息。

浏览器会根据当前 UTC 日期隐藏已到期记录，构建也会移除过期记录。到期不等于原 Issue 自动关闭，原始 Git 数据也不会自动消失。初版没有自动催更或自动验证雇主。

## 数据格式

以下仅为结构示例，**不要将示例直接发布为真实职位**。把 `source` 改为本仓库内真实的提交 Issue，其他字段必须来自真实提交。

```json
{
  "id": "company-role-issue-123",
  "status": "approved",
  "consent": true,
  "title": "Inference Engineer",
  "company": "Actual submitter's company",
  "summary": {"zh": "经提交人确认的中文工作摘要", "en": "An accurate English summary"},
  "tags": ["vLLM", "Serving"],
  "workMode": "remote-regional",
  "location": "Eligible regions, not just Remote",
  "eligibility": "Employment/work authorization constraints and sponsorship",
  "languages": "English, Mandarin",
  "availability": "Expected timezone overlap and hours",
  "seniority": "Concrete experience expectations",
  "kind": "full-time",
  "compensation": "Actual range, currency and period",
  "applyUrl": "https://company.example/careers/real-role",
  "source": "https://github.com/OWNER/REPO/issues/123",
  "updatedAt": "2026-11-13",
  "expiresAt": "2026-12-13"
}
```

名片的共同字段与职位相同：`id`、`status`、`consent`、`summary`、`tags`、`workMode`、`location`、`languages`、`availability`、`source`、`updatedAt`、`expiresAt`。
不用职位的 `title`、`company`、`eligibility`、`seniority`、`kind`、`compensation`、`applyUrl`，改用：

```json
{
  "name": "本人选择的公开名称或昵称",
  "github": "https://github.com/ACTUAL-USER",
  "portfolio": "https://actual-public-portfolio.example/project"
}
```

字段约束：

- `status`：`approved`、`pending` 或 `withdrawn`；只有 `approved` 且未过期会进静态页面数据。
- `consent`：必须是布尔值 `true`，维护者须先检查原始同意；填写这个字段不自动证明已取得同意。
- `tags`：Serving、KV Cache、vLLM、SGLang、LMCache、CUDA、Triton、Kubernetes、Distributed Systems。
- `workMode`：`remote-global`、`remote-regional`、`hybrid`、`onsite`。全球远程必须与实际雇佣范围一致。
- `kind`：`full-time`、`internship`、`contract`、`research`、`open-source`。
- `source`：本仓库 `https://github.com/OWNER/REPO/issues/NUMBER`。
- 日期格式 `YYYY-MM-DD`，最近确认日期不能在未来，过期日期为确认后 1–90 天。
- URL 必须 HTTPS，不得含账号密码；原始内容会按文本转义展示，不执行提交者 HTML。
- 本地有记录后，构建需在 `site.config.json` 设置正确的 `OWNER/REPO`；Actions 自动读取。

公开 JSON 源文件本身也是公开的。不要把还没取得公开同意的资料放进 `pending` 记录。

## 更新与撤回

作者更新原 Issue 并提出请求 → 维护者修改或删除对应 JSON 记录 → 合并并重新发布 → 确认当前网站已更新。

撤回时直接删除记录。`withdrawn` 适合不含私密信息的停用记录，但不等于删除历史。
Git 历史、Actions 旧产物、旧部署、clone、fork 和搜索缓存可能保存已公开内容；网站移除不是全面抹除。
涉及个人敏感资料时，进一步按 GitHub 官方文档处理 Git 历史及支持请求。

## 学习内容维护

保留官方来源；修改实验路径时说明核对日期和测试版本。所有性能结论附环境、工作负载、原始记录与限制。
不要复制整套上游文档，不编造就业结果，也不以自动勾选给开发者颁发能力认证。

课程源文件在 `content/courses/{id}.json`。`durationDays` 省略时为 10，也可显式设为整数 20；实际 steps 数必须一致，day 从 1 连续到声明天数；每一天包含中英对齐的 title、lesson、task、evidence、checklist（2–5 项）、noGpu 与 reading。元数据记录 category、level、hoursPerDay、prerequisites、hardware、hardwareTier、roles、outcome 和 lastVerified。代码样例可选，但必须说明环境与用途。

每一天还需要 explanation（至少两个原理段落）、diagram（有标题、节点和解释）、walkthrough（至少两步，含可执行命令与预期结果）、troubleshooting（至少两项）、quiz（至少两道有解析的题）。每门课至少安排三种不同且相关的交互模型。先解释模型适用范围，再谈实验结果；CPU 语义模型、模拟数据与真实框架测量必须分开标记。`hardwareTier` 按必做路线设置，真实硬件扩展在 `hardware` 与实验 README 中另外注明。

`content/paths.json` 定义职业路径的课程顺序；引用必须指向真实课程。`requiredCourses` 是该岗位路线的必修，`electiveCourses` 是选修，`courses` 必须按顺序等于二者拼接且无重复。所有路线共同必修的课程会显示为共同必修；其他课程的定位随所选方向变化。它们是本站编辑的学习建议，不代表行业统一任职要求。

构建自动生成独立课程 HTML、两种语言的 Markdown 下载、实验 ZIP、站点地图和轻量首页目录。`web/labs/{id}` 必须包含 README 和能独立运行的源码；压缩包根目录为课程 ID，排除输出、缓存与隐藏文件。新课发布前，从 ZIP 解压到干净目录验证逐日命令、自检、学生挑战与参考答案检查。不要直接编辑 `dist/`。`lastVerified` 仅表示资料核对日期；硬件实验的真实运行证据需要另外记录，不能由字段自动推断。

学习进度使用独立的 `course-progress-v2` 浏览器存储版本，避免旧三任务路线的勾选被误当作十天课程成绩。每日笔记按课程和日期独立保存；导出的是学员自我记录，没有云端同步或认证效力。

## 后训练、llm-d 与 MoE 进阶课

`post-training`、`llm-d`、`moe-systems` 各为 20 天、20 张流程图、40 道解析题。新增课程的 `environment` 包含四个必填双语字段：`reference`（上游资料基线）、`minimum`（必做环境）、`verified`（实际验证范围）、`unverified`（未验证扩展与限制）；构建验证并在网页和离线手册中呈现。资料核对不构成真实框架验证标记。

`scripts/frontier_models.py` 保存九种模型的双语说明、公式、默认值；`web/engineering-models.js` 执行浏览器计算。更改时同步静态默认值与动态结果，并检查单位、零值和不可实现的参数组合。后训练流水线的同步屏障、MoE top-k 约束与串行 goodput 分母不可省略。

后训练新增第四条岗位路线；llm-d 是平台路线进阶必修，MoE 是性能路线进阶必修。必修仅表示本站学习建议。三项对应作品在项目库可选，仍由学生提供自己的代码、原始记录和分析。学生 TODO 首次检查失败是预期学习状态；验收同时检查参考实现通过与未完成实现被拒绝。

发布范围与验证记录见 [2026-11-18 课程扩展](development/2026-11-18-curricula.md)。

## RSI 与可变课程天数

`rsi-infra` 为各岗位路线的共同进阶必修，排在各自原核心课之后，20 天/40 题。`scripts/learning.py`、阅读器和首页按实际日数生成文案、目录、进度和跳转；搜索索引包含课程 `dayCount`。课程备份继续使用 v1 格式，由当前可信课程传入 `dayCount`，文件自身不能扩大可导入天数；旧十天课程与作品档案保持兼容。

`web/labs/rsi-infra/` 使用固定任务、允许的候选配置及独立检验教实验闭环。它不执行任意生成代码，不是操作系统安全沙箱，也不是通用自主 RSI 的实证。实际 CPU 计时应与模拟成本分别记录。修改后执行 `tests/test_rsi_lab.py` 并从干净 ZIP 验证 20 个命令；不要因经验消融出现负收益就修改留出集或丢弃结果。

右上角 GitHub Star 链接只是打开仓库，访客在 GitHub 自行操作；没有自动 Star 或模拟计数。GitHub 图标来自 Primer Octicons，其 MIT 许可证随 `web/assets/octicons-LICENSE.txt` 分发。新增页面应包含 `github-star.css` 与相同的可访问入口。

首页使用发起者提供的官方图片式访客地图，直接嵌在正文中，点击打开国家 / 地区统计页。更换站点时同步配置与首页静态图片链接；维护方式和统计范围见 [访问统计维护说明](VISITOR_STATS.md)。不要用本机计数或示意图冒充真实分布。

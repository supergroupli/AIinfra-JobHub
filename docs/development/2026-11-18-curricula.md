# 课程扩展 · 2026-11-18

本次把调研后的第一批方向接入聘枢学习库：后训练基础设施、llm-d 分布式推理与 MoE 系统工程。主 README 只补产品课程入口，开发与验证记录保留在此目录。

## 学习内容与入口

| 课程 | 日课 / 图解 / 解析题 | 必做实验与结课作品 |
| --- | --- | --- |
| `post-training` | 20 / 20 / 40 | 实际 CPU 标量 REINFORCE、奖励和目标函数检查、异步队列、版本/重试/恢复、三项学生挑战及证据包 |
| `llm-d` | 20 / 20 / 40 | 合成控制面、缓存与队列路由、PD 容量、SLO、限流/重试/故障/升级、三项学生挑战及运维分析 |
| `moe-systems` | 20 / 20 / 40 | 实际 CPU dispatch/线性专家/combine、独立 oracle、负载/精度/通信模型、两项学生挑战及性能分析 |

每门课新增三种相关交互，共九种；所有日课均含中英讲解、步骤、预期结果、排错和题目解析。课程页提供 ZIP 与两种语言的离线手册，并接入全文搜索、练习中心、进度记录、备份及作品入口。

库内共 15 门课、190 个日课、380 道解析题、25 种交互模型、12 个实战项目。课程日数是学习安排，不是完成时间或精通程度保证。

新增后训练岗位路线，必修为系统基础、PyTorch Distributed、Ray、后训练 Infra、RSI Infra。平台路线将 vLLM 和 llm-d 纳入必修；性能路线增加 MoE 系统工程。岗位必修是本站教学建议；初学者仍从系统基础进入。

## 版本与实验边界

- verl 资料基线：[v0.9.1](https://github.com/verl-project/verl/releases/tag/v0.9.1)。
- AReaL 资料基线：[v2.1.1](https://github.com/areal-project/AReaL/releases/tag/v2.1.1)。
- llm-d 资料基线：[v1.0.0](https://github.com/llm-d/llm-d/releases/tag/v1.0.0)，完整修订在实验 README 中。
- DeepEP：[f6aa38fe06cd4a0489e7730365d4e0114970a2f3](https://github.com/deepseek-ai/DeepEP/tree/f6aa38fe06cd4a0489e7730365d4e0114970a2f3)。
- DeepGEMM：[5081f8513af57e61696de4f4f04b0e707ffb503e](https://github.com/deepseek-ai/DeepGEMM/tree/5081f8513af57e61696de4f4f04b0e707ffb503e)。

新增 `environment` 元数据，在网页和手册分别说明上游资料基线、必做环境、已验证范围与未验证扩展。源码修订只固定阅读对象，不证明框架兼容性。三门必做实验仅需 Python 3.9+ 标准库；本次实际本地检查使用 Python 3.9.6。

没有运行真实 verl/AReaL 训练、llm-d/Kubernetes GPU 部署或 DeepEP/DeepGEMM 内核。标量策略更新不是 LLM 训练；控制面成本为合成输入；MoE 第 17 天的 Python CPU 计时不是 GPU benchmark。上游扩展提供版本与环境核对步骤，保留为未执行计划。

## 验证与修正

- 完整 Python 回归：126 项通过。已有 HTTP/TCP 实验需要本机回环端口权限，受限运行的端口失败不作为产品错误；在允许回环的环境重新运行后全通过。
- JavaScript：108 个回归用例在 Node REPL 中执行通过；修改模型提示后的相关五项重新通过。发布 CI 继续使用原生 `node --test tests/*.test.cjs`。
- 九种交互模型的静态默认值与 JavaScript 计算逐项核对一致。
- 使用构建打包函数生成 ZIP，在干净目录检查后训练 44 条、llm-d 64 条、MoE 53 条教学命令。学生 TODO 尚未完成时的拒绝是预期结果，参考实现须通过。
- 校验课程 schema、路径分组、离线导出、资料链接格式、作品引用及静态构建。
- 浏览器检查新岗位筛选、课程元数据、中文/英文切换、交互滑块反馈与手机宽度阅读；MoE 小数值保持可见精度，页面无横向溢出。

交叉审查修正了三项教学细节：流水线模型明确每批不可重叠的同步屏障；MoE 分配模型显式换算百分数并提示不可实现的 top-k 分布；后训练有效吞吐明确串行无间隙假设，并说明并发必须使用独立墙钟窗口。

## 后续选题

FlashInfer 算子、多模态 vLLM-Omni 和 NIXL 传输层未纳入本次发布。前两项适合后续进阶选修；NIXL 优先作为现有 Mooncake/LMCache/Dynamo 的跨课程实验。新增真实框架实验时，先完成固定环境、正确性检查和可保存的原始证据，再添加对应验证标记。

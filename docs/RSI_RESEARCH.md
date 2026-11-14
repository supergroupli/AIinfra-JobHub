# RSI Infra 课程选题与证据范围

资料核对：2026-11-14 UTC。课程 ID：`rsi-infra`，20 个学习单元、20 张流程图、40 道带解析题、3 种交互模型。每单元建议 90–150 分钟，可按基础延长。作为本站三条路线的共同进阶必修，建议先完成系统基础与相应岗位核心课；这是课程设计，不是对所有招聘岗位的入职要求判断。

## 术语与教学目标

RSI 在这里指 Recursive Self-Improvement（递归自我改进）。研究和产业中对其强弱形式并无单一实现标准。课程明确区分：固定算法自动调参、可重复实验流水线、根据反馈改变提案机制，以及需要更强长期证据的递归自我改进。不能仅凭循环执行或一次速度提升，就宣称实现了通用自主进化。

结课目标是实现并解释一个有明确边界的改进控制器：固定任务契约，提出有限候选，独立验证，记录预算与身份，使用训练经验改变候选顺序，按同预算在未用于选择的任务上检查迁移，再演示本地晋升与回滚。主要学习价值在控制变量、判断证据和复核结论。

## 核对的一手资料

| 资料 | 课程如何使用 | 不作的推断 |
| --- | --- | --- |
| [InfraRSI 预印本 v1](https://arxiv.org/abs/2611.11558v1)，2026-11-08；[作者仓库](https://github.com/TokenRhythm/InfraRSI) | 讨论训练基础设施优化中的固定任务契约、搜索、确认与经验转移，识别目标系统与改进器的层次 | 论文的硬件结果是作者报告，本站没有复现其多卡实验；预印本不等于独立验证 |
| [AlphaEvolve 官方介绍](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/)，2025-05-14 | 理解候选程序、自动评价和程序库构成的演化搜索 | 不把本站配置枚举器称为 AlphaEvolve 复现，也不继承官方应用的收益数字 |
| [Darwin Gödel Machine 官方介绍](https://sakana.ai/dgm/)，2025-05-30 | 对照修改目标程序与修改 agent 本身，区分经验评价与形式化保证 | 本课不自动重写自身源码，不声称证明开放式递归增益 |
| [ShinkaEvolve 官方仓库](https://github.com/SakanaAI/ShinkaEvolve) | 理解候选群体、历史与选择策略的关系；源码阅读前记录实际 commit | 主分支是滚动资料；课程不要求安装它或调用付费模型 |
| [无问芯穹推理优化实践](https://www.infinigence-ai.com/news-updates/253.html)，2026-11-12 | 引出局部算子优化与完整引擎的差异，以及数值、状态、实际执行路径和不同负载的验证 | 不把单算子速度直接推导为服务速度；厂商结果不是本站个人作品 |
| [scikit-learn 数据泄漏说明](https://scikit-learn.org/stable/common_pitfalls.html) | 借助成熟评估原则解释搜索、验证和最终留出的不同用途 | 本课任务划分不是实际训练神经网络；文件名不能保证独立性 |
| [Python 计时](https://docs.python.org/3/library/time.html#time.perf_counter)、[子进程](https://docs.python.org/3/library/subprocess.html)、[哈希](https://docs.python.org/3/library/hashlib.html) | 计时边界、执行控制与内容身份的基础接口 | timeout 不等于沙箱；哈希不证明结果正确；CPU 时间不等于 GPU 时间 |
| [Google SRE 发布工程](https://sre.google/sre-book/release-engineering/)、[过载处理](https://sre.google/sre-book/handling-overload/) | 版本与受控发布、有限资源和失败处理的工程背景 | 本地指针回滚不证明真实集群或数据迁移恢复成功 |
| [vLLM 可重复性文档](https://docs.vllm.ai/en/latest/usage/reproducibility/)、[SGLang 文档](https://docs.sglang.ai/) | 第17天把固定版本、负载与验证项映射到目标引擎 | 只生成设计清单，不执行安装或GPU命令，不声称框架兼容性已实测 |

[awesome-rsi-infra](https://github.com/usail-hkust/awesome-rsi-infra) 作为发现原始资料的导航，不用其收录或 star 数证明研究成熟度、招聘热度或性能结论。课程解释和算例为本站原创，逐项阅读链接提供进一步核查入口。

## 二十天能力安排

| 天数 | 学习成果 |
| --- | --- |
| 1–5 | 分清两层改进；定义契约与数据划分；建立基线；用独立 oracle 发现错误候选 |
| 6–10 | 说明执行权限边界；核算失败预算；理解有限搜索；检查配对计时；先可行再比较多目标 |
| 11–15 | 记录血缘；重放与去重记账；识别评测投机；建立训练经验；显式更新提案策略 |
| 16–20 | 同预算消融；保留负迁移；设计真实引擎接入；演示晋升回滚；完成可复核报告 |

## 实验是什么、不是什么

标准库任务计算 `sum(i*i for i in range(n))`。候选是循环、正确闭式公式、故意写错的公式，以及受限的缓存/批量配置；独立循环参照检查结果。白名单验证不执行任意提交代码，不建立生产容器沙箱。

第4与第9天实际运行 Python CPU 计时，保留原始样本。其他成本/内存来自公开教学假设，使用标为模型单位的 ms/bytes；不得包装为硬件测量。第17天仅为设计。第18天只切换本地版本身份，未部署服务。实验不运行完整 InfraRSI、AlphaEvolve、ShinkaEvolve 或 DGM，也不调用 LLM。

默认第16天在相同总预算下，`heldout_cost_difference_ms = cold − warm = −4.0`，表示经验方案模型成本高4，负迁移被保留。它用于训练学生控制变量和报告不利结果，而不是通过改测试集制造正结论。教学 fixture 对学生可见；真正独立的结课评价需要另一组尚未用于开发或选择的数据，以及实际独立复现记录。

交互模型同样是显式假设：预算模型按失败也消耗同样成本计算期望成功数；Amdahl 模型固定其余开销；误报模型假设各次独立同分布。它们辅助手算，不是实际RSI系统的预测器。

## 内容维护

源文档中的 `latest` 和主分支会变化。后续引入真实框架命令时须固定 release/commit、模型 revision、环境和测量范围，另行留下执行证据。维护时同步检查20日命令、输出字段、40题解析、3种交互假设和新旧备份兼容性；不得把仅核对资料升级为“框架已复现”。

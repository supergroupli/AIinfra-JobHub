# 聘枢 AI Infra 技术地图与学习库选题

核对日期：**2026-11-13**。这是一份课程选题调研，不是招聘需求排行或技术市场份额统计。所谓“值得优先学习”，在这里指：问题具有代表性、官方资料可访问、能形成可验证作品、与相邻系统有明确接口。没有用 GitHub star 数代替产业需求，也没有把项目自报的性能结果当成通用结论。

## 先建立技术地图，再选择项目

AI Infra 不是推理框架的同义词。学习库应把模型执行、缓存、通信、算子、分布式训练和平台运维连接起来。初学者先学请求与资源模型，再选择一个岗位方向；不要求一个人连续学完全部路线。

| 层次 | 代表性体系 | 解决的问题 | 适合的作品与岗位方向 |
| --- | --- | --- | --- |
| 推理引擎 | vLLM、SGLang | 请求调度、模型执行、显存管理与服务接口 | 可复现服务和负载报告；推理工程、性能工程 |
| KV cache 管理 | LMCache、SGLang HiCache | 缓存复用、容量分层、引擎与外部存储衔接 | 冷热缓存对照与成本边界；缓存/推理工程 |
| 数据传输与共享缓存 | Mooncake、NIXL | 将状态从一个位置传到另一个位置；共享状态的存取 | 正确性测试、拓扑与吞吐报告；分布式系统、存储、网络 |
| 分布式推理平台 | NVIDIA Dynamo、llm-d、Ray Serve | 路由、扩缩容、部署与工作负载管理 | SLO、容量和故障实验；平台工程、推理 SRE |
| GPU 算子与编译 | CUDA、Triton、FlashInfer | 将算子计算映射到硬件，优化内存访问和执行效率 | 有精度校验的 kernel 基准；GPU/编译器工程 |
| 分布式训练与通信 | PyTorch Distributed/FSDP、NCCL、DeepEP | 参数/梯度分片、集合通信、MoE token 分发与聚合 | 扩展效率和通信分析；训练系统、通信工程 |
| 训练与推理协同 | Ray Train、verl 等 | rollout、训练、权重更新与异步资源调度 | 小规模训练/rollout 数据流说明；后训练平台工程 |

这是教学划分，不是互斥的产品分类。一个项目可能覆盖多个层次；例如 Mooncake 已有训练相关集成，Dynamo 也能与不同推理引擎、缓存组件组合。选择某项技术，不意味着必须采用它的全部组件。

## 本轮优先形成的路线

| 优先级 | 路线 | 为什么现在选 | 先修与资源 | 10 天后的合理成果 |
| --- | --- | --- | --- | --- |
| P0 | 推理系统基础 | 所有服务、缓存与平台实验需要相同的指标语言 | Python、基本 Linux；CPU 可完成 | 请求生命周期、资源预算与负载设计 |
| P0 | vLLM | 用一个服务串起模型、显存、调度与基准测试 | Python、HTTP；真机实验需匹配硬件 | 一份可复现推理服务与性能复盘 |
| P0 | SGLang | 可从服务基线深入前缀复用、HiCache 与 PD 分离 | 先完成基础或 vLLM 路线；真机可从小模型开始 | 工作负载驱动的优化实验 |
| P0 | LMCache | 将“缓存命中”拆解为身份、分块、分层、传输与端到端收益 | 熟悉一个引擎、KV cache；CPU 可做成本模型与部分服务练习 | 一份缓存方案选择与兼容性验证报告 |
| P0 | Mooncake | 官方提供 Transfer Engine 与 Store 资料，并有 vLLM/SGLang 集成路径 | Python、进程、网络和内存基础；CPU/TCP 可做入门，RDMA 需对应设备 | 传输正确性、性能边界与集成设计 |
| P1 | NVIDIA Dynamo | 官方资料把引擎之上的路由、控制与状态管理串起来，且有 Mocker/DynoSim | 熟悉一个推理引擎；容器/Kubernetes 基础；模拟可不用 GPU | 路由/容量/SLO/故障的综合评估 |
| P1 | Triton 与 GPU 性能基础 | 与具体大模型框架分离，建立算子正确性和测量方法 | Python、张量与线性代数；GPU 用于真实性能测试 | 一个有误差界限与基准脚本的优化算子 |
| P1 | Kubernetes / Ray Serve / 分布式训练基础 | 为平台和训练岗位补足服务部署、资源、通信与弹性概念 | Linux、容器、Python；可拆分 CPU 练习与 GPU 扩展 | 可读的部署/训练配置与故障或扩展性报告 |

P0/P1 表示本社区的课程建设顺序，不是技术优劣评分。岗位方向是根据课程工作内容做的教学映射，没有声称获得雇主认可、招聘承诺或技能认证。

## 本轮四个扩展项目的依据

### SGLang：推理引擎与前缀复用

官方资料覆盖部署、负载测试、量化、HiCache、PD 分离和可观测性，适合把“功能开关”转成“在何种负载下值得开启”的实验。课程先保持统一模型、tokenizer 和请求分布，再逐项改变变量。当前官方入口为 [SGLang Documentation](https://docs.sglang.io/)，服务起步见 [Quickstart](https://docs.sglang.io/docs/get-started/quickstart)，测量入口见 [Bench Serving Guide](https://docs.sglang.io/docs/developer_guide/bench_serving)。

限制：硬件、量化格式、attention backend、模型架构和并行方式的组合不能只凭“支持某功能”判断兼容。按实验所用 release/commit 记录配置，避免把滚动文档的示例直接称为已复现。缓存课程需区分文本相同、token 前缀相同和可重用状态相同。

### LMCache：把缓存复用变成可评估的系统设计

官方主线文档当前围绕独立 multiprocess 服务组织；兼容性分为运行时/ABI、connector 加载以及具体模型与功能三个层面。课程因此把版本清单和正确性实验放在性能实验之前。依据：[Compatibility](https://docs.lmcache.ai/getting_started/compatibility.html)、[Quickstart](https://docs.lmcache.ai/getting_started/quickstart.html)、[MP Overview](https://docs.lmcache.ai/mp/index.html)。

限制：第二次请求更快，并不能单独证明命中外部缓存；引擎自己的本地缓存、预热和请求队列都可能影响结果。必须隔离本地缓存状态并观察外部 retrieve 证据。命中率高也未必降低端到端延迟，要把查找、读取、传输和阻塞计入预算。缓存身份设计也不是访问控制的替代品，见 [Cache identity tags](https://docs.lmcache.ai/developer_guide/cache_identity.html)。

### Mooncake：先区分 Transfer Engine 与 Store

Transfer Engine 关注已注册缓冲区之间的数据移动；Store 提供对象与元数据层面的存取。官方资料明确区分 PD 直接传输与共享 KV 缓存池两条集成路径，并给出无需 RDMA 的两进程 CPU/TCP 示例。依据：[Quick Start](https://kvcache-ai.github.io/Mooncake/getting_started/quick-start.html)、[Transfer Engine](https://kvcache-ai.github.io/Mooncake/design/transfer-engine/index.html)、[Mooncake Store](https://kvcache-ai.github.io/Mooncake/design/store/mooncake-store.html)。

限制：TCP 练习能验证 API 与内存生命周期，不能代表 RDMA/GPU 的吞吐。多副本、主节点恢复、持久化和可用性是不同保证，需要按当前版本与具体配置分别检查。不要用发布页面中的峰值带宽替代自己的消息大小、拓扑和并发实验。框架集成见 [SGLang](https://kvcache-ai.github.io/Mooncake/deployment/integrations/sglang/index.html)、[vLLM](https://kvcache-ai.github.io/Mooncake/deployment/integrations/vllm/index.html)。

### NVIDIA Dynamo：引擎之外的推理平台

官方架构区分请求、控制与状态传播；可以从聚合部署逐渐引入 KV-aware 路由、PD 分离和规划器。Mocker/DynoSim 为无 GPU 的控制逻辑与配置实验提供入口，但不执行真实模型计算。依据：[Architecture](https://docs.nvidia.com/dynamo/latest/knowledge-base/overview)、[Local Guide](https://docs.nvidia.com/dynamo/cli/getting-started/introduction)、[DynoSim](https://docs.nvidia.com/dynamo/latest/knowledge-base/concepts/simulation/overview)。

限制：引擎后端、硬件和功能覆盖随版本变化；侧车等标为 experimental 的路径不应当作完整替代。模拟结果取决于模型和参数，不能声称达到真机 SLO。初版课程应先学部署边界与可回退的实验，再进入 Kubernetes 资源变更。依据：[Compatibility](https://docs.nvidia.com/dynamo/reference/compatibility)、[Kubernetes Guide](https://docs.nvidia.com/dynamo/kubernetes/getting-started/introduction)。

## 值得继续扩展，但不混成一门“全栈课”

- **llm-d**：Kubernetes 原生推理栈，适合已有 Kubernetes 基础者。与 Dynamo 是相邻平台路线；先让学习者理解 Router、InferencePool 和 Model Server 的关系，再讨论替换与组合。参考 [llm-d architecture](https://llm-d.ai/docs/0.9/architecture)。
- **Ray Serve / Train**：适合 Python 分布式应用、多模型服务和训练工作流，不能与底层推理引擎等同。参考 [Ray Serve LLM](https://docs.ray.io/en/latest/serve/llm/)、[Ray Train](https://docs.ray.io/en/latest/train/train.html)。
- **FlashInfer**：把注意力 kernel 接口、张量布局、精度和基准测量连接起来；先掌握 GPU 与张量基础。参考 [Attention Kernels](https://docs.flashinfer.ai/api/attention)。
- **DeepEP**：适合 MoE 与通信方向进阶学习，重点是 dispatch/combine 的数据布局与通信成本，不把一个通信库当作完整训练框架。参考 [DeepEP 官方仓库](https://github.com/deepseek-ai/DeepEP)。
- **PyTorch FSDP2**：适合学习参数分片、通信与内存的取舍。选择与所装 PyTorch 对应的稳定版文档，区分 main 文档和实际 release。参考 [FSDP2 API](https://docs.pytorch.org/docs/main/distributed/fsdp.fully_shard.html)。

## 课程质量门槛

每门课固定 10 天结构，但每天时长和先修要求明确写出。课程目标是完成一轮系统学习和一份可验证作品，不是“10 天达到资深生产水平”。

每一天必须包含：概念解释、一个可执行的任务、可提交的证据、2–3 条验收条件、官方阅读链接，以及无 GPU 时仍可完成的替代任务。模拟、纸面设计和真机结果在作品中必须分开标注。课程完成进度是自我记录；有他人复现或点评后才能额外描述那份证据，不能用打卡生成能力认证。

首批发布后，应由有相应环境的贡献者提交复现记录，记录硬件、框架 release/commit、模型 revision、驱动、配置、输入数据和失败案例。维护者定期复核来源与过时命令，优先修复阻碍完成课程的问题，再增加新技术数量。学习者数据与招聘结果只在自愿授权下收集。

## 本次来源复核记录

2026-11-13 对四门扩展课程的 `reading` / `resources` 去重后共 **44 个 URL**，加上本调研独有的 **8 个 URL**，共核对 **52 个官方来源**。通过联网读取核对页面标题与内容；课程中的 44 个链接均能读取对应官方页面。调研中 PyTorch FSDP2 的旧 main 路径返回空内容，已换成官方当前的具体 API 页面。LMCache 存储后端页曾出现一次工具读取错误，之后从官方主页进入及直接重试均成功，未将它误判为坏链接。当前文件中的链接没有剩余的无法验证项。

关键事实复核：SGLang 当前 quickstart 使用 `sglang serve`；LMCache 当前主线采用独立 MP 服务，兼容性需分别检查运行时 ABI、连接器和模型/功能；Mooncake 官方 Transfer Engine 示例支持 CPU/TCP 两进程传输；Dynamo 的 Mocker/DynoSim 提供模拟，不能代替目标硬件上的验证。课程均保留对应官方阅读入口。

这里的核对日期与课程 `lastVerified` 是编辑检查日期，不是项目发布日期。滚动文档和 `main` / `latest` 页面可能后续变化；学习者仍需固定实际使用的 release/commit，并记录本地复现结果。

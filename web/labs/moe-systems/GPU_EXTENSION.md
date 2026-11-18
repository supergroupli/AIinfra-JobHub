# GPU extension plan / GPU 扩展方案

**Not executed by this course / 本课程未执行 GPU 扩展。**

Source review date: **2026-11-18**. Public `git ls-remote ... HEAD` returned:

| Project | Pinned source revision |
| --- | --- |
| DeepEP | `f6aa38fe06cd4a0489e7730365d4e0114970a2f3` |
| DeepGEMM | `5081f8513af57e61696de4f4f04b0e707ffb503e` |

The commits identify source baselines, not tested compatibility between both projects. No Python package named DeepEP or DeepGEMM is required for the CPU course.

上述 commit 固定阅读与复现起点，不表示已经验证两库兼容。CPU 必做路线不需要安装这两个项目。

## Inspect before running / 先核对，再执行

Open the README and tests **at the pinned revision**, especially the build requirements, supported architectures and dtype/layout contracts:

- [DeepEP pinned source](https://github.com/deepseek-ai/DeepEP/tree/f6aa38fe06cd4a0489e7730365d4e0114970a2f3)
- [DeepGEMM pinned source](https://github.com/deepseek-ai/DeepGEMM/tree/5081f8513af57e61696de4f4f04b0e707ffb503e)

The currently reviewed DeepEP V2.5 README removes V1 APIs and its NVSHMEM backend. It lists Linux, Python 3.10+, Hopper-or-newer GPUs, CUDA 13.1+, PyTorch 2.10+, NCCL 2.32.3+, a C++20 toolchain, NVLink for intranode and RDMA for internode communication. DeepGEMM's reviewed README lists SM90/SM100, CUDA 12.9+, PyTorch 2.3+, C++20 and CUTLASS 4.0+. Individual kernels can require more. The two projects' minimum-version lists are **not** a tested joint environment; follow the corresponding pinned files if they differ from the moving README.

当前查阅的 DeepEP V2.5 已移除旧 API/NVSHMEM 后端。不同修订与不同内核的要求可能不同；应以上述固定源码的 README、测试和依赖清单为准。不要把两份最低要求简单拼在一起后宣称兼容，更不要把旧教程命令直接套到新版。

The following commands only obtain the chosen sources and show their documentation. They require Git/network access and are optional; they do not execute GPU code:

以下可选命令仅获取固定源码并打印 README，需要 Git 与网络，不运行 GPU 算子。

```bash
git clone https://github.com/deepseek-ai/DeepEP.git
git -C DeepEP checkout f6aa38fe06cd4a0489e7730365d4e0114970a2f3
git -C DeepEP submodule update --init --recursive
git -C DeepEP rev-parse HEAD
git -C DeepEP show HEAD:README.md

git clone https://github.com/deepseek-ai/DeepGEMM.git
git -C DeepGEMM checkout 5081f8513af57e61696de4f4f04b0e707ffb503e
git -C DeepGEMM submodule update --init --recursive
git -C DeepGEMM rev-parse HEAD
git -C DeepGEMM show HEAD:README.md
```

Use fresh directories, inspect the pinned build scripts and run the relevant upstream correctness tests on suitable hardware before integration. Do not import old `Buffer`/`ElasticBuffer` snippets into a checkout whose interface is `EPBuffer`. This handout intentionally supplies no guessed multi-GPU launcher: upstream test launch conventions and topology must be checked in the selected revision.

使用新目录，阅读固定版构建脚本，先在匹配硬件上通过上游正确性测试，再做组合。启动方式应依据该修订的测试脚本及真实拓扑，不用未经验证的通用命令替代。

## Integration contract / 接入契约

Complete this table before combining kernels. Matching shape alone is insufficient.

| Item / 项目 | Record / 记录 |
| --- | --- |
| Input | Token count, hidden size, strides, device, dtype / 数量、维度、步长、设备与类型 |
| Routing | Top-k, normalization, expert IDs, token IDs, overflow policy / 路由与溢出语义 |
| Dispatch output | Per-expert row layout, padding, valid-row masks / 每专家行布局与有效掩码 |
| Quantization | Scale grouping, scale dtype, layout, conversion error / 缩放粒度、类型、布局与误差 |
| Expert computation | Selected GEMM interface, expected dimensions, accumulation / 算子接口及累加方式 |
| Combine | Weight application exactly once, token mapping, independent oracle / 权重只应用一次及独立参照 |
| Synchronization | Producer/consumer events, buffer lifetime, timing boundaries / 数据依赖、缓冲生命周期、计时边界 |

## Evidence required / 运行证据

Record exact commits including submodules, dependency versions, GPU count/model, NVLink/RDMA topology, inputs and routing distribution. Preserve raw correctness errors, tolerance choice, warmup, synchronized timing samples and failures. Compare equal workloads and report regressions. Separate dispatch, GEMM, combine and end-to-end measurements. If asynchronous work is timed, ensure completion is included in the stated scope.

记录完整源码及子模块版本、依赖、GPU与网络拓扑、输入和专家分布。保留误差、预定容差、预热、正确同步后的原始时间、失败和退步；分别报告分发、计算、聚合与端到端。没有执行的项目标为计划，不填假日志或假吞吐。

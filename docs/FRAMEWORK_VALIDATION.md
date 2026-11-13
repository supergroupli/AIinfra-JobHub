# 真实 CPU 框架实验验证 / Real CPU framework validation

实验与网站使用相同仓库源码。平台验证只记录指定commit、环境和实验范围；学生自己的运行结果仍需另存，源码下载和课程勾选不代表完成实测。

Evidence applies to the recorded commit, environment and scope only. Students should retain their own execution records. Downloading source or checking a lesson does not establish a real run.

## 目前状态 / Current status

2026-11-13，以下三项在GitHub Ubuntu CPU runner上实际执行并通过。运行：[43455249219](https://github.com/supergroupli/AIinfra-JobHub/actions/runs/43455249219)；源码commit：`28b14e7892a875cdee959ad8d8efb41408a3a3e9`。实际Python为3.11.18；Ray为2.60.0，PyTorch为2.6.0+cpu。已逐字段检查原始JSON，并核对运行时源码SHA256与仓库实验脚本一致。

All three checks passed on the GitHub Ubuntu CPU runner on2026-11-13. The linked run records the exact source commit; actual Python was3.11.18, Ray2.60.0 and PyTorch2.6.0+cpu. Raw JSON fields and runtime source hashes were checked against the repository scripts.

| 实验 / Experiment | 固定环境 / Target | 验收 / Acceptance |
| --- | --- | --- |
| Ray Core | Ubuntu22.04 x86_64、Python3.11、Ray2.60.0 | 8个真实任务输出正确，sum140，pending≤2，错误输入被保留 / Eight correct tasks, bounded pending, visible invalid-input failure |
| Ray Serve | 同上，安装ray[serve] / same, with Serve extras | 六个实际HTTP请求，2×200+4×400，保留请求/响应 / Six actual HTTP requests, status and bodies retained |
| PyTorch Gloo DDP | Ubuntu22.04 x86_64、Python3.11、torch2.6.0 CPU | 两rank四步更新匹配全局基线，checkpoint+optimizer恢复一致，漏恢复对照不同 / Two ranks match the global baseline and complete recovery; weights-only control differs |

永久保存的原始记录 / Preserved raw evidence:

- Ray：[Core JSON](../web/labs/ray/validation/2026-11-13/core.json)、[Serve JSON](../web/labs/ray/validation/2026-11-13/serve.json)、[依赖快照 / dependencies](../web/labs/ray/validation/2026-11-13/environment.txt)、[哈希清单 / manifest](../web/labs/ray/validation/2026-11-13/manifest.json)。Core sum=140，peak_pending=2；Serve状态为200,200,400,400,400,400。
- Gloo：[rank0](../web/labs/pytorch-distributed/validation/2026-11-13/rank-0.json)、[rank1](../web/labs/pytorch-distributed/validation/2026-11-13/rank-1.json)、[依赖快照 / dependencies](../web/labs/pytorch-distributed/validation/2026-11-13/environment.txt)、[哈希清单 / manifest](../web/labs/pytorch-distributed/validation/2026-11-13/manifest.json)。两rank完整/恢复权重均约2.053；未恢复optimizer的对照约1.955。

上述文件保留CI产物原字节，不含临时checkpoint或用户数据。它们也随对应实验ZIP提供。原始运行日志可在Actions查看；artifact会过期，仓库中的上述文件则保留在版本历史。此处为平台验证，尚无第二位独立学习者复现的记录。

These files preserve original artifact bytes and ship with the lab ZIPs; no temporary checkpoint or user data is included. Actions holds the original logs. Artifacts expire, while these files remain versioned. This is platform validation, with no independent learner reproduction claimed.

没有GPU、NCCL、RDMA、多节点、FSDP或吞吐验证。流水线仅检查小型CPU正确性，未证明生产可靠性、学生个人能力或其他机器都能复现。

No GPU/NCCL/RDMA/multi-node/FSDP or throughput validation. This small CPU correctness workflow does not establish production reliability, individual ability or success on every machine.

## 自己运行 / Reproduce

Ray实验包：新建Python3.11环境，安装`ray[serve]==2.60.0`；在实验目录运行：

```sh
python real_ray.py --out out/core.json
python verify_serve.py --out out/serve.json
```

PyTorch实验包：另建Python3.11环境，使用官方CPU源安装`torch==2.6.0`，运行：

```sh
torchrun --standalone --nproc-per-node=2 ddp_example.py --backend gloo --out out/gloo
```

完整安装、结果解释和失败处理在各实验包README。使用全新目录保存不同运行，不用自己未运行的数据填充报告。

See each lab README for installation, result interpretation and failures. Keep runs in separate output directories and label data you did not execute yourself.

## 维护者验证 / Maintainer workflow

在GitHub Actions手动运行 [Verify real CPU framework labs](https://github.com/supergroupli/AIinfra-JobHub/actions/workflows/framework-labs.yml)。两个job分别安装依赖；总job限制15分钟，单实验设timeout，失败仍上传现有日志与JSON。权限仅contents:read，实验不使用API密钥或用户数据。工作流不会自动触发付费GPU或模型下载。

Run the workflow manually from Actions. Separate jobs install dependencies; each has a15-minute limit, bounded experiment commands and failure artifacts. Permissions are contents:read. No credentials, user data, paid GPU or model downloads are used.

原始artifact保留30天；维护者应在发布“已验证”结论前保存以下公共证据到版本化验证记录：运行URL、commit、平台/Python/依赖快照、core.json、serve.json、两个rank JSON和必要日志摘要。不要把失败的job或仅pip安装成功写成实验通过。重新验证产生新记录，不覆盖旧结论的环境条件。

Artifacts expire after30 days. Before publishing a verified claim, preserve the run URL, commit, platform/Python/package snapshot, core/serve/rank JSON and relevant log excerpts in a versioned public record. A failed job or successful install alone is not a passed experiment. New runs should retain their own conditions.

## 官方依据 / Official references

资料核对日期：2026-11-13 / References checked:2026-11-13.

- [Ray local startup](https://docs.ray.io/en/latest/ray-core/starting-ray.html)
- [Ray Serve start](https://docs.ray.io/en/latest/serve/api/doc/ray.serve.start.html)
- [Ray Serve run](https://docs.ray.io/en/latest/serve/api/doc/ray.serve.run.html)
- [PyTorch version-specific installation](https://pytorch.org/get-started/previous-versions/)
- [DDP tutorial](https://docs.pytorch.org/tutorials/intermediate/ddp_tutorial.html)

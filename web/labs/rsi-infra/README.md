# RSI Infra: a bounded improvement harness / 可核查的改进闭环

Python **3.9+**, standard library only. No GPU, model weights, account, API key, internet connection or third-party package is required. Unzip the **whole** package, enter the `rsi-infra` directory containing `lab.py`, then run:

只需 Python **3.9+** 标准库。完整解压后进入含 `lab.py` 的 `rsi-infra` 文件夹。Windows 可将 `python3` 换成 `py -3`。

```bash
python3 --version
python3 lab.py day1 --out out
python3 lab.py day4 --repetitions 7 --out out
python3 lab.py day16 --budget 8 --seed 7 --out out
python3 lab.py day20 --out out
```

`day1` through `day19` are independent, reproducible exercises; they do not require a previous day's output. `day20` runs days 1–19 again and writes the final report, manifest and `day20.json`. Reusing an output directory replaces its generated records. **Use separate output directories for comparisons.** Nothing submits, applies or deploys a change to a service.

`day1` 至 `day19` 可独立运行，不依赖上次命令遗留的状态。`day20` 重新执行前 19 天并生成最终报告。使用相同输出目录会覆盖本次实验的旧文件；对照实验应使用不同目录。所有操作只生成本地学习记录，不会把改动提交或部署到任何服务。

## What actually runs / 实际运行了什么

The task computes `sum(i*i for i in range(n))`. An independent range-based reference checks every output. Candidates choose from a finite allowlist: a loop, a correct closed form, a deliberately incorrect off-by-one formula, cache capacity and batch size. No arbitrary candidate source, shell, model-generated code or `eval` is executed.

任务是计算整数平方和。独立的循环参照逐个检查输出，候选包括普通循环、正确闭式公式和故意写错的公式。配置仅能选择已声明的算法、缓存容量及批量大小。这个白名单用于教输入和权限边界，**不等于容器或进程级沙箱**。

- **Day 4 and 9:** actual Python CPU timings using `perf_counter_ns`, warmup and shuffled paired order. Raw samples are preserved. Results vary by machine; no fixed speedup, confidence interval or GPU conclusion is claimed.
- **Other cost/memory numbers:** a deterministic teaching model. Loop cost is `max(1,n/10)`, formula cost is `1`, a cache hit costs `0.1`, each batch has overhead `2`, and modeled memory is `128*cache_size + 256*batch_size`. These are **assumed units labelled ms/bytes**, not measured hardware costs.
- **Day 17:** design only. No vLLM/SGLang installation or GPU execution occurs.
- **Day 20:** mixed evidence. The report leaves sections for the learner's own hypothesis, change, interpretation and fresh-holdout reproduction.

第 4、9 天真实测量本机 Python 运算时间；其余日课的成本/内存为明确假设的模型，第 17 天为迁移设计。报告生成不能代替本人解释，更不构成能力认证或真实框架性能复现。

## Twenty experiments / 二十个实验

Every row uses `python3 lab.py dayN --out out`. The corresponding file is `out/dayNN.json`.

| Day | Inspect / 检查 | Independent change / 独立变更 |
| --- | --- | --- |
| 1 | baseline/candidate results, exact output checks, modeled cost ratio | Predict whether the candidate still fits at `--memory-limit 512`; run into a separate directory. / 先预测 512 B 约束下是否仍可接受。 |
| 2 | frozen contract and changed-contract hash | Change only the memory budget; explain why a new contract cannot be compared as the same task. / 改预算，解释为何已不是同一契约。 |
| 3 | train/validation/holdout IDs and hashes | Copy the fixture and accidentally reuse a task ID across splits; confirm rejection, then fix it. / 制造跨集合 ID 重复并修复。 |
| 4 | raw CPU timing pairs and exact correctness | Compare 7 versus 15 repetitions with separate outputs; do not replace an unfavorable run. / 比较 7 与 15 次重复并保留原始数据。 |
| 5 | correct and deliberately broken candidates on boundary inputs | Add a boundary value to a copied fixture, then run day1/16; independently hand-check its expected square sum. / 增加边界输入并手算。 |
| 6 | three rejected proposals versus an accepted finite config | Read `config()` and add a test for an unknown field before extending the allowlist. / 为未知字段先写拒绝测试。 |
| 7 | every attempted trial, including rejected-memory/correctness | Change `--budget 8` to `--budget 12`; predict remaining units and count failed-trial cost. / 改预算并核算失败成本。 |
| 8 | seeded proposal order and candidate hashes | Compare seeds 7 and 8; explain why random ordering is not evidence of a smarter proposer. / 比较种子及排序差异。 |
| 9 | shuffled paired timings and paired differences | Compare medians with raw differences and explain what the small sample does not establish. / 检查配对差值及小样本局限。 |
| 10 | correctness gates followed by the cost/memory Pareto set | Increase memory limit to 2048; identify newly feasible candidates and changed Pareto points. / 放宽内存后检查可行域。 |
| 11 | parent/config/data versions and trial provenance | Change one input in a copied fixture; verify data hash changes without pretending code changed. / 改输入并区分数据/源码版本。 |
| 12 | interrupted journal replay; identical retry charged once | Add a conflicting payload with the same trial ID in a unit test and confirm it is rejected. / 相同 ID 不同内容必须拒绝。 |
| 13 | forged candidate claim rejected by independent checks | Explain why trusting a candidate's self-reported speed/correctness changes the objective. / 解释为何不能自报自验。 |
| 14 | training-only experience including failures and provenance | Inspect which evidence came from the training split and why validation/holdout must not enter it. / 核对经验来源。 |
| 15 | old/new proposer policy and explicit learned group priors | Modify training inputs only, compare priors, and freeze the policy before inspecting holdout. / 改训练输入后先冻结策略。 |
| 16 | both arms' complete ledgers, final choices and holdout | Compare a preregistered second seed or new untouched dataset at the same total budget; report regressions. / 同总预算用预先约定的种子复核，保留退步。 |
| 17 | engine migration contract; `engine_commands_executed=false` | Map one check to your pinned engine's official documentation; label every unexecuted check as a plan. / 固定引擎版本并映射检查。 |
| 18 | eligibility, local version-pointer promotion and rollback | Lower memory to 512 and confirm the candidate cannot be promoted; check restored baseline pointer. / 降预算确认拒绝与回滚。 |
| 19 | correctness failure, memory rejection and allowed result | Explain why failed trials remain in the ledger and why a positive mean is insufficient. / 解释失败为何必须保留。 |
| 20 | all daily reports, `REPORT.md`, source/input/output manifest | Make one independent change, rerun from a fresh output directory and write your own conclusions. / 独立改动、干净复现并写结论。 |

## Equal-budget comparison / 同总预算比较

Day 16 charges **both** arms for the same initial training evaluations (`budget//2`), validation selection (`budget-budget//2-1`) and one final holdout evaluation. A failed attempt still costs one synthetic unit. The control arm collects but discards the same training experience; the treatment arm uses it to rank algorithms. This controls total declared evaluation count, not real GPU time or dollars. Setup, measurement and Python execution overhead remain outside that model and must be accounted for separately in a real system.

第 16 天两组都付出同样的训练评估、验证选型和一次最终留出检查成本。对照组收集但不利用训练经验，实验组利用它排序；失败尝试同样计费。默认 `--budget 8 --seed 7` 下，两组都是 8 单位，而经验组在留出模型成本上 **反而慢 4 ms**。这是一个有意保留的有效负结果：复用经验不保证跨负载收益。

All fixtures are openly readable for education. Calling one a holdout denotes its use in this protocol; it is **not a secret-data security boundary**. After inspecting a holdout result, do not tune on it and call the next result independent. Create a fresh, untouched set. The experiment updates a bounded proposer from measured feedback; it does not establish open-ended recursive self-improvement.

## Input and output / 输入输出

Copy `fixtures/workloads.json`, change one input, preserve its version and three splits, then run:

```bash
python3 lab.py day16 --input my-workloads.json --seed 7 --budget 8 --out out/changed
python3 lab.py day20 --input my-workloads.json --out out/reproduction
```

Limits: input ≤1 MiB; each split 1–16 tasks; each task 1–64 integers in 0–5000; globally unique task IDs. CLI bounds: seed 0–1000000, budget 4–100, memory 256–1048576, repetitions 3–31. Invalid data fails explicitly. The output directory must be separate from the source directory and fixtures; output-file symlinks are rejected. This does not claim OS-level confinement of arbitrary user code.

`manifest.json` identifies the actual input bytes, `lab.py`, Python version, arguments and generated daily/report files. SHA-256 detects changed content; it does not prove correctness or independent reproduction. The `completed_days` field in the generated day20 file means these lab commands executed, **not that a student completed the course**.

常见报错：`can't open file lab.py` 时检查工作目录；缺少 `fixtures` 时完整解压；`Invalid input` 时查看字段/边界，不要跳过错误后宣称通过；若无写权限，换一个本人可写的 `--out` 目录。

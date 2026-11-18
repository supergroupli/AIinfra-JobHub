# My post-training systems experiment / 我的后训练系统实验

## Question / 问题

What precise question did you test? What did you predict before running?
写明一个可检验的问题，以及运行前的预测。

## Environment and scope / 环境与范围

Python version, OS, source SHA-256, exact commands, configuration and output paths:
填写 Python、系统、源码哈希、完整命令、参数和输出路径。

Evidence types used: CPU scalar learning / modeled systems cost / unexecuted framework plan.
逐项标明：CPU 标量学习、合成系统成本、未执行框架设计。

## My implementation / 本人实现

Explain the three functions you implemented and a counterexample that would catch a wrong implementation. Include output from `python3 check_exercises.py` without `--reference`.
解释三个本人实现的函数及能揭露错误的反例，附学生模式检查输出。

## Controlled comparison / 对照

| Item / 项目 | Baseline / 基线 | Changed / 改动 |
|---|---|---|
| Single changed factor / 单一因素 | | |
| Configuration hash / 参数哈希 | | |
| Raw record path / 原始记录 | | |
| Observed result with units / 结果与单位 | | |
| Prediction correct? / 是否符合预测 | | |

## Failure and recovery / 故障与恢复

Explain a stale/future trajectory, a conflicting retry and the checkpoint-resume result. State which cases you changed and which were bundled examples.
解释陈旧/未来版本、冲突重试与恢复结果，区分自己的改动和内置算例。

## Conclusions and limits / 结论与局限

What is supported by raw evidence? What is not measured? Why does a scalar policy selecting a constructed answer not demonstrate arithmetic generalization?
哪些结论有原始证据，哪些没有测量？为什么选择构造答案的标量策略不能证明算术泛化？

## Next framework experiment / 下一步真实框架实验

Selected framework/tag/resolved commit, compatible dependencies, hardware, model/data revisions, planned command, acceptance criteria and unverified assumptions:
填写框架、标签与完整 commit、依赖、硬件、模型/数据修订、计划命令、验收标准和未验证假设。

# 推理压测复盘台 · Paired trace format

把下面的示例保存为 `trace.json`，在复盘台展开「使用自己的计时数据」并选择文件。示例窗口为一秒，A 和 B 都完成了请求。B 的首个内容块用了 150 ms，超过 120 ms 的目标。把首块目标调到 150 ms，两组的达标吞吐都变成 1 请求/秒。[打开复盘台](./)

Save the example as `trace.json` and select it under **Use my own timings**. Both runs finish the request within the one-second window. B takes 150 ms to deliver its first content chunk and misses the 120 ms target. Set the first-chunk target to 150 ms and both runs reach 1 qualifying request per second. [Open the lab in English](./?lang=en)

```json
{
  "schema": "jobhub-bench/v1",
  "source": "synthetic",
  "windowMs": 1000,
  "targets": { "ttftMs": 120, "e2eMs": 600 },
  "requests": [
    {
      "id": "R01",
      "group": "chat",
      "sentMs": 100,
      "a": { "status": "ok", "firstMs": 90, "endMs": 410 },
      "b": { "status": "ok", "firstMs": 150, "endMs": 380 }
    }
  ]
}
```

## 整理自己的记录

1. 为 A、B 重放同一批输入与到达时序，使用等长的观测窗口，保留两边的成功、超时和错误。用同一请求 ID 将两边配对，每行写一个匿名 ID 和一个分组，例如 `shared-prefix`。教学合成数据填 `synthetic`，自己采集的数据填 `measured`。
2. 用客户端单调时钟计时，统一换算为毫秒。`sentMs` 是从各自窗口开始到发送的时间。`firstMs` 是从该请求发送到首个含非空内容的响应块的时间，一个块可能包含多个 token。`endMs` 是从发送到客户端观察到完成、错误或超时的时间。窗口应涵盖最后一次请求的终止。
3. 每侧的 `status` 取 `ok`、`timeout` 或 `error`。成功时提供两项延迟。失败时若已有内容，保留首块延迟，若尚未收到内容则将 `firstMs` 写为 `null`。所有状态均须给出终止延迟。
4. 每个文件最多 4 MiB，含 1 至 2,000 对请求。ID 须唯一，ID 和分组须为非空文本、最多 80 个 UTF-16 代码单元且无 ASCII 控制字符。窗口至少 1 ms，时间为有限非负数，最大为 `Number.MAX_SAFE_INTEGER`。满足 `0 ≤ firstMs ≤ endMs`（有首块时）和 `sentMs + endMs ≤ windowMs`。两个目标均为 1 至 3,600,000 的整数毫秒。

**复算方法。** 请求成功且两项延迟都小于或等于各自目标，即计为达标。完成吞吐和达标吞吐分别用成功数、达标数除以同一个窗口秒数。P95 仅取该侧成功请求的延迟，升序排列后取第 `ceil(0.95 × 成功数)` 项（从 1 起算）。无成功请求时该值为空。

文件在当前标签页处理。下载的计时 JSON 包含请求 ID、分组和两侧的计时。分享前检查这些字段及自己在报告里写下的内容。将客户端日志整理成上述逐请求格式后即可导入。vLLM 的请求级目标和 AIPerf 的首块计时说明可供核对采样口径。[vLLM 压测参数](https://docs.vllm.ai/en/latest/cli/bench/serve/) · [AIPerf 流式指标](https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference)

## Preparing your own timings

1. Replay the same inputs and arrival schedule under A and B using equal observation windows. Keep successes, errors and timeouts. Pair observations by request ID, using an anonymous ID and a workload group such as `shared-prefix`. Set `source` to `synthetic` for teaching data or `measured` for observations collected by the data provider.
2. Use a client-side monotonic clock and convert all measurements to milliseconds. `sentMs` is the offset from the start of each run’s window. `firstMs` is elapsed time from sending the request until its first nonempty content chunk, which may contain multiple tokens. `endMs` is elapsed time from send to a terminal response, error or timeout. Include the final termination in the window.
3. Set each `status` to `ok`, `timeout` or `error`. Success requires both latencies. For a failed request, keep `firstMs` if a content chunk arrived or use `null` if none arrived. Every outcome requires a numeric `endMs`.
4. A file may contain 1–2,000 pairs and occupy up to 4 MiB. IDs must be unique. IDs and groups must be non-blank strings up to 80 UTF-16 code units without ASCII control characters. Use a window of at least 1 ms. Times must be finite, nonnegative and at most `Number.MAX_SAFE_INTEGER`. Require `firstMs ≤ endMs` when present, and `sentMs + endMs ≤ windowMs`. Each target is an integer from 1 to 3,600,000 ms.

**Recomputing the result.** A successful request qualifies when it meets both targets, including equality. Divide completed requests and qualifying requests by the same window in seconds to obtain completed throughput and goodput, respectively. For each configuration, sort successful latencies and select the value at one-based index `ceil(0.95 × successful count)` for P95. An empty successful set has no P95.

The file is processed in this tab. Downloaded timing JSON includes request IDs, groups and both runs’ timings. Review those fields and your written report before sharing. Convert client records to the paired format above before importing. For background on request-level targets and first-chunk timing, see the official metric references. [vLLM benchmark options](https://docs.vllm.ai/en/latest/cli/bench/serve/) · [AIPerf streaming metrics](https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference)

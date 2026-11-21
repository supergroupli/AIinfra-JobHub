"use strict";

const BenchSamples = (() => {
  function ok(firstMs, endMs) {
    return {status: "ok", firstMs, endMs};
  }

  function timeout(endMs, firstMs = null) {
    return {status: "timeout", firstMs, endMs};
  }

  function error(endMs, firstMs = null) {
    return {status: "error", firstMs, endMs};
  }

  // Five bursts of four arrivals. Both configurations receive each request at
  // the same offset and have the same ten-second observation window.
  function trace(rows) {
    return {
      schema: "jobhub-bench/v1",
      source: "synthetic",
      windowMs: 10000,
      targets: {ttftMs: 120, e2eMs: 600},
      requests: rows.map(([group, a, b], index) => ({
        id: "R" + String(index + 1).padStart(2, "0"),
        group,
        sentMs: Math.floor(index / 4) * 2000 + (index % 4) * 45,
        a,
        b
      }))
    };
  }

  return {
    "batch-v1": {
      title: {zh: "调大批次后，值得上线吗？", en: "Would you ship a larger batch?"},
      question: {
        zh: "客服助手在高峰期收到成批请求。A 沿用当前批次上限，B 调大上限。观察同一条请求在两套配置里的首 token 和完成时间，再试着放宽首 token 目标。你的上线选择会改变吗？",
        en: "A support assistant receives bursts of requests. A uses the current batch limit and B raises it. Compare the same request across both configurations, then relax the first-token target. Does your deployment choice change?"
      },
      course: "vllm", day: 4, project: "serving-baseline",
      trace: trace([
        ["short-prompt", ok(78, 305), ok(89, 277)],
        ["short-prompt", ok(83, 327), ok(95, 291)],
        ["long-prompt", ok(103, 526), ok(158, 495)],
        ["long-prompt", timeout(980), ok(171, 507)],
        ["short-prompt", ok(76, 311), ok(98, 288)],
        ["long-prompt", ok(107, 514), ok(164, 488)],
        ["short-prompt", ok(94, 346), ok(101, 304)],
        ["long-prompt", timeout(980, 115), ok(184, 538)],
        ["short-prompt", ok(87, 325), ok(94, 283)],
        ["long-prompt", ok(99, 506), ok(155, 481)],
        ["short-prompt", ok(90, 339), ok(102, 302)],
        ["long-prompt", error(408, 113), ok(211, 552)],
        ["short-prompt", ok(85, 333), ok(93, 286)],
        ["long-prompt", ok(108, 535), ok(166, 510)],
        ["short-prompt", ok(96, 351), ok(103, 315)],
        ["long-prompt", timeout(980), ok(197, 540)],
        ["short-prompt", ok(88, 318), ok(91, 280)],
        ["long-prompt", ok(101, 522), ok(153, 472)],
        ["short-prompt", ok(93, 358), ok(104, 319)],
        ["long-prompt", ok(112, 545), ok(178, 517)]
      ])
    },
    "prefix-v1": {
      title: {zh: "共享前缀加速了谁的请求？", en: "Who gains from prefix-aware routing?"},
      question: {
        zh: "A 按原策略路由，B 优先把相同前缀送到同一实例。知识库问答会复用前缀，自由对话通常使用新前缀。两个群体各有多少请求达标？自由对话占比升高时，你还会作出相同选择吗？",
        en: "A keeps the existing routing policy. B sends matching prefixes to the same instance. Knowledge-base queries reuse prefixes, while open-ended chat uses unique ones. How many requests meet the targets in each group? Would your choice hold if the chat share grew?"
      },
      course: "vllm", day: 5, project: "vllm-cache",
      trace: trace([
        ["shared-prefix", ok(142, 526), ok(66, 376)],
        ["unique-prefix", ok(84, 411), ok(95, 449)],
        ["shared-prefix", ok(102, 475), ok(58, 349)],
        ["unique-prefix", ok(100, 437), ok(151, 552)],
        ["shared-prefix", ok(153, 537), ok(73, 394)],
        ["shared-prefix", ok(116, 488), ok(68, 384)],
        ["unique-prefix", ok(97, 427), ok(106, 457)],
        ["shared-prefix", ok(137, 541), ok(63, 361)],
        ["unique-prefix", ok(105, 461), ok(117, 658)],
        ["shared-prefix", ok(104, 459), ok(55, 343)],
        ["shared-prefix", ok(149, 519), ok(61, 359)],
        ["unique-prefix", ok(91, 407), ok(148, 572)],
        ["shared-prefix", ok(108, 477), ok(72, 387)],
        ["unique-prefix", ok(101, 440), ok(105, 467)],
        ["shared-prefix", ok(146, 525), ok(69, 373)],
        ["shared-prefix", ok(115, 491), ok(77, 401)],
        ["unique-prefix", ok(106, 452), ok(137, 626)],
        ["shared-prefix", ok(141, 516), ok(59, 353)],
        ["unique-prefix", ok(98, 429), ok(112, 647)],
        ["shared-prefix", ok(109, 483), ok(67, 381)]
      ])
    },
    "upgrade-v1": {
      title: {zh: "滚动升级期间，哪些请求进入了 P95？", en: "Which rollout requests enter the p95?"},
      question: {
        zh: "A 以原版本回放流量，B 在同一到达序列中滚动升级。对照成功请求的 P95、全部请求的达标数，以及升级期间的失败记录。你会继续扩大升级范围吗？",
        en: "A replays traffic on the current version. B rolls out an upgrade during the same arrival sequence. Compare successful-request p95, on-time counts over all arrivals, and failures during rollout. Would you expand the rollout?"
      },
      course: "llm-d", day: 10, project: "llmd-control-plane",
      trace: trace([
        ["before-rollout", ok(87, 385), ok(86, 384)],
        ["before-rollout", ok(95, 429), ok(94, 425)],
        ["before-rollout", ok(102, 454), ok(101, 450)],
        ["before-rollout", ok(108, 483), ok(107, 479)],
        ["before-rollout", ok(90, 401), ok(89, 398)],
        ["before-rollout", ok(83, 373), ok(82, 370)],
        ["before-rollout", ok(104, 469), ok(103, 466)],
        ["before-rollout", ok(97, 442), ok(96, 438)],
        ["before-rollout", ok(93, 415), ok(92, 412)],
        ["before-rollout", ok(111, 501), ok(110, 496)],
        ["during-rollout", ok(101, 447), ok(81, 382)],
        ["during-rollout", ok(172, 756), timeout(710, 116)],
        ["during-rollout", ok(109, 478), ok(87, 404)],
        ["during-rollout", ok(191, 818), timeout(710)],
        ["during-rollout", ok(117, 528), ok(91, 422)],
        ["during-rollout", ok(204, 946), error(358, 105)],
        ["during-rollout", ok(99, 454), ok(84, 391)],
        ["during-rollout", ok(198, 897), timeout(710)],
        ["during-rollout", ok(113, 491), ok(89, 410)],
        ["during-rollout", ok(186, 845), timeout(710, 119)]
      ])
    }
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = BenchSamples;

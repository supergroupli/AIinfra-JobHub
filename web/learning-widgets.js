"use strict";

// Pure teaching models. Units: milliseconds, bytes, tokens, sequences.
// These are not measured engine performance or a device capacity planner.
const LearningModels = (() => {
  const finite = (value, name, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) throw new RangeError(`Invalid ${name}`);
    return number;
  };
  function timeline(queue, prefill, decode) {
    queue = finite(queue, "queue");
    prefill = finite(prefill, "prefill");
    decode = finite(decode, "decode");
    return { queue, prefill, decode, ttft: queue + prefill, total: queue + prefill + decode };
  }
  function kvCache(tokens, sequences, kvHeads, layers = 32, headDim = 128, bytesPerElement = 2) {
    const values = [tokens, sequences, kvHeads, layers, headDim, bytesPerElement].map((v, i) => finite(v, `dimension ${i}`));
    if (values.some(value => !Number.isInteger(value))) throw new RangeError("KV dimensions must be integers");
    const bytes = 2 * values.reduce((total, value) => total * value, 1);
    if (!Number.isSafeInteger(bytes)) throw new RangeError("KV byte estimate exceeds exact integer range");
    return { bytes, gib: bytes / (1024 ** 3) };
  }
  function prefixCache(sharedPercent, prefill = 100, decode = 200, reuseOverhead = 10) {
    sharedPercent = finite(sharedPercent, "shared prefix", 0, 100);
    prefill = finite(prefill, "prefill");
    decode = finite(decode, "decode");
    reuseOverhead = finite(reuseOverhead, "reuse overhead");
    const warmPrefill = prefill * (1 - sharedPercent / 100) + reuseOverhead;
    return { off: prefill + decode, cold: prefill + decode + reuseOverhead, warm: warmPrefill + decode, warmPrefill };
  }
  return { timeline, kvCache, prefixCache };
})();

if (typeof module !== "undefined" && module.exports) module.exports = LearningModels;

if (typeof document !== "undefined") (() => {
  const language = () => document.documentElement.lang.startsWith("en") ? "en" : "zh";
  const pick = (zh, en) => language() === "en" ? en : zh;
  const simulators = [...document.querySelectorAll("[data-simulator]")];
  const quizzes = [...document.querySelectorAll(".quiz-question")];

  function updateSimulation(panel) {
    const values = {};
    panel.querySelectorAll("[data-sim-input]").forEach(input => {
      values[input.dataset.simInput] = Number(input.value);
      panel.querySelector(`[data-value-for="${input.dataset.simInput}"]`).textContent = input.value;
    });
    const result = panel.querySelector(".sim-result");
    if (panel.dataset.simulator === "timeline") {
      const data = LearningModels.timeline(values.queue, values.prefill, values.decode);
      for (const key of ["queue", "prefill", "decode"]) panel.querySelector(`[data-bar="${key}"]`).style.width = `${data.total ? data[key] / data.total * 100 : 0}%`;
      result.textContent = pick(`首 token 等待 = ${data.ttft} ms · 请求总时长 = ${data.total} ms`, `Time to first token = ${data.ttft} ms · Total latency = ${data.total} ms`);
    } else if (panel.dataset.simulator === "kv-cache") {
      const data = LearningModels.kvCache(values.tokens, values.batch, values.heads);
      result.textContent = `${data.gib.toFixed(3)} GiB · ${data.bytes.toLocaleString(language() === "en" ? "en-US" : "zh-CN")} bytes`;
    } else if (panel.dataset.simulator === "prefix-cache") {
      const data = LearningModels.prefixCache(values.shared);
      panel.querySelector("[data-warm-total]").textContent = `${Math.round(data.warm)} ms`;
      panel.querySelector('[data-bar="warm"]').style.width = `${data.warm / data.cold * 100}%`;
      result.textContent = pick(`热态 Prefill 与复用开销 = ${Math.round(data.warmPrefill)} ms · 总时长 = ${Math.round(data.warm)} ms`, `Warm prefill + reuse = ${Math.round(data.warmPrefill)} ms · Total = ${Math.round(data.warm)} ms`);
    } else if (typeof EngineeringModels !== "undefined") {
      const data = EngineeringModels.describe(panel.dataset.simulator, values, language());
      const scale = data.scale || Math.max(1, ...data.values);
      data.values.forEach((value, index) => {
        panel.querySelector(`[data-model-value="${index}"]`).textContent = `${Number(value.toFixed(2)).toLocaleString(language() === "en" ? "en-US" : "zh-CN")} ${data.unit}`;
        panel.querySelector(`[data-model-bar="${index}"]`).style.width = `${Math.max(0, Math.min(100, value / scale * 100))}%`;
      });
      result.textContent = data.summary;
    }
  }

  function showQuizResult(form) {
    const state = form.dataset.result;
    const status = form.querySelector(".quiz-status");
    if (!state) { status.textContent = ""; return; }
    if (state === "empty") status.textContent = pick("先选择一个答案，再检查。", "Choose an answer before checking.");
    else if (state === "correct") status.textContent = pick("回答正确。读一读解析，确认你的理由也成立。", "Correct. Review the explanation and check your reasoning too.");
    else status.textContent = pick("这次还不对。参考下面的解析，再试一次。", "Not quite. Read the explanation below, then try again.");
  }

  for (const form of quizzes) {
    const check = form.querySelector('button[type="submit"]');
    const retry = form.querySelector(".quiz-retry");
    const explanation = form.querySelector(".quiz-explanation");
    check.disabled = false;
    form.querySelector(".quiz-reference").hidden = true;
    const clearResult = () => {
      form.dataset.result = "";
      explanation.hidden = true;
      retry.hidden = true;
      showQuizResult(form);
    };
    form.addEventListener("submit", event => {
      event.preventDefault();
      const choice = form.querySelector('input[type="radio"]:checked');
      if (!choice) {
        form.dataset.result = "empty";
        form.querySelector('input[type="radio"]').focus();
      } else {
        form.dataset.result = choice.value === form.dataset.answer ? "correct" : "incorrect";
        explanation.hidden = false;
        retry.hidden = false;
      }
      showQuizResult(form);
    });
    form.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener("change", clearResult));
    retry.addEventListener("click", () => {
      form.reset();
      clearResult();
      form.querySelector('input[type="radio"]').focus();
    });
  }

  document.querySelectorAll(".lesson-code").forEach(panel => {
    const button = panel.querySelector(".copy-code");
    const status = panel.querySelector(".copy-status");
    button.disabled = false;
    button.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(panel.querySelector("code").textContent);
        panel.dataset.copyState = "copied";
        status.textContent = pick("已复制。请在实验目录中执行。", "Copied. Run it in the lab directory.");
      } catch {
        panel.dataset.copyState = "failed";
        status.textContent = pick("无法自动复制，请选中代码手动复制。", "Automatic copy is unavailable. Select and copy the code manually.");
      }
    });
  });

  for (const panel of simulators) {
    panel.querySelectorAll("[data-sim-input]").forEach(input => {
      input.disabled = false;
      input.addEventListener("input", () => updateSimulation(panel));
    });
    updateSimulation(panel);
  }

  // course.js registered first, so its language update completes before this one.
  document.getElementById("course-language")?.addEventListener("click", () => {
    simulators.forEach(updateSimulation);
    quizzes.forEach(showQuizResult);
    document.querySelectorAll(".lesson-code[data-copy-state]").forEach(panel => {
      panel.querySelector(".copy-status").textContent = panel.dataset.copyState === "copied" ? pick("已复制。请在实验目录中执行。", "Copied. Run it in the lab directory.") : pick("无法自动复制，请选中代码手动复制。", "Automatic copy is unavailable. Select and copy the code manually.");
    });
  });
})();

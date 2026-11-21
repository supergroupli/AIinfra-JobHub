"use strict";

const PrimerLabs = (() => {
  // Both languages use the same sequence of teaching pieces and the same counts.
  const words = {
    i: ["我", "I"], like: ["喜欢", "like"], apples: ["苹果", "apples"],
    pears: ["梨", "pears"], see: ["看见", "see"], clouds: ["云", "clouds"], end: ["。", "."]
  };
  const prompts = {i: ["i"], like: ["i", "like"], see: ["i", "see"]};
  const pick = (pair, lang) => pair[lang === "en" ? 1 : 0];

  function phrase(pieces, lang) {
    const parts = pieces.map(piece => pick(words[piece], lang));
    return lang === "en" ? parts.join(" ").replace(/ \./g, ".") : parts.join("");
  }

  function samples(extraPears) {
    return [
      {pieces: ["i", "like", "apples", "end"], copies: 2},
      {pieces: ["i", "like", "pears", "end"], copies: extraPears ? 3 : 1},
      {pieces: ["i", "see", "clouds", "end"], copies: 1}
    ];
  }

  function train(examples) {
    const counts = new Map();
    for (const {pieces, copies} of examples) {
      for (let index = 1; index < pieces.length; index++) {
        const previous = pieces[index - 1];
        const next = pieces[index];
        if (!counts.has(previous)) counts.set(previous, new Map());
        const following = counts.get(previous);
        following.set(next, (following.get(next) || 0) + copies);
      }
    }
    return counts;
  }

  function nextPiece(counts, previous) {
    if (previous === "end") return null;
    const following = counts.get(previous);
    if (!following || !following.size) throw new RangeError("No examples follow this piece");
    // In a tie the first observed continuation wins. Neither teaching corpus has a tie.
    const options = Array.from(following, ([piece, count]) => ({piece, count})).sort((a, b) => b.count - a.count);
    const total = options.reduce((sum, option) => sum + option.count, 0);
    return {previous, chosen: options[0].piece, options, total};
  }

  function segment(mode, lang) {
    if (mode !== "split" && mode !== "whole") throw new RangeError("Unknown teaching vocabulary");
    const english = lang === "en";
    const text = english ? "apple juice" : "苹果汁";
    const vocabulary = [
      {piece: english ? "apple" : "苹果", id: 7},
      {piece: english ? " juice" : "汁", id: 8}
    ];
    if (mode === "whole") vocabulary.push({piece: text, id: 12});

    const candidates = vocabulary.slice().sort((a, b) => b.piece.length - a.piece.length);
    const pieces = [];
    for (let offset = 0; offset < text.length;) {
      const match = candidates.find(entry => text.startsWith(entry.piece, offset));
      if (!match) throw new Error("The teaching vocabulary must cover the example");
      pieces.push(match);
      offset += match.piece.length;
    }
    const ids = pieces.map(item => item.id);
    const byId = new Map(vocabulary.map(item => [item.id, item.piece]));
    return {text, vocabulary, pieces, ids, reconstructed: ids.map(id => byId.get(id)).join("")};
  }

  function queueTimes(ahead, length) {
    if (![0, 1, 2].includes(ahead) || ![1, 3, 5].includes(length)) {
      throw new RangeError("Choose 0, 1 or 2 ahead and 1, 3 or 5 output pieces");
    }
    const wait = ahead * 2;
    return {wait, first: wait + 1, total: wait + length};
  }

  return {prompts, words, pick, phrase, samples, train, nextPiece, segment, queueTimes};
})();

if (typeof module !== "undefined" && module.exports) module.exports = PrimerLabs;

if (typeof document !== "undefined") (() => {
  const M = PrimerLabs;
  const language = () => document.documentElement.lang.toLowerCase().startsWith("en") ? "en" : "zh";
  const text = (zh, en) => M.pick([zh, en], language());
  const control = (root, name) => root.querySelector('[data-primer-control="' + name + '"]');
  const output = (root, name) => root.querySelector('[data-primer-output="' + name + '"]');

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function translate(root, labels) {
    for (const el of root.querySelectorAll("[data-primer-label]")) {
      el.textContent = M.pick(labels[el.dataset.primerLabel], language());
    }
  }

  function predictionLab(root) {
    const trainingVisible = root.dataset.lesson !== "1";
    const labels = {
      title: ["让一句话接着往下写", "Let a sentence grow"],
      intro: ["下面的小模型数过四句样文。选一个开头，猜猜下一块，再点发送。", "This tiny model counted four example sentences. Pick an opening, guess the next piece, then press Send."],
      samples: ["这次训练用的样句", "Sentences used for training"],
      prompt: ["给模型的开头", "Opening to give the model"],
      answer: ["当前句子", "Sentence so far"],
      reset: ["从此开头重来", "Restart this opening"],
      rule: ["它只看最后一块，找样文中接在这块后面次数最多的那一块。真正的聊天模型还会结合更长的上下文。", "It looks at the last piece and picks its most frequent neighbour in the examples. Chat models use a much longer context."]
    };
    root.innerHTML = `
      <p class="primer-intro" data-primer-label="intro"></p>
      <div class="primer-examples"><strong data-primer-label="samples"></strong><ul></ul></div>
      <div class="primer-controls"><label><span data-primer-label="prompt"></span><select data-primer-control="prompt">
        <option value="i"></option><option value="like"></option><option value="see"></option>
      </select></label>
        <div class="primer-actions"><button type="button" class="primer-primary" data-primer-control="step"></button>
          <button type="button" data-primer-control="reset" data-primer-label="reset"></button></div>
      </div>
      <div class="primer-display">
        <span class="primer-label" data-primer-label="answer"></span>
        <p class="primer-sentence" data-primer-output="answer"></p>
        <p class="primer-counts" data-primer-output="counts" role="status"></p>
      </div>
      <div class="primer-training"><button type="button" data-primer-control="train"></button></div>
      <p class="primer-rule" data-primer-label="rule"></p>`;

    const prompt = control(root, "prompt");
    const step = control(root, "step");
    const reset = control(root, "reset");
    const trainButton = control(root, "train");
    root.querySelector(".primer-training").hidden = !trainingVisible;
    let extra = false;
    let corpus = M.samples(extra);
    let model = M.train(corpus);
    let generated = [];
    let evidence = null;

    function render() {
      const lang = language();
      translate(root, labels);
      if (extra) {
        root.querySelector('[data-primer-label="intro"]').textContent = text(
          "你刚用六句样文重新统计。选定开头，观察这次训练怎样改变续写。",
          "You rebuilt the counts from six examples. Choose an opening and see how the new training changes the continuation."
        );
      }
      const list = root.querySelector(".primer-examples ul");
      list.replaceChildren(...corpus.map(row => element("li", "", M.phrase(row.pieces, lang) + " × " + row.copies)));
      for (const option of prompt.options) option.textContent = M.phrase(M.prompts[option.value], lang);
      const initial = M.phrase(M.prompts[prompt.value], lang);
      const full = M.phrase([...M.prompts[prompt.value], ...generated], lang);
      const answer = output(root, "answer");
      answer.replaceChildren(element("span", "", initial), element("strong", "primer-generated", full.slice(initial.length)));
      const counts = output(root, "counts");
      if (!evidence) {
        counts.textContent = text("先在上面三种样句里找一找，开头的最后一块后面接过什么？",
          "Look at the three sentence patterns. What has followed the last piece of your opening?");
      } else {
        const previous = M.pick(M.words[evidence.previous], lang);
        const options = evidence.options.map(option => M.pick(M.words[option.piece], lang) + " " + option.count + "/" + evidence.total);
        const chosen = M.pick(M.words[evidence.chosen], lang);
        counts.textContent = text("刚才「" + previous + "」后面出现过 " + options.join("、") + "。选中「" + chosen + "」。",
          "After “" + previous + "” the examples give " + options.join(", ") + ". The model chose “" + chosen + "”.");
      }
      const stopped = generated[generated.length - 1] === "end";
      step.disabled = stopped;
      step.textContent = stopped ? text("已到句号", "End of sentence")
        : generated.length ? text("生成下一块", "Generate the next piece") : text("发送", "Send");
      reset.disabled = generated.length === 0;
      trainButton.textContent = extra ? text("用原来的四句重新训练", "Train on the original four")
        : text("多加两句「我喜欢梨。」再训练", "Train again with two more “I like pears.” examples");
      trainButton.setAttribute("aria-pressed", String(extra));
    }
    function rewind() {
      generated = [];
      evidence = null;
      render();
    }
    prompt.addEventListener("change", rewind);
    reset.addEventListener("click", rewind);
    step.addEventListener("click", () => {
      const chain = M.prompts[prompt.value].concat(generated);
      const decision = M.nextPiece(model, chain[chain.length - 1]);
      if (!decision) return;
      evidence = decision;
      generated.push(decision.chosen);
      render();
    });
    trainButton.addEventListener("click", () => {
      extra = !extra;
      corpus = M.samples(extra);
      model = M.train(corpus);
      rewind();
    });
    return render;
  }

  function tokenLab(root) {
    const labels = {
      title: ["同一句话可以切成几块？", "How many pieces make the same text?"],
      intro: ["从左往右读，每次取词表中能匹配的最长一段。换一本词表，再数一遍。", "Read left to right and take the longest entry that matches. Switch vocabularies and count again."],
      field: ["选择词表", "Choose a vocabulary"],
      a: ["词表 A", "Vocabulary A"], b: ["词表 B", "Vocabulary B"],
      available: ["可用的文本块与编号", "Available pieces and IDs"],
      pieces: ["切分结果", "Pieces"], ids: ["送给模型的编号", "IDs sent to the model"],
      back: ["按编号查表拼回的文本", "Text reconstructed from IDs"],
      rule: ["每个文本块叫一个 token。这里的编号由练习用词表指定，真实模型使用各自的词表和分词规则。", "Each piece is a token. These IDs belong to the teaching vocabularies. Production models have their own vocabularies and tokenization rules."]
    };
    root.innerHTML = `
      <p class="primer-intro" data-primer-label="intro"></p>
      <div class="primer-controls"><label><span data-primer-label="field"></span><select data-primer-control="vocab">
        <option value="split" data-primer-label="a"></option><option value="whole" data-primer-label="b"></option>
      </select></label></div>
      <p class="primer-vocabulary"><strong data-primer-label="available"></strong><span data-primer-output="vocabulary"></span></p>
      <dl class="primer-display primer-token-result" aria-live="polite">
        <div><dt data-primer-label="pieces"></dt><dd data-primer-output="pieces"></dd></div>
        <div><dt data-primer-label="ids"></dt><dd data-primer-output="ids"></dd></div>
        <div><dt data-primer-label="back"></dt><dd data-primer-output="reconstructed"></dd></div>
      </dl><p class="primer-rule" data-primer-label="rule"></p>`;
    const vocabulary = control(root, "vocab");
    function render() {
      translate(root, labels);
      const data = M.segment(vocabulary.value, language());
      output(root, "vocabulary").textContent = data.vocabulary.map(item => "“" + item.piece + "” " + item.id).join(" · ");
      output(root, "pieces").replaceChildren(...data.pieces.map(item => element("span", "primer-piece", item.piece)));
      output(root, "ids").textContent = data.ids.join(", ");
      output(root, "reconstructed").textContent = data.reconstructed;
    }
    vocabulary.addEventListener("change", render);
    return render;
  }

  function queueLab(root) {
    const labels = {
      title: ["你什么时候能看到回答？", "When will you see the answer?"],
      intro: ["想象只有一个服务窗口。每位排在前面的人占两秒。轮到你时，每过一秒出现一块回答。", "Imagine a single service counter. Each person ahead uses it for two seconds. Once your turn starts, one piece of your answer appears each second."],
      ahead: ["前面有几个人", "People ahead of you"], length: ["你的回答有几块", "Pieces in your answer"],
      first: ["看到第一块", "First piece appears"], total: ["看到完整回答", "Whole answer appears"],
      waiting: ["等待", "Waiting"], firstKey: ["第一块", "First piece"], later: ["后续块", "Later pieces"],
      rule: ["时间从发送开始计算。这把教学时钟只计算排队和生成，网络传输耗时设为零。", "The teaching clock starts when you send. It counts waiting and generation, with zero network time in this example."]
    };
    root.innerHTML = `
      <p class="primer-intro" data-primer-label="intro"></p>
      <div class="primer-controls"><label><span data-primer-label="ahead"></span><select data-primer-control="ahead">
        <option value="0">0</option><option value="1">1</option><option value="2">2</option></select></label>
        <label><span data-primer-label="length"></span><select data-primer-control="length">
        <option value="1">1</option><option value="3" selected>3</option><option value="5">5</option></select></label></div>
      <div class="primer-display">
        <dl class="primer-times" aria-live="polite">
          <div><dt data-primer-label="first"></dt><dd data-primer-output="first"></dd></div>
          <div><dt data-primer-label="total"></dt><dd data-primer-output="total"></dd></div>
        </dl>
        <div class="primer-clock" aria-hidden="true"></div>
        <div class="primer-key" aria-hidden="true"><span><i class="primer-wait"></i><span data-primer-label="waiting"></span></span>
          <span><i class="primer-first"></i><span data-primer-label="firstKey"></span></span>
          <span><i class="primer-later"></i><span data-primer-label="later"></span></span></div>
        <p class="primer-equation" data-primer-output="equation"></p>
      </div><p class="primer-rule" data-primer-label="rule"></p>`;
    const ahead = control(root, "ahead");
    const length = control(root, "length");
    function render() {
      translate(root, labels);
      const n = Number(length.value);
      const times = M.queueTimes(Number(ahead.value), n);
      root.dataset.firstSeconds = String(times.first);
      root.dataset.totalSeconds = String(times.total);
      const unit = text(" 秒", " s");
      output(root, "first").textContent = times.first + unit;
      output(root, "total").textContent = times.total + unit;
      const clock = root.querySelector(".primer-clock");
      const ticks = [];
      for (let second = 1; second <= 9; second++) {
        let kind = "idle";
        if (second <= times.wait) kind = "wait";
        else if (second === times.first) kind = "first";
        else if (second <= times.total) kind = "later";
        const tick = element("span", "primer-tick");
        tick.append(element("i", "primer-" + kind), element("small", "", second + "s"));
        ticks.push(tick);
      }
      clock.replaceChildren(...ticks);
      output(root, "equation").textContent = text(
        "排队 " + times.wait + " 秒，加上你自己的 " + n + " 秒，完整回答用了 " + times.total + " 秒。",
        "Waiting takes " + times.wait + " s. Your " + n + " pieces take " + n + " s. The full answer appears at " + times.total + " s."
      );
    }
    ahead.addEventListener("change", render);
    length.addEventListener("change", render);
    return render;
  }

  const activities = {predict: predictionLab, tokens: tokenLab, queue: queueLab};
  const renders = [];
  for (const root of document.querySelectorAll("[data-primer-lab]")) {
    const create = activities[root.dataset.primerLab];
    if (typeof create !== "function") continue;
    renders.push(create(root));
    const heading = element(root.dataset.lesson === "offline" ? "h2" : "h3", "primer-lab-title");
    heading.dataset.primerLabel = "title";
    root.prepend(heading);
  }
  function renderAll() {
    for (const render of renders) render();
  }
  const courseToggle = document.getElementById("course-language");
  if (courseToggle) courseToggle.addEventListener("click", renderAll);

  const offlineToggle = document.querySelector("[data-primer-language]");
  if (offlineToggle) {
    offlineToggle.hidden = false;
    const copy = Array.from(document.querySelectorAll("[data-offline-en]"), node => ({node, zh: node.textContent}));
    function offlineLabels() {
      for (const {node, zh} of copy) node.textContent = text(zh, node.dataset.offlineEn);
      offlineToggle.textContent = text("English", "中文");
      offlineToggle.setAttribute("aria-label", text("Switch to English", "切换为中文"));
      document.title = text("推理启蒙 · 离线练习册", "Inference primer · Offline workbook") + " · AI Infra JobHub";
    }
    if (new URLSearchParams(location.search).get("lang") === "en") document.documentElement.lang = "en";
    offlineToggle.addEventListener("click", () => {
      document.documentElement.lang = language() === "en" ? "zh-CN" : "en";
      offlineLabels();
      renderAll();
    });
    offlineLabels();
  }
  renderAll();
})();

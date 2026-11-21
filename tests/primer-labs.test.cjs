"use strict";
const {test} = require("node:test");
const assert = require("node:assert/strict");
const M = require("../web/labs/inference-101/activities.js");

function generate(model, start) {
  const chain = start.slice();
  let evidence;
  while ((evidence = M.nextPiece(model, chain[chain.length - 1])) !== null) {
    chain.push(evidence.chosen);
    assert.ok(chain.length <= 4, "the teaching sentences must reach a full stop");
  }
  return chain;
}

test("training uses neighbouring pieces within the four example sentences", () => {
  const samples = M.samples(false);
  assert.equal(samples.reduce((count, row) => count + row.copies, 0), 4);
  const model = M.train(samples);
  assert.deepEqual(M.nextPiece(model, "i"), {
    previous: "i", chosen: "like", total: 4,
    options: [{piece: "like", count: 3}, {piece: "see", count: 1}]
  });
  assert.deepEqual(M.nextPiece(model, "like"), {
    previous: "like", chosen: "apples", total: 3,
    options: [{piece: "apples", count: 2}, {piece: "pears", count: 1}]
  });
  assert.equal(model.has("end"), false, "sentences must not train an edge from the full stop to the next opening");
  assert.equal(M.nextPiece(model, "end"), null);
  assert.throws(() => M.nextPiece(model, "unseen"), RangeError);
});

test("each press adds one piece; independent openings stop at punctuation in both languages", () => {
  const model = M.train(M.samples(false));
  const first = M.nextPiece(model, "i");
  assert.equal(M.phrase(M.prompts.i.concat(first.chosen), "zh"), "我喜欢");
  assert.equal(M.phrase(M.prompts.i.concat(first.chosen), "en"), "I like");

  for (const [start, zh, en] of [
    ["i", "我喜欢苹果。", "I like apples."],
    ["like", "我喜欢苹果。", "I like apples."],
    ["see", "我看见云。", "I see clouds."]
  ]) {
    const chain = generate(model, M.prompts[start]);
    assert.equal(M.phrase(chain, "zh"), zh);
    assert.equal(M.phrase(chain, "en"), en);
  }
  assert.deepEqual(M.prompts.i, ["i"]);
  assert.deepEqual(M.nextPiece(model, "i"), first);
});

test("changing the corpus and retraining changes the counts for the same opening", () => {
  const original = M.train(M.samples(false));
  const augmented = M.train(M.samples(true));
  assert.deepEqual(M.nextPiece(augmented, "like"), {
    previous: "like", chosen: "pears", total: 5,
    options: [{piece: "pears", count: 3}, {piece: "apples", count: 2}]
  });
  assert.equal(M.phrase(generate(augmented, M.prompts.like), "en"), "I like pears.");
  assert.equal(M.phrase(generate(original, M.prompts.like), "en"), "I like apples.");
  const unseenCorpus = M.train([{pieces: ["i", "see", "clouds", "end"], copies: 2}]);
  assert.equal(M.nextPiece(unseenCorpus, "i").chosen, "see", "selection must come from the provided corpus");
});

test("longest-match vocabularies produce different IDs and both decode to the original text", () => {
  for (const lang of ["zh", "en"]) {
    const split = M.segment("split", lang);
    const whole = M.segment("whole", lang);
    assert.deepEqual(split.ids, [7, 8]);
    assert.deepEqual(whole.ids, [12]);
    assert.equal(split.text, lang === "zh" ? "苹果汁" : "apple juice");
    assert.equal(split.reconstructed, split.text);
    assert.equal(whole.reconstructed, split.text);
    assert.equal(whole.vocabulary.length, 3);
    assert.deepEqual(whole.vocabulary.slice(0, 2), split.vocabulary);
  }
  assert.equal(M.segment("split", "en").pieces[1].piece, " juice");
  assert.throws(() => M.segment("other", "en"), RangeError);
});

test("one queue counter separates waiting, first piece and full completion for every setting", () => {
  assert.deepEqual(M.queueTimes(0, 3), {wait: 0, first: 1, total: 3});
  assert.deepEqual(M.queueTimes(2, 3), {wait: 4, first: 5, total: 7});
  assert.deepEqual(M.queueTimes(2, 5), {wait: 4, first: 5, total: 9});
  for (const people of [0, 1, 2]) {
    for (const pieces of [1, 3, 5]) {
      const time = M.queueTimes(people, pieces);
      assert.equal(time.first, 2 * people + 1);
      assert.equal(time.total - time.first, pieces - 1);
      assert.ok(time.total <= 9);
    }
  }
  for (const args of [[-1, 3], [3, 5], [1, 2], [1, 0], [NaN, 3]]) {
    assert.throws(() => M.queueTimes(...args), RangeError);
  }
});

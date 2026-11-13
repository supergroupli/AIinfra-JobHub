"use strict";

// Run the actual course script with a small DOM/storage substitute. These tests
// exercise persistence and navigation behavior; visual QA remains in the browser.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Blob } = require("node:buffer");

const sourcePath = path.join(__dirname, "..", "web", "course.js");
const source = readFileSync(sourcePath, "utf8");
const prefix = "infra-commons:";

function storageFixture() {
  const records = new Map();
  const failingKeys = new Set();
  return {
    records,
    failingKeys,
    read(key) {
      return records.has(prefix + key) ? JSON.parse(records.get(prefix + key)) : null;
    },
    seed(key, value) {
      records.set(prefix + key, JSON.stringify(value));
    },
    localStorage: {
      getItem(key) {
        return records.get(key) ?? null;
      },
      setItem(key, value) {
        if (failingKeys.has(key)) {
          const error = new Error("Storage quota reached for this write");
          error.name = "QuotaExceededError";
          throw error;
        }
        records.set(key, value);
      }
    }
  };
}

function mountCourse(store, { id = "vllm", hash = "#day-1" } = {}) {
  const listeners = new Map();
  const downloads = [];
  const location = new URL(`https://example.test/learn/${id}/${hash}`);
  let document;

  function element(dataset = {}) {
    const events = new Map();
    const attributes = new Map();
    const classes = new Set();
    const children = new Map();
    return {
      dataset,
      value: "",
      textContent: "",
      hidden: false,
      checked: false,
      disabled: true,
      open: true,
      classList: {
        toggle(name, enabled) {
          enabled ? classes.add(name) : classes.delete(name);
        }
      },
      setAttribute(name, value) {
        attributes.set(name, value);
      },
      getAttribute(name) {
        return attributes.get(name) ?? null;
      },
      addEventListener(name, callback) {
        if (!events.has(name)) events.set(name, []);
        events.get(name).push(callback);
      },
      emit(name) {
        for (const callback of events.get(name) ?? []) callback({ target: this });
      },
      querySelector(selector) {
        if (selector !== ".day-status") return null;
        if (!children.has(selector)) children.set(selector, element());
        return children.get(selector);
      },
      focus() {
        document.activeElement = this;
      },
      scrollIntoView() {},
      click() {
        this.emit("click");
      }
    };
  }

  const steps = Array.from({ length: 10 }, (_, index) => ({
    day: index + 1,
    title: { zh: `测试第 ${index + 1} 天`, en: `Fixture day ${index + 1}` }
  }));
  const ids = new Map();
  const notes = steps.map(step => element({ notes: String(step.day) }));
  const complete = steps.map(step => element({ complete: String(step.day) }));
  const sections = steps.map(step => element({ day: String(step.day) }));
  const dayLinks = steps.map(step => element({ dayLink: String(step.day) }));
  const sidebarHeading = element();
  const sidebarPanel = element();

  for (const name of ["course-progress", "course-progress-count", "storage-status", "course-language", "download-guide", "export-progress"]) {
    ids.set(name, element());
  }
  ids.get("storage-status").hidden = true;
  ids.set("course-meta", {
    textContent: JSON.stringify({ id, title: { zh: "测试课程", en: "Fixture course" }, steps })
  });
  sections.forEach((section, index) => ids.set(`day-${index + 1}`, section));
  notes.forEach((input, index) => ids.set(`notes-${index + 1}`, input));

  document = {
    documentElement: {},
    activeElement: null,
    title: "",
    getElementById(id) {
      assert.ok(ids.has(id), `Unexpected DOM id: ${id}`);
      return ids.get(id);
    },
    querySelector(selector) {
      if (selector === ".sidebar-heading") return sidebarHeading;
      if (selector === ".sidebar-panel") return sidebarPanel;
      const note = /^\[data-notes="(\d+)"\]$/.exec(selector);
      if (note) return notes[Number(note[1]) - 1] ?? null;
      return null;
    },
    querySelectorAll(selector) {
      const selections = {
        "[data-complete]": complete,
        "[data-notes]": notes,
        "[data-day-link]": dayLinks,
        ".day-content": sections,
        "[data-zh][data-en]": [],
        "[data-i18n]": []
      };
      assert.ok(selector in selections, `Unexpected DOM selector: ${selector}`);
      return selections[selector];
    },
    createElement(tag) {
      assert.equal(tag, "a");
      return element();
    }
  };

  class DownloadURL extends URL {
    static createObjectURL(blob) {
      downloads.push(blob);
      return `blob:fixture-${downloads.length}`;
    }
    static revokeObjectURL() {}
  }

  const context = vm.createContext({
    URL: DownloadURL,
    URLSearchParams,
    Blob,
    document,
    location,
    localStorage: store.localStorage,
    history: {
      replaceState(_state, _title, url) {
        location.href = String(url);
      }
    },
    matchMedia() {
      return { matches: false };
    },
    window: {
      addEventListener(name, callback) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(callback);
      }
    },
    setTimeout() {
      return 0;
    }
  });
  new vm.Script(source, { filename: sourcePath }).runInContext(context, { timeout: 1000 });

  return {
    ids,
    notes,
    complete,
    downloads,
    document,
    editNote(day, value) {
      notes[day - 1].value = value;
      notes[day - 1].focus();
      notes[day - 1].emit("input");
    },
    setComplete(day, checked) {
      complete[day - 1].checked = checked;
      complete[day - 1].emit("change");
    },
    navigate(hash) {
      location.hash = hash;
      for (const callback of listeners.get("hashchange") ?? []) callback();
    },
    deliverStorageEvent(key) {
      for (const callback of listeners.get("storage") ?? []) callback({ key: prefix + key });
    },
    visibleDay() {
      const visible = sections.filter(section => !section.hidden);
      assert.equal(visible.length, 1, "Exactly one day should be visible with JavaScript");
      return Number(visible[0].dataset.day);
    }
  };
}

test("two open tabs preserve notes written on different days of the same course", () => {
  const store = storageFixture();
  const firstTab = mountCourse(store);
  const secondTab = mountCourse(store);

  // Both tabs loaded before either edit. Even a suspended tab which has not
  // received a storage event must not overwrite another day's work.
  firstTab.editNote(1, "Day 1: reproducible environment and source revision");
  secondTab.editNote(2, "Day 2: workload definition and baseline results");

  const reopened = mountCourse(store);
  assert.equal(reopened.notes[0].value, "Day 1: reproducible environment and source revision");
  assert.equal(reopened.notes[1].value, "Day 2: workload definition and baseline results");

  // Updates to an inactive editor can appear in another open tab, while a
  // currently focused editor keeps its visible text under the user's control.
  firstTab.deliverStorageEvent("notes-v2:vllm:2");
  assert.equal(firstTab.notes[1].value, secondTab.notes[1].value);
  secondTab.editNote(1, "A newer remote revision");
  firstTab.deliverStorageEvent("notes-v2:vllm:1");
  assert.equal(firstTab.notes[0].value, "Day 1: reproducible environment and source revision");
});

test("two open tabs preserve other days when checking and unchecking course progress", () => {
  const store = storageFixture();
  const firstTab = mountCourse(store);
  const secondTab = mountCourse(store, { hash: "#day-2" });

  // Deliberately withhold storage events: a suspended tab may still have an
  // old in-memory record when the learner checks a different day's task.
  firstTab.setComplete(1, true);
  secondTab.setComplete(2, true);
  assert.deepEqual(store.read("course-progress-v2").sort(), ["vllm:1", "vllm:2"]);
  assert.equal(secondTab.ids.get("course-progress-count").textContent, "2 / 10");

  // Undoing the first tab's own completion must preserve the second tab's day.
  firstTab.setComplete(1, false);
  assert.deepEqual(store.read("course-progress-v2"), ["vllm:2"]);
  assert.equal(firstTab.complete[0].checked, false);
  assert.equal(firstTab.complete[1].checked, true);
  assert.equal(firstTab.ids.get("course-progress-count").textContent, "1 / 10");

  secondTab.deliverStorageEvent("course-progress-v2");
  assert.equal(secondTab.complete[0].checked, false);
  assert.equal(secondTab.complete[1].checked, true);
  const reopened = mountCourse(store);
  assert.equal(reopened.complete[0].checked, false);
  assert.equal(reopened.complete[1].checked, true);
  assert.equal(reopened.ids.get("course-progress-count").textContent, "1 / 10");
});

test("legacy course notes remain available when new per-day notes are saved", () => {
  const store = storageFixture();
  store.seed("notes-v2:vllm", { 1: "Existing learner's Day 1 notes", 2: "Existing Day 2 draft" });
  const page = mountCourse(store);
  assert.equal(page.notes[0].value, "Existing learner's Day 1 notes");
  page.editNote(2, "Revised Day 2 evidence");

  const reopened = mountCourse(store);
  assert.equal(reopened.notes[0].value, "Existing learner's Day 1 notes");
  assert.equal(reopened.notes[1].value, "Revised Day 2 evidence");
});

test("the skip-to-content anchor preserves the current day and resume position", () => {
  const store = storageFixture();
  const page = mountCourse(store, { hash: "#day-5" });
  assert.equal(page.visibleDay(), 5);
  page.navigate("#course-reader");
  assert.equal(page.visibleDay(), 5);
  assert.equal(store.read("last-day-v2:vllm"), 5);

  page.navigate("#day-7");
  assert.equal(page.visibleDay(), 7);
  assert.equal(store.read("last-day-v2:vllm"), 7);
});

test("a failed note write stays visibly unsaved after unrelated successful writes", async () => {
  const store = storageFixture();
  const noteKey = "notes-v2:vllm:3";
  store.seed(noteKey, "Previously saved work");
  const page = mountCourse(store, { hash: "#day-3" });
  store.failingKeys.add(prefix + noteKey);
  page.editNote(3, "New work that needs a backup");
  const status = page.ids.get("storage-status");
  assert.equal(status.hidden, false);
  assert.match(status.textContent, /无法保存/);
  assert.equal(store.read(noteKey), "Previously saved work");

  page.navigate("#day-4");
  assert.equal(store.read("last-day-v2:vllm"), 4);
  assert.match(status.textContent, /无法保存/);
  page.ids.get("course-language").click();
  assert.equal(store.read("language"), "en");
  assert.match(status.textContent, /could not save/);

  // The promised export remains a useful recovery path before leaving.
  page.ids.get("export-progress").click();
  assert.equal(page.downloads.length, 1);
  assert.match(await page.downloads[0].text(), /New work that needs a backup/);

  store.failingKeys.delete(prefix + noteKey);
  page.editNote(3, "New work that needs a backup");
  assert.equal(store.read(noteKey), "New work that needs a backup");
  assert.ok(status.hidden || !/could not save|无法保存/.test(status.textContent));
});

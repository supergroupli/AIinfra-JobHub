"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../web/career/career-model.js');
const data = require('../web/career/career.json');
const projects = require('../web/projects/projects.json').projects;

test('career paths have complete bilingual content and point to real projects and lesson days', () => {
  model.validate(data);
  for (const role of data.roles) {
    assert.ok(projects.some(p=>p.id===role.project));
    assert.equal(new Set(model.keys(role)).size,16);
    for (const day of role.days) {
      const course=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/courses',day.course+'.json'),'utf8'));
      assert.ok(course.steps.some(s=>s.day===day.lesson));
    }
  }
  const broken=JSON.parse(JSON.stringify(data));delete broken.roles[1].days[2].artifact.en;
  assert.throws(()=>model.validate(broken),/Invalid career day/);
  const duplicate=JSON.parse(JSON.stringify(data));duplicate.roles[1].id=duplicate.roles[0].id;
  assert.throws(()=>model.validate(duplicate),/Duplicate/);
});

test('saved checklists discard unknown fields without leaking progress across roles', () => {
  const result=model.normalize({'inference-engineer':['day:1','day:1','day:8','basic:0','reproduced:9',true,{}],'performance-engineer':'invalid','unknown-role':['day:7']},data);
  assert.deepEqual(result['inference-engineer'],['day:1','basic:0']);
  assert.deepEqual(result['performance-engineer'],[]);
  assert.deepEqual(result['platform-engineer'],[]);
  assert.equal(Object.keys(result).length,3);
  assert.deepEqual(model.normalize(null,data),Object.fromEntries(model.roles.map(id=>[id,[]])));
});

test('exports preserve role-specific checks and distinguish teaching examples from personal evidence', () => {
  for(const role of data.roles) for(const lang of ['zh','en']) {
    const md=model.markdown(role,['day:1','basic:0'],lang);
    assert.ok(md.includes(`- [x] ${role.days[0].check[lang]}`));
    assert.ok(md.includes(`- [ ] ${role.days[1].check[lang]}`));
    assert.ok(md.includes(`- [ ] ${role.rubric[2].items[0][lang]}`));
    assert.ok(md.includes(role.good[4].value[lang]));
    assert.ok(md.includes(`project=${role.project}&lang=${lang}`));
    assert.ok(md.includes(lang==='en'?'NOT your work or real measurements':'不是你的成果或真实测量'));
    assert.ok(md.includes(lang==='en'?'Self-reported checks, not certification':'勾选为个人自述，不是认证'));
    assert.ok(md.includes(lang==='en'?'TODO':'待填'));
  }
});

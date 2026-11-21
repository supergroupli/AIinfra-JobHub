"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const model=require('../web/start/start-model.js');
const careers=require('../web/career/career.json').roles;
const projects=require('../web/projects/projects.json').projects;
const allComfortable=Object.fromEntries(model.skills.map(s=>[s.id,'comfortable']));

test('all three CPU routes point to existing role, CPU project and exact bilingual lesson titles',()=>{
  for(const role of Object.keys(model.roles))for(const lang of ['zh','en']){
    const plan=model.recommend({role,hardware:'cpu',skills:{linux:'comfortable',python:'review'}},lang);
    assert.equal(plan.firstHour.cpuReady,true);
    assert.equal(plan.firstHour.course,'foundations');
    assert.ok(plan.firstHour.commands.includes('python3 lab.py day1'));
    assert.ok(plan.firstHour.fallback.includes(lang==='en'?'not yet executed':'尚未完成'));
    assert.ok(careers.some(c=>c.id===role&&c.project===plan.project));
    assert.ok(projects.some(p=>p.id===plan.project&&p.cpuStart));
    assert.equal(plan.careerURL,`../career/?role=${role}&lang=${lang}`);
    assert.equal(plan.projectURL,`../projects/?project=${plan.project}&lang=${lang}`);
    for(const ref of [...plan.reviews,...plan.route,plan.firstHour]){
      const course=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/courses',ref.course+'.json'),'utf8'));
      const lesson=course.steps.find(s=>s.day===ref.day);assert.ok(lesson);
      assert.equal(ref.url,`../learn/${ref.course}/?lang=${lang}#day-${ref.day}`);
      if(ref!==plan.firstHour)assert.equal(ref.title,lesson.title[lang]);
    }
  }
});

test('each reported gap has an explanation, deduplicated lessons preserve all reasons, independence does not certify',()=>{
  const plan=model.recommend({skills:{linux:'unknown',python:'review'}});
  assert.equal(plan.reviews.filter(r=>r.course==='foundations'&&r.day===1).length,1);
  assert.equal(plan.reviews.find(r=>r.course==='foundations'&&r.day===1).reasons.length,2);
  for(const skill of model.skills){
    const p=model.recommend({skills:{...allComfortable,[skill.id]:'review'}},'en');
    assert.equal(p.reviews.length,1);assert.deepEqual(p.reviews[0].skills,[skill.id]);
    assert.ok(p.reviews[0].reasons[0].includes(skill.reason.en));
  }
  const experienced=model.recommend({skills:allComfortable});assert.equal(experienced.reviews.length,0);assert.equal(experienced.experienced,true);assert.ok(experienced.projectURL);
  const md=model.markdown({skills:allComfortable},'en');assert.match(md,/not verified capability, certification or a hiring decision/);assert.match(md,/does not verify readiness/);
});

test('hardware and time change guidance without gating the CPU starting task or resources',()=>{
  const plans=['cpu','single','multi'].map(hardware=>model.recommend({hardware,role:'platform-engineer',skills:allComfortable}));
  assert.deepEqual(plans.map(p=>p.firstHour.commands),Array(3).fill(plans[0].firstHour.commands));
  assert.deepEqual(plans[0].route,plans[2].route);assert.notEqual(plans[0].hardwareNote,plans[1].hardwareNote);
  assert.notEqual(model.recommend({hours:2}).pacing,model.recommend({hours:10}).pacing);
});

test('invalid, oversized and inherited selections cannot introduce arbitrary links or storage data',()=>{
  for(const input of [null,[],true,'bad',{role:'__proto__',hardware:'constructor',hours:Infinity,skills:{http:'<script>',python:'toString'}}])assert.deepEqual(model.normalize(input),model.normalize(null));
  const input={role:'javascript:alert(1)',hardware:'cpu',hours:'10',skills:{...allComfortable,extra:'secret'},extra:'secret'};
  const normalized=model.normalize(input);assert.equal(normalized.role,'inference-engineer');assert.equal(normalized.hours,5);assert.equal(normalized.extra,undefined);assert.equal(normalized.skills.extra,undefined);
  for(const raw of ['{',JSON.stringify({version:2}), 'x'.repeat(10001)]){const loaded=model.load({getItem:()=>raw});assert.equal(loaded.ok,false);assert.deepEqual(loaded.state,model.normalize(null));}
  assert.equal(model.load({getItem:()=>null}).ok,true);
});

test('storage failure leaves recommendation usable and reset touches only this tool key',()=>{
  const values=new Map([['infra-commons:language','"en"'],['infra-commons:career-readiness-v1','keep']]);
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const state=model.normalize({role:'platform-engineer',hardware:'multi',hours:10,skills:allComfortable});
  assert.equal(model.save(storage,state),true);assert.deepEqual(model.load(storage).state,state);assert.equal(model.reset(storage),true);
  assert.deepEqual([...values],[['infra-commons:language','"en"'],['infra-commons:career-readiness-v1','keep']]);
  const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}};
  assert.equal(model.load(denied).ok,false);assert.equal(model.save(denied,state),false);assert.equal(model.reset(denied),false);assert.equal(model.recommend(state).state.role,'platform-engineer');assert.ok(model.markdown(state).length>100);
});

test('Markdown retains selections, exact destinations, evidence limits and first-hour fallback in both languages',()=>{
  for(const lang of ['zh','en']){
    const md=model.markdown({role:'performance-engineer',hardware:'cpu',hours:2,skills:{python:'review'}},lang);
    assert.ok(md.includes(`career/?role=performance-engineer&lang=${lang}`));assert.ok(md.includes('project=distributed-training'));
    assert.ok(md.includes('artifacts/day01-timeline.json'));assert.ok(md.includes('python3 lab.py day1'));
    assert.ok(md.includes('https://supergroupli.github.io/AIinfra-JobHub/labs/foundations.zip'));
    assert.ok(md.includes(lang==='en'?'not a real performance benchmark':'不是实际性能测试'));
    assert.ok(md.includes(lang==='en'?'not submitted to a recruiter':'未向招聘方提交'));
  }
});

test('a first-time visitor gets a browser lesson before any terminal work, across roles, languages and devices',()=>{
  const course = require('../content/courses/inference-101.json');
  for (const lang of ['zh','en']) {
    for (const role of Object.keys(model.roles)) {
      for (const hardware of Object.keys(model.hardware)) {
        const input = {role,hardware};
        const first = model.recommend(input,lang).firstHour;
        assert.equal(first.title,course.title[lang]);
        assert.equal(course.steps[0].day,first.day);
        assert.equal(first.mode,'browser');
        assert.equal(first.url,`../learn/inference-101/?lang=${lang}#day-1`);
        assert.deepEqual(first.commands,[]);
        assert.equal(first.download,undefined);
        assert.equal(first.bridge.url,`../learn/foundations/?lang=${lang}#day-1`);
        const markdown = model.markdown(input,lang);
        const firstLink = markdown.match(/https:\/\/\S+/)[0];
        assert.equal(firstLink,`https://supergroupli.github.io/AIinfra-JobHub/learn/inference-101/?lang=${lang}#day-1`);
        assert.ok(markdown.includes(first.fallback) && markdown.includes(first.bridge.detail));
        assert.ok(!markdown.includes('python3 lab.py day1'));
      }
    }
  }
  assert.equal(model.recommend(null).firstHour.mode,'browser');
  for (const skill of ['linux','python']) {
    const first = model.recommend({skills:{[skill]:'review'}}).firstHour;
    assert.equal(first.course,'foundations');
    assert.ok(first.commands.includes('python3 lab.py day1'));
  }
});

test('choosing the primer overrides familiar programming tools and is preserved in a bilingual plan',()=>{
  const input = {skills:allComfortable, newToInference:true};
  for (const lang of ['zh','en']) {
    const first = model.recommend(input,lang).firstHour;
    assert.equal(first.mode,'browser');
    assert.ok(first.reason.includes(lang==='zh'?'选择了从模型推理启蒙开始':'chose to start with model inference'));
    assert.ok(model.markdown(input,lang).includes(first.reason));
    assert.deepEqual(first.commands,[]);
  }
  const legacy = {version:1,skills:allComfortable,role:'platform-engineer'};
  const stored = model.load({getItem:()=>JSON.stringify(legacy)});
  assert.equal(stored.ok,true);
  assert.equal(stored.state.newToInference,false);
  assert.equal(model.recommend(stored.state).firstHour.mode,'terminal');
  for (const value of [false,1,'true',null]) {
    assert.equal(model.normalize({...input, newToInference:value}).newToInference,false);
  }
});

// This intentionally small DOM implements the APIs used by start.js. It executes
// the real controller and form handlers, but does not claim browser/layout QA.
function pageHarness({url='https://supergroupli.github.io/AIinfra-JobHub/start/?lang=en',saved,deny=[]}={}){
  const vm=require('node:vm');
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.listeners={};this._text='';this.value='';}
    get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
    set textContent(value){this._text=String(value);this.children=[];}
    append(...children){for(const child of children){if(child.tagName==='#FRAGMENT')this.append(...child.children);else{this.children.push(child);child.parent=this;}}}
    replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
    setAttribute(key,value){this.attributes[key]=String(value);if(key==='id')this.id=value;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;}
    addEventListener(type,callback){(this.listeners[type]??=[]).push(callback);}
    dispatch(type,extra={}){const event={target:this,preventDefault(){this.defaultPrevented=true;},...extra};for(const callback of this.listeners[type]||[])callback(event);return event;}
    focus(){this.focused=true;}
    scrollIntoView(){this.scrolled=true;}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}
    click(){this.dispatch('click');}
  }
  const html=fs.readFileSync(path.join(__dirname,'../web/start/index.html'),'utf8'),root=new Element('#root'),stack=[root];
  for(const token of html.match(/<[^>]+>/g)){
    if(token.startsWith('<!'))continue;
    if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
    const match=token.match(/^<([\w-]+)/);if(!match)continue;
    const element=new Element(match[1]);
    for(const attr of token.matchAll(/([\w-]+)="([^"]*)"/g))element.setAttribute(attr[1],attr[2]);
    stack[stack.length-1].append(element);
    if(!['META','LINK','IMG','INPUT','BR','HR'].includes(element.tagName)&&!token.endsWith('/>'))stack.push(element);
  }
  const walk=node=>[node,...node.children.flatMap(walk)];
  const query=selector=>{
    const match=selector.match(/^(?:nav )?\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if(!match)throw new Error('Unsupported selector in harness: '+selector);
    return walk(root).filter(node=>Object.prototype.hasOwnProperty.call(node.attributes,match[1])&&(match[2]===undefined||node.attributes[match[1]]===match[2])&&(!selector.startsWith('nav ')||hasNavParent(node)));
  };
  const hasNavParent=node=>node.parent&&(node.parent.tagName==='NAV'||hasNavParent(node.parent));
  const document={documentElement:walk(root).find(node=>node.tagName==='HTML'),body:walk(root).find(node=>node.tagName==='BODY'),getElementById:id=>walk(root).find(node=>node.id===id)||null,createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('#fragment'),querySelectorAll:query,querySelector:selector=>query(selector)[0]||null};
  const values=new Map([['infra-commons:language','"en"'],['infra-commons:career-readiness-v1','keep']]);
  if(saved)values.set(model.storageKey,JSON.stringify(model.normalize(saved)));
  const calls=[];
  const storage={getItem(key){calls.push(['get',key]);if(deny.includes('get'))throw Error('denied');return values.get(key)??null;},setItem(key,value){calls.push(['set',key]);if(deny.includes('set'))throw Error('quota');values.set(key,value);},removeItem(key){calls.push(['remove',key]);if(deny.includes('remove'))throw Error('denied');values.delete(key);}};
  const window={};Object.defineProperty(window,'localStorage',{get(){if(deny.includes('access'))throw Error('denied');return storage;}});
  const location=new URL(url),history={replaceState(_state,_title,next){location.href=String(next);}};
  const context=vm.createContext({document,window,location,history,URL,URLSearchParams,Blob,setTimeout(){}});
  for(const file of ['start-model.js','start.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../web/start',file),'utf8'),context,{filename:file});
  return {document,values,calls,location,choose(id,value){document.getElementById(id).value=String(value);document.getElementById('start-form').dispatch('change',{target:document.getElementById(id)});},click(id){document.getElementById(id).click();},text(id){return document.getElementById(id).textContent;}};
}

test('the page opens the primer without a questionnaire and switches the first task with the learner’s background',()=>{
  const page = pageHarness();
  const firstLink = page.document.getElementById('hero-primer');
  const plan = page.document.getElementById('start-plan');
  assert.match(firstLink.href,/learn\/inference-101\/\?lang=en#day-1$/);
  assert.equal(plan.children[0].children[0].textContent,'AI inference from zero');
  assert.equal(plan.children[1].tagName,'DETAILS');
  assert.ok(!plan.children[1].open);
  assert.ok(!plan.children[0].textContent.includes('python3 lab.py'));
  page.click('start-language');
  assert.match(firstLink.href,/lang=zh#day-1$/);
  assert.equal(plan.children[0].children[0].textContent,'从零认识 AI 推理');
  page.choose('start-skill-python','comfortable');
  assert.ok(plan.textContent.includes('python3 lab.py day1'));
  page.click('start-reset');
  assert.equal(plan.children[0].children[0].textContent,'从零认识 AI 推理');
});

test('the optional inference preference survives language changes and reloads for an experienced programmer',()=>{
  const page = pageHarness({saved:{skills:allComfortable}});
  const field = page.document.getElementById('start-inference-first');
  assert.equal(field.checked,false);
  field.checked = true;
  page.document.getElementById('start-form').dispatch('change',{target:field});
  assert.equal(JSON.parse(page.values.get(model.storageKey)).newToInference,true);
  assert.ok(page.text('start-plan').includes('chose to start with model inference'));
  page.click('start-language');
  assert.equal(field.checked,true);
  assert.ok(page.text('start-plan').includes('选择了从模型推理启蒙开始'));
  const saved = JSON.parse(page.values.get(model.storageKey));
  const reload = pageHarness({saved});
  assert.equal(reload.document.getElementById('start-inference-first').checked,true);
  assert.ok(reload.text('start-plan').includes('AI inference from zero'));
  field.checked = false;
  page.document.getElementById('start-form').dispatch('change',{target:field});
  assert.ok(page.text('start-plan').includes('python3 lab.py day1'));
  assert.equal(JSON.parse(page.values.get(model.storageKey)).newToInference,false);
});

test('actual page gives role URL priority, updates recommendations and destinations on form change, and submits accessibly',()=>{
  const page=pageHarness({url:'https://supergroupli.github.io/AIinfra-JobHub/start/?role=platform-engineer&lang=en',saved:{role:'performance-engineer'}});
  assert.equal(page.document.getElementById('start-role').value,'platform-engineer');
  assert.match(page.document.getElementById('hero-project').href,/project=ray-backpressure/);
  page.choose('start-role','inference-engineer');
  assert.equal(page.location.searchParams.get('role'),'inference-engineer');
  assert.match(page.text('start-plan'),/Inference engineer/);
  assert.match(page.document.getElementById('hero-project').href,/project=serving-baseline/);
  assert.equal(JSON.parse(page.values.get(model.storageKey)).role,'inference-engineer');
  for(const skill of model.skills)page.choose('start-skill-'+skill.id,'comfortable');
  assert.match(page.text('start-plan'),/no extra review lessons were added/);
  assert.match(page.text('start-plan'),/does not verify your capability/);
  page.choose('start-skill-metrics','review');
  assert.match(page.text('start-plan'),/foundations · Day 3/);assert.match(page.text('start-plan'),/Calculate metrics from fixed request records/);
  const submit=page.document.getElementById('start-form').dispatch('submit');assert.equal(submit.defaultPrevented,true);assert.equal(page.document.getElementById('start-result').focused,true);assert.equal(page.document.getElementById('start-result').scrolled,true);
  page.click('start-language');assert.equal(page.document.documentElement.lang,'zh-CN');assert.equal(page.document.getElementById('start-role').value,'inference-engineer');assert.match(page.text('start-plan'),/推理工程师/);
});

test('actual page survives storage access/read/write denial and still updates its plan',()=>{
  for(const deny of [['access'],['get'],['set'],['get','set','remove']]){
    const page=pageHarness({deny});page.choose('start-role','platform-engineer');page.choose('start-hours',2);
    assert.match(page.text('start-plan'),/Platform engineer/);assert.match(page.text('start-plan'),/About 2 hours\/week/);
    assert.equal(page.location.searchParams.get('role'),'platform-engineer');
    if(deny.includes('set')||deny.includes('access'))assert.match(page.text('start-storage-status'),/could not be read or saved/);
    page.click('start-reset');assert.equal(page.document.getElementById('start-role').value,'inference-engineer');
    if(deny.includes('remove')||deny.includes('access'))assert.match(page.text('start-storage-status'),/stored data could not be cleared/);
  }
});

test('actual reset clears only this tool state and leaves language and other progress intact',()=>{
  const page=pageHarness({saved:{role:'platform-engineer',hardware:'multi',hours:10,skills:allComfortable}});
  const before=page.calls.length;page.click('start-reset');
  assert.deepEqual(page.calls.slice(before),[['remove',model.storageKey]]);
  assert.equal(page.values.has(model.storageKey),false);
  assert.equal(page.values.get('infra-commons:language'),'"en"');assert.equal(page.values.get('infra-commons:career-readiness-v1'),'keep');
  assert.equal(page.document.getElementById('start-hardware').value,'cpu');assert.equal(page.document.getElementById('start-skill-python').value,'unknown');
  assert.equal(page.location.searchParams.get('role'),'inference-engineer');assert.equal(page.location.searchParams.get('lang'),'en');
});

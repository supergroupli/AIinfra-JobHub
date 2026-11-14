"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../web/search/search-model.js');
const pair=(zh,en=zh)=>({zh,en});
const entry=(id,kind,title,body='',course='',day=0)=>({id:kind+':'+id+':'+day,kind,target:id,course,day,title:pair(title),summary:pair('Teaching explanation'),text:pair(body)});
function bank(){return {version:1,courses:[{id:'vllm',title:pair('vLLM')}],entries:[entry('vllm','lesson','KV cache capacity','算出内存预算 memory budget','vllm',2),entry('cache-transfer','concept','Cache transfer','KV cache transfer payload'),entry('tail-queue','case','Tail latency','Investigate queue waiting'),entry('serving-baseline','project','Service baseline','Keep latency evidence')]};}

test('search supports Day 20 only with the course’s declared duration',()=>{
  const data=bank();data.courses.push({id:'rsi-infra',title:pair('RSI Infra'),dayCount:20});
  const last=entry('rsi-infra','lesson','RSI capstone','final report','rsi-infra',20);data.entries.push(last);
  M.validate(data);assert.equal(M.href(last,'en'),'../learn/rsi-infra/?lang=en#day-20');
  data.entries[0].day=20;assert.throws(()=>M.validate(data));
});

test('bilingual deep search requires every token, normalizes width/case and ranks title matches first',()=>{
  const data=M.validate(bank());
  assert.equal(M.search(data.entries,'ＫＶ Cache')[0].entry.target,'vllm');
  assert.equal(M.search(data.entries,'内存')[0].entry.day,2);
  assert.equal(M.search(data.entries,'cache impossible').length,0);
  const record=entry('many','concept','a b c d e f g h','');
  assert.equal(M.search([record],'a b c d e f g h missing').length,0);
  assert.equal(M.search(data.entries,'cache',{kind:'concept'}).length,1);
  assert.equal(M.search(data.entries,'',{course:'vllm'}).length,1);
});
test('snippets locate deep matches, preserve text safely and limit display length',()=>{
  const record=entry('long','concept','Timing','x'.repeat(300)+' <img src=x onerror=alert(1)> needle '+'z'.repeat(400));
  const result=M.search([record],'needle')[0];assert.match(result.snippet,/needle/);assert.match(result.snippet,/<img/);assert.ok(result.snippet.length<=212);
});
test('destinations are generated from validated types and IDs, never taken from arbitrary URLs',()=>{
  assert.equal(M.href(bank().entries[0],'en'),'../learn/vllm/?lang=en#day-2');
  assert.equal(M.href(bank().entries[1]),'../knowledge/?topic=cache-transfer&lang=zh');
  for(const target of [null,undefined,12,'../evil','javascript:alert(1)'])assert.throws(()=>M.href({...bank().entries[0],target}));
  for(const change of [d=>d.entries.push(d.entries[0]),d=>d.entries[0].day=99,d=>d.entries[0].target=null,d=>d.courses[0].id=undefined,d=>delete d.entries[0].text.en]){const data=bank();change(data);assert.throws(()=>M.validate(data));}
});

// Executes the actual UI script; this is interaction coverage, not a rendering engine.
async function mount({url='https://example.test/JobHub/search/?lang=en',payload=bank(),failFirst=false,denyStorage=false}={}){
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.listeners={};this._text='';this._value='';}
    get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
    set textContent(v){this._text=String(v);this.children=[];}
    get value(){return this._value;}
    set value(v){this._value=this.tagName==='SELECT'&&!this.children.some(c=>c.value===String(v))?'':String(v);}
    append(...nodes){for(const child of nodes){this.children.push(child);child.parent=this;if(this.tagName==='SELECT'&&this.children.length===1)this._value=child.value;}}
    replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
    setAttribute(key,value){this.attributes[key]=String(value);if(key==='id')this.id=value;if(key==='value')this.value=value;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
    addEventListener(type,callback){(this.listeners[type]??=[]).push(callback);}
    dispatch(type){const event={target:this,preventDefault(){this.defaultPrevented=true;}};for(const fn of this.listeners[type]||[])fn(event);return event;}
    focus(){this.focused=true;}
    click(){this.dispatch('click');}
  }
  const root=new Element('root'),stack=[root];
  for(const token of fs.readFileSync(path.join(__dirname,'../web/search/index.html'),'utf8').match(/<[^>]+>/g)){
    if(token.startsWith('<!'))continue;if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
    const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const n=new Element(tag);
    for(const match of token.matchAll(/([\w-]+)="([^"]*)"/g))n.setAttribute(match[1],match[2]);stack.at(-1).append(n);
    if(!['META','LINK','IMG','INPUT','BR','HR'].includes(n.tagName))stack.push(n);
  }
  const walk=n=>[n,...n.children.flatMap(walk)],document={documentElement:walk(root).find(n=>n.tagName==='HTML'),getElementById:id=>walk(root).find(n=>n.id===id),createElement:tag=>new Element(tag),querySelectorAll:selector=>walk(root).filter(n=>Object.hasOwn(n.attributes,selector.slice(1,-1)))};
  let calls=0;const location=new URL(url),history={replaceState(a,b,next){location.href=String(next);}},storage={getItem(){if(denyStorage)throw Error('denied');return null;},setItem(){if(denyStorage)throw Error('denied');}};
  const context=vm.createContext({document,location,history,URL,URLSearchParams,localStorage:storage,fetch:async()=>{calls++;if(failFirst&&calls===1)throw Error('offline');return {ok:true,json:async()=>payload};}});
  for(const file of ['search-model.js','search.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../web/search',file),'utf8'),context,{filename:file});
  const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
  const get=id=>document.getElementById(id);
  return {get,document,location,flush,click:id=>get(id).click(),select(id,value){get(id).value=value;get(id).dispatch('change');},submit(query){get('learning-query').value=query;return get('search-form').dispatch('submit');},text:id=>get(id).textContent};
}
test('actual search UI applies deep links, synchronizes filters and preserves query across language changes',async()=>{
  const page=await mount({url:'https://example.test/search/?course=vllm&lang=en&q=cache'});
  assert.equal(page.get('learning-kind').value,'lesson');assert.equal(page.get('learning-course').value,'vllm');assert.match(page.text('search-count'),/1 results/);
  page.select('learning-kind','concept');assert.equal(page.get('learning-course').value,'');assert.match(page.text('search-results'),/Cache transfer/);
  const event=page.submit('cache missing');assert.equal(event.defaultPrevented,true);assert.match(page.text('search-results'),/No content matches/);
  page.click('search-language');assert.equal(page.get('learning-query').value,'cache missing');assert.equal(page.document.documentElement.lang,'zh-CN');
  page.click('search-reset');assert.equal(page.get('learning-query').value,'');assert.equal(page.location.searchParams.has('q'),false);assert.equal(page.get('learning-query').focused,true);
});
test('actual UI retries a failed index, tolerates blocked storage and keeps untrusted text inert',async()=>{
  const data=bank();data.entries[0].title=pair('<img src=x onerror=alert(1)>');
  const page=await mount({payload:data,failFirst:true,denyStorage:true});assert.equal(page.get('search-error').hidden,false);
  page.click('search-retry');await page.flush();assert.equal(page.get('search-error').hidden,true);assert.match(page.text('search-results'),/<img src=x/);
  const walk=n=>[n,...n.children.flatMap(walk)];assert.equal(walk(page.get('search-results')).some(n=>n.tagName==='IMG'),false);
  page.click('search-language');assert.equal(page.document.documentElement.lang,'zh-CN');
});
test('actual UI paginates and focuses new results without losing filters',async()=>{
  const data=bank();data.entries=Array.from({length:25},(_,i)=>entry('concept-'+i,'concept','Concept '+i));
  const page=await mount({payload:data});assert.equal(page.get('search-results').children.length,20);assert.equal(page.get('search-more').hidden,false);
  page.click('search-more');assert.equal(page.get('search-results').children.length,25);assert.equal(page.get('search-results').children[20].focused,true);assert.equal(page.get('search-more').hidden,true);
});

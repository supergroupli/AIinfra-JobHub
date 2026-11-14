'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const model=require('../web/knowledge/knowledge-model.js'),catalog=require('../web/knowledge/topics.json');
const topic=id=>catalog.topics.find(t=>t.id===id);

test('eighteen bilingual topics have complete teaching structure and real course references',()=>{
  assert.equal(model.validate(catalog),catalog);assert.equal(catalog.topics.length,18);
  for(const category of model.categories)assert.equal(catalog.topics.filter(t=>t.category===category).length,6);
  for(const t of catalog.topics){
    for(const lang of ['zh','en']){assert.ok(t.explain.every(p=>p[lang].length>70));assert.ok(t.example.steps.length>=3);assert.ok(t.check.answer[lang].length>20);}
    for(const ref of t.lessons){const course=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/courses',ref.course+'.json'),'utf8'));assert.ok(course.steps.find(s=>s.day===ref.day));}
    for(const source of t.sources)assert.ok(['docs.vllm.ai','huggingface.co','docs.pytorch.org','triton-lang.org','docs.nvidia.com','docs.ray.io','aws.amazon.com','kubernetes.io','github.com','sre.google'].includes(new URL(source.url).hostname));
  }
});

test('worked examples preserve independently calculated timing, memory and resource budgets',()=>{
  const en=id=>JSON.stringify(topic(id).example);
  assert.equal(40+10+30+9*12,188);assert.match(en('prefill-decode'),/188 ms/);
  assert.equal(2*32*8*128*2*4096*8/2**30,4);assert.match(en('kv-capacity'),/4 GiB/);
  assert.equal((Math.ceil(17/16)*16+Math.ceil(31/16)*16-48)/64,0.25);assert.match(en('paged-attention'),/25%/);
  assert.equal((4000-(1000+3*200))/4000,0.6);assert.match(en('prefix-caching'),/60%/);
  assert.match(en('continuous-batching'),/33.33/);assert.equal((20+40+40)/3,100/3);assert.match(topic('continuous-batching').check.answer.en,/50 ms/);
  assert.ok(Math.abs(((-1-(-.9))**2+(.2-.1)**2+(1.2-1.1)**2)/3-.01)<1e-12);assert.match(en('quantization'),/MSE.*0.01/);
  assert.equal((1*3+2*1)*4,20);assert.match(en('tensor-strides'),/20/);
  assert.ok(Math.abs(1e12/12/1e12-.0833333333)<1e-9);assert.match(en('roofline'),/0.0833/);
  assert.equal((20-12)/20,.4);assert.match(en('kernel-fusion'),/40%/);
  assert.equal(1-.1*(2+6)/2,.6);assert.match(en('gradient-accumulation'),/0.6/);
  assert.deepEqual([1,2,3,4].map((n,i)=>n+[10,20,30,40][i]),[11,22,33,44]);assert.match(en('all-reduce'),/11,22,33,44/);
  assert.equal(32/4+2+3+1,14);assert.match(en('sharding'),/14 GiB/);
  assert.equal(50/(120-100),2.5);assert.match(en('backpressure'),/2.5/);
  assert.equal(3**2,9);assert.match(en('retry-idempotency'),/3×3=9/);
  assert.equal(Math.ceil(2*30/10),6);assert.equal((50-40)*20,200);assert.match(en('queue-autoscaling'),/200/);
  assert.equal([2,2].some(free=>free>=3),false);assert.match(en('gpu-placement'),/remains Pending/);
  assert.equal(.25/8*1000+2,33.25);assert.match(en('cache-transfer'),/33.25/);
  assert.equal(140/100*100,140);assert.match(en('slo-budget'),/140%/);
});

test('catalog validation rejects unsafe links and broken semantic references',()=>{
  for(const url of ['javascript:alert(1)','https://user:password@example.test','http://example.test','https://example.test/ a'])assert.equal(model.safeURL(url),null);
  for(const change of [c=>c.topics[0].sources[0].url='javascript:alert(1)',c=>c.topics[0].related=['missing'],c=>c.topics[0].lessons[0].day=11,c=>c.topics[0].diagram=[],c=>c.topics[0].explain[0].en='',c=>c.topics.push(c.topics[0])]){const clone=JSON.parse(JSON.stringify(catalog));change(clone);assert.throws(()=>model.validate(clone));}
});

test('search works across languages and categories while topic selection stays within the catalog',()=>{
  assert.ok(model.filter(catalog.topics,'KV 容量').some(t=>t.id==='kv-capacity'));
  assert.ok(model.filter(catalog.topics,'retry idempotency','platform').some(t=>t.id==='retry-idempotency'));
  assert.equal(model.filter(catalog.topics,'no-such-token-xyz').length,0);
  assert.equal(model.select(catalog.topics,'https://evil.test'),null);
  assert.equal(model.topicURL('kv-capacity','en'),'?topic=kv-capacity&lang=en');
  assert.equal(model.lessonURL({course:'vllm',day:6},'en'),'../learn/vllm/?lang=en#day-6');
});

async function mount({url='https://example.test/knowledge/?topic=kv-capacity&lang=en',denied=false,failFirst=false,mobile=false}={}){
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this._text='';this.value='';this.hidden=false;this.open=true;}
    get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(v){this._text=String(v);this.children=[];}
    append(...children){children.forEach(child=>{this.children.push(child);child.parent=this;});}
    replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
    setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
    addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}async emit(type,extra={}){for(const f of this.listeners[type]||[])await f({target:this,preventDefault(){},...extra});}
    focus(){this.focused=true;}scrollIntoView(){this.scrolled=true;}
  }
  const html=fs.readFileSync(path.join(__dirname,'../web/knowledge/index.html'),'utf8'),root=new Element('root'),stack=[root];
  for(const token of html.match(/<[^>]+>/g)){
    if(token.startsWith('<!'))continue;if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
    const match=token.match(/^<([\w-]+)/);if(!match)continue;const el=new Element(match[1]);for(const a of token.matchAll(/([\w-]+)="([^"]*)"/g))el.setAttribute(a[1],a[2]);stack.at(-1).append(el);
    if(!['META','LINK','INPUT','IMG','BR','HR'].includes(el.tagName))stack.push(el);
  }
  const walk=node=>[node,...node.children.flatMap(walk)],document={documentElement:walk(root).find(n=>n.tagName==='HTML'),getElementById:id=>walk(root).find(n=>n.id===id)||null,createElement:tag=>new Element(tag),querySelectorAll:sel=>{const a=sel.match(/^\[([^\]]+)\]$/);if(!a)throw Error('unsupported selector');return walk(root).filter(n=>Object.hasOwn(n.attributes,a[1]));}};
  const events={},window={addEventListener:(type,fn)=>events[type]=fn},values=new Map(),location=new URL(url),history={pushState(_a,_b,next){location.href=String(next);},replaceState(_a,_b,next){location.href=String(next);}};
  const storage={getItem:k=>{if(denied)throw Error('denied');return values.get(k)||null;},setItem:(k,v)=>{if(denied)throw Error('denied');values.set(k,v);}};
  let calls=0;const context=vm.createContext({document,window,history,location,URL,URLSearchParams,matchMedia:()=>({matches:mobile}),localStorage:storage,fetch:async()=>{calls++;if(failFirst&&calls===1)throw Error('offline');return {ok:true,json:async()=>JSON.parse(JSON.stringify(catalog))};}});
  for(const file of ['knowledge-model.js','knowledge.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../web/knowledge',file),'utf8'),context,{filename:file});
  const settle=async()=>{await new Promise(resolve=>require('node:timers').setImmediate(resolve));};await settle();
  return {document,values,location,events,walk:()=>walk(root),settle,text:id=>document.getElementById(id).textContent,click:async id=>{await document.getElementById(id).emit('click');await settle();},change:async(id,value,type='input')=>{const node=document.getElementById(id);node.value=value;await node.emit(type);await settle();}};
}

test('actual controller follows topic URLs, supports bilingual details and navigates related concepts accessibly',async()=>{
  const p=await mount({mobile:true});assert.match(p.text('knowledge-reader'),/KV cache and GQA/);assert.match(p.text('knowledge-reader'),/4 GiB/);
  assert.equal(p.document.getElementById('knowledge-directory').open,false);assert.equal(p.document.getElementById('knowledge-handbook').href,'./handbook.en.md');
  const related=p.walk().find(n=>n.dataset.topic==='paged-attention');await related.emit('click');assert.equal(p.location.searchParams.get('topic'),'paged-attention');assert.ok(p.document.getElementById('knowledge-reader').focused);assert.match(p.text('knowledge-reader'),/25%/);
  await p.click('knowledge-language');assert.equal(p.document.documentElement.lang,'zh-CN');assert.match(p.text('knowledge-reader'),/逻辑连续/);assert.equal(p.document.getElementById('knowledge-handbook').href,'./handbook.zh.md');
  p.location.href='https://example.test/knowledge/?topic=slo-budget&lang=en';p.events.popstate();assert.match(p.text('knowledge-reader'),/140%/);
});

test('actual controller handles filtering, empty results and reset without replacing the selected reading',async()=>{
  const p=await mount();await p.change('knowledge-category','platform','change');assert.equal(p.text('knowledge-count'),'6 / 18 topics');
  await p.change('knowledge-query','no-match-xyz');assert.match(p.text('knowledge-list'),/No topics match/);assert.match(p.text('knowledge-reader'),/KV cache/);
  await p.click('knowledge-reset');assert.equal(p.text('knowledge-count'),'18 / 18 topics');
});

test('actual controller survives failed fetch, retries and denied storage while rejecting unknown topic navigation',async()=>{
  const p=await mount({failFirst:true,denied:true,url:'https://example.test/knowledge/?topic=%3Cscript%3E&lang=en'});assert.equal(p.document.getElementById('knowledge-error').hidden,false);
  await p.click('knowledge-retry');assert.equal(p.document.getElementById('knowledge-error').hidden,true);assert.match(p.text('knowledge-status'),/not recognized/);assert.match(p.text('knowledge-reader'),/Prefill and decode/);
  await p.click('knowledge-language');assert.equal(p.document.documentElement.lang,'zh-CN');assert.match(p.text('knowledge-reader'),/把等待拆开/);
  assert.ok(p.walk().filter(n=>n.tagName==='A'&&n.target==='_blank').every(n=>n.href.startsWith('https:')&&n.rel==='noopener noreferrer'));
});

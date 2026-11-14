'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../web/cases/cases-model.js'),catalog=require('../web/cases/cases.json');
const root=path.resolve(__dirname,'../web/cases');
test('nine bilingual cases provide exact course references and independent synthetic evidence',()=>{
 const items=M.validate(catalog);assert.equal(items.length,9);for(const category of M.categories)assert.equal(items.filter(c=>c.category===category).length,3);
 for(const c of items){assert.ok(c.evidence.length>=3);for(const lang of ['zh','en']){assert.ok(c.context[lang].trim());assert.ok(c.resolution[lang].trim());assert.ok(c.challenge[lang]);}for(const l of c.lessons){const course=require('../content/courses/'+l.course+'.json');assert.ok(course.steps.some(s=>s.day===l.day));}assert.ok(fs.existsSync(path.join(root,'../labs/diagnostics/fixtures',c.id+'.json')));}
});
test('filters search across languages, reject unknown selection and validate links',()=>{
 assert.ok(M.filter(catalog.cases,'rank','performance').some(c=>c.id==='ddp-scaling'));assert.equal(M.filter(catalog.cases,'探针')[0].id,'probe-confusion');assert.equal(M.filter(catalog.cases,'nonexistent').length,0);assert.equal(M.select(catalog.cases,'javascript:alert(1)'),null);
 for(const url of ['javascript:alert(1)','https://user:pass@example.com','http://example.com','garbage'])assert.equal(M.safeURL(url),null);
 const bad=structuredClone(catalog);bad.cases[0].sources[0].url='javascript:alert(1)';assert.throws(()=>M.validate(bad));const duplicate=structuredClone(catalog);duplicate.cases.push(duplicate.cases[0]);assert.throws(()=>M.validate(duplicate));
});
function mount({url='https://example.test/cases/?case=kv-capacity',fail=false,storageFail=false}={}){
 const ids=new Map(),nodes=[],events=new Map();let calls=0;const state={fail};let document;
 function element(tag='div'){
  const n={tagName:tag.toUpperCase(),children:[],dataset:{},attributes:{},events:{},textContent:'',value:'',hidden:false,disabled:false,open:false,href:'',
   append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.events[k]=fn;},focus(){document.activeElement=this;},scrollIntoView(){this.scrolled=true;},
   emit(k,extra={}){return this.events[k]?.({preventDefault(){},...extra});}};
  Object.defineProperty(n,'id',{get(){return this._id;},set(v){this._id=v;ids.set(v,this);}});nodes.push(n);return n;
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const match of html.matchAll(/<([a-z]+)\b([^>]+)>/g)){const attrs=match[2],id=attrs.match(/\bid="([^"]+)"/),i18n=attrs.match(/data-i18n="([^"]+)"/),language=attrs.match(/data-language-link="([^"]+)"/);if(!id&&!i18n&&!language)continue;const n=element(match[1]);if(id)n.id=id[1];if(i18n)n.dataset.i18n=i18n[1];if(language)n.dataset.languageLink=language[1];}
 document={documentElement:{},activeElement:null,getElementById:id=>ids.get(id),createElement:element,querySelectorAll:s=>nodes.filter(n=>s==='[data-i18n]'?n.dataset.i18n:s==='[data-language-link]'?n.dataset.languageLink:false)};
 const location=new URL(url),history={replaceState(_a,_b,target){location.href=String(target);},pushState(_a,_b,target){location.href=String(target);}};
 const storage={getItem(){if(storageFail)throw Error('blocked');return null;},setItem(){if(storageFail)throw Error('blocked');}};
 const context=vm.createContext({document,location,history,localStorage:storage,URL,URLSearchParams,console,fetch:async()=>{calls++;if(state.fail)throw Error('offline');return {ok:true,json:async()=>structuredClone(catalog)};},window:{addEventListener(k,fn){events.set(k,fn);}}});
 vm.runInContext(fs.readFileSync(path.join(root,'cases-model.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'cases.js'),'utf8'),context);
 const descendants=n=>[n,...(n.children||[]).flatMap(descendants)];
 return {ids,nodes,document,location,state,events,get calls(){return calls;},all:()=>descendants(ids.get('case-detail')),text:n=>descendants(n).map(x=>x.textContent).join(' '),flush:async()=>{for(let i=0;i<6;i++)await Promise.resolve();}};
}
test('actual controller opens one clue, reveals next deliberately and keeps solution closed',async()=>{
 const ui=mount();await ui.flush();const detail=ui.ids.get('case-detail');assert.equal(detail.hidden,false);assert.equal(ui.ids.get('case-clues').children.length,1);
 let next=ui.all().find(n=>n.tagName==='BUTTON'&&n.textContent==='打开下一条线索');next.emit('click');assert.equal(ui.ids.get('case-clues').children.length,2);next.emit('click');assert.equal(ui.ids.get('case-clues').children.length,3);assert.equal(next.disabled,true);
 assert.ok(ui.all().filter(n=>n.tagName==='DETAILS').every(n=>!n.open));assert.match(ui.text(detail),/4294967296/);
 ui.ids.get('cases-language').emit('click');assert.equal(ui.document.documentElement.lang,'en');assert.equal(ui.ids.get('case-clues').children.length,3);assert.equal(ui.ids.get('case-handbook').href,'./handbook.en.md');
});
test('actual controller filters and navigates safely, including history and unknown IDs',async()=>{
 const ui=mount({storageFail:true});await ui.flush();ui.ids.get('cases-search').value='DDP';ui.ids.get('cases-search').emit('input');assert.equal(ui.ids.get('cases-grid').children.length,1);
 const card=ui.ids.get('cases-grid').children[0],a=card.children.find(n=>n.tagName==='A');a.emit('click');assert.equal(ui.location.searchParams.get('case'),'ddp-scaling');assert.equal(ui.document.activeElement,ui.ids.get('case-detail'));assert.equal(ui.ids.get('case-clues').children.length,1);
 ui.location.search='?case=does-not-exist&lang=en';ui.events.get('popstate')();assert.equal(ui.ids.get('case-detail').hidden,true);assert.match(ui.ids.get('cases-status').textContent,/not found/);
});
test('actual controller reports load failure and recovers through retry without a false empty catalog',async()=>{
 const ui=mount({fail:true});await ui.flush();assert.equal(ui.ids.get('cases-retry').hidden,false);assert.equal(ui.ids.get('case-detail').hidden,true);assert.match(ui.ids.get('cases-status').textContent,/无法读取/);
 ui.state.fail=false;ui.ids.get('cases-retry').emit('click');await ui.flush();assert.equal(ui.calls,2);assert.equal(ui.ids.get('cases-retry').hidden,true);assert.equal(ui.ids.get('cases-grid').children.length,9);assert.equal(ui.ids.get('case-detail').hidden,false);
});

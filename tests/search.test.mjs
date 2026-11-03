import test from 'node:test';import assert from 'node:assert/strict';
import {searchValues,projectSearchPage} from '../public/project-search.js';
import {createCloudStore} from '../public/cloud-store.js';
test('busca exige trecho útil e filtro conhecido; preserva símbolos literais',()=>{
 assert.deepEqual(searchValues({query:'  A_B 100%  ',kind:'revision',project:'p',archived:'on'}),{query:'A_B 100%',kind:'revision',project:'p',archived:true});
 for(const query of ['','x','x'.repeat(121)])assert.throws(()=>searchValues({query,kind:'all'}));
 assert.throws(()=>searchValues({query:'texto',kind:'other'}));
 assert.equal(searchValues({query:'😀😀',kind:'all'}).query,'😀😀');
});
test('busca informa escopo e limite de conteúdo; estado inicial não afirma busca executada',()=>{
 const html=projectSearchPage({});assert.match(html,/Digite um trecho/);assert.match(html,/texto interno dos PDFs ainda não/);assert.doesNotMatch(html,/0 resultado\(s\)/);
 const empty=projectSearchPage({filter:{query:'xpto',kind:'all'},result:{items:[],total:0}});assert.match(empty,/Nenhum resultado/);assert.match(empty,/data-search-next disabled/);
});
test('resultados e filtros têm escape e ações correspondentes a cada tipo',()=>{
 const base={result_key:'document:fake',title:'<img>',excerpt:'<script>',project_name:'<svg>',project_code:'TEST'};
 const html=projectSearchPage({projects:[{id:'p',name:'<iframe>'}],filter:{query:'<script>',project:'p',kind:'all'},result:{total:4,has_more:true,items:[{...base,kind:'document'},{...base,kind:'revision',status:'ready'},{...base,kind:'task',archived:true},{...base,kind:'annotation',status:'resolved'}]}});
 assert.doesNotMatch(html,/<img>|<script>|<svg>|<iframe>/);assert.match(html,/&lt;img&gt;/);for(const label of ['Abrir revisões','Visualizar arquivo','Abrir tarefa','Ver marcação','Arquivado','Resolvida'])assert.match(html,new RegExp(label));
 assert.doesNotMatch(html,/data-search-next disabled/);
});
test('RPC usa texto e cursor como parâmetros e rejeita erro de acesso',async()=>{
 const calls=[],store=createCloudStore({rpc:async(name,args)=>{calls.push([name,args]);return {data:{items:[]},error:null};}}),filter={query:"%_ ' OR 1=1",project:'p',kind:'all',archived:false};
 await store.search(filter,'task:cursor');assert.deepEqual(calls,[['search_project_content',{p_query:filter.query,p_project_id:'p',p_kind:'all',p_include_archived:false,p_after:'task:cursor'}]]);
 await assert.rejects(createCloudStore({rpc:async()=>({data:null,error:{code:'42501'}})}).search(filter),/permissão/);
});
test('abertura de documento busca contexto completo por projeto, paginando mais de mil revisões',async()=>{
 const calls=[],revisions=Array.from({length:1001},(_,i)=>({id:String(i),project_id:'p',document_id:'d'}));
 class Query{constructor(table){this.table=table;this.filters=[];}select(){return this;}eq(k,v){this.filters.push([k,v]);return this;}in(k,v){this.allowed=v;return this;}order(){return this;}range(a,b){this.window=[a,b];return this;}maybeSingle(){this.single=true;return this;}then(resolve,reject){calls.push({table:this.table,filters:this.filters,window:this.window,ids:this.allowed});let rows=this.table==='documents'?[{id:'d',project_id:'p'}]:this.table==='document_revisions'?revisions:[];rows=rows.filter(r=>this.filters.every(([k,v])=>r[k]===v));if(this.window)rows=rows.slice(this.window[0],this.window[1]+1);return Promise.resolve({data:this.single?rows[0]||null:rows,error:null}).then(resolve,reject);}}
 const store=createCloudStore({from:table=>new Query(table)}),context=await store.searchDocument('p','d');assert.equal(context.revisions.length,1001);
 assert.deepEqual(calls.filter(c=>c.table==='document_revisions').map(c=>c.window),[[0,499],[500,999],[1000,1499]]);
 assert.ok(calls.every(c=>c.filters.some(([k,v])=>k==='project_id'&&v==='p')));assert.ok(calls.filter(c=>c.table==='revision_reviews').every(c=>c.ids.length<=100));
 await assert.rejects(store.searchDocument('other','d'),/indisponível/);
});

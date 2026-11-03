import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewPage,activityPage,activityAction,activityChanges,dateLabel,dateTimeLabel} from '../public/project-overview.js';
import {createCloudStore} from '../public/cloud-store.js';
const project={id:'project',code:'TEST',name:'Projeto de teste'},people=[{user_id:'u',display_name:'Pessoa de teste'}];
test('painel usa totais do servidor e não mistura dados de outro projeto',()=>{
 const overview={project_id:project.id,generated_at:'2026-11-03T01:00:00Z',today:'2026-11-02',counts:{overdue_tasks:1008,my_tasks:2},priority_tasks:[],my_tasks:[]};
 const html=overviewPage({project,projects:[project],overview});assert.match(html,/1008/);assert.match(html,/02\/11\/2026/);assert.match(html,/incluindo pausadas/);
 assert.doesNotMatch(overviewPage({project,projects:[project],overview:{...overview,project_id:'other'}}),/1008/);
 assert.match(overviewPage({project:null,projects:[]}),/Selecione um projeto/);
});
test('histórico resume mudanças e preserva papel da autoria sem usar autor original da tarefa',()=>{
 const event={action:'UPDATE',previous:{stage:'doing',assignee_id:'old'},current:{stage:'done',assignee_id:'u'}};
 assert.deepEqual(activityChanges(event,people),['Lista: Fazendo → Feito','Responsável: Participante sem vínculo atual → Pessoa de teste']);
 assert.equal(activityAction({action:'UPDATE',previous:{archived:true},current:{archived:false}}),'Restauração');
 assert.equal(activityAction({action:'UPDATE',previous:{},current:{revoked_at:'now'}}),'Revogação');
 assert.deepEqual(activityChanges({action:'INSERT',current:{stage:'done'}}),[]);
});
test('datas seguem São Paulo na virada do dia',()=>{assert.match(dateTimeLabel('2026-11-03T01:00:00Z'),/02\/11\/2026/);assert.equal(dateLabel(null),'Sem prazo');assert.equal(dateTimeLabel('bad'),'Data indisponível');});
test('títulos, mudanças, nomes e filas têm escape; histórico não imprime payload bruto',()=>{
 const event={event_id:'9007199254741111',actor_id:'u',entity_type:'project_tasks',action:'UPDATE',created_at:'2026-11-03T01:00:00Z',previous:{title:'Antes'},current:{title:'<script>teste</script>',email:'privado@bkm.com.br',object_path:'segredo',body:'texto privado'}};
 const html=activityPage({project,projects:[project],activity:{project_id:project.id,events:[event]},people:[{user_id:'u',display_name:'<img>'}]});
 assert.doesNotMatch(html,/<script>|<img>|privado@bkm|segredo|texto privado/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img&gt;/);
 const overview={project_id:project.id,counts:{},priority_tasks:[{id:'t',task_number:'1',title:'<svg>',stage:'todo',priority:'high',overdue:true}],my_tasks:[]};
 assert.doesNotMatch(overviewPage({project,projects:[],overview}),/<svg>/);
});
test('paginação só habilita direções disponíveis e mantém escopo do projeto',()=>{
 const activity={project_id:project.id,events:[],has_more:true,next_cursor:'9007199254741111'};
 let html=activityPage({project,projects:[],activity,hasPrevious:false});assert.match(html,/data-activity-prev disabled/);assert.doesNotMatch(html,/data-activity-next disabled/);
 html=activityPage({project,projects:[],activity:{...activity,project_id:'other'},hasPrevious:false});assert.match(html,/data-activity-next disabled/);
});
test('consultas operacionais enviam escopo e cursor como texto e propagam erro de permissão',async()=>{
 const calls=[];const store=createCloudStore({rpc:async(name,args)=>{calls.push([name,args]);return {data:{project_id:'p'},error:null};}});
 await store.overview('p');await store.activity('p','team','9007199254741111');
 assert.deepEqual(calls,[['project_overview',{p_project_id:'p'}],['project_activity',{p_project_id:'p',p_kind:'team',p_before:'9007199254741111',p_limit:25}]]);
 const denied=createCloudStore({rpc:async()=>({data:null,error:{code:'42501'}})});await assert.rejects(denied.overview('p'),/permissão/);
});

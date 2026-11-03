// Isolated browser QA client. Never imported by the production build.
import {taskOverdue,todayInSaoPaulo} from '../../public/task-model.js';
const OWNER='11111111-1111-4111-8111-111111111111',PROJECT='22222222-2222-4222-8222-222222222222',OTHER='99999999-9999-4999-8999-999999999999';
const today=todayInSaoPaulo(),old='2026-01-01';
const tasks=[{id:'66666666-6666-4666-8666-666666666666',title:'Conferir cotas da implantação',task_number:'1',stage:'doing',priority:'high',due_date:old,assignee_id:OWNER},{id:'77777777-7777-4777-8777-777777777777',title:'Revisar pranchas de arquitetura',task_number:'2',stage:'todo',priority:'medium',due_date:today,assignee_id:null},{id:'88888888-8888-4888-8888-888888888888',title:'Aguardar definição de fachada',task_number:'3',stage:'paused',priority:'low',due_date:old,pause_reason:'Aguardando definição',assignee_id:OWNER}].map(t=>({...t,project_id:PROJECT,description:'Tarefa fictícia para verificação da interface.',archived:false,author_name:'Pessoa fictícia',created_by:OWNER,created_at:'2026-11-02T12:00:00Z'}));
const data={projects:[{id:PROJECT,owner_id:OWNER,code:'QA-001',name:'Projeto fictício de homologação',city:'São Paulo',responsible_name:'Pessoa fictícia',status:'Em desenvolvimento',archived:false},{id:OTHER,owner_id:OWNER,code:'QA-002',name:'Segundo projeto · sem pendências',city:'São Paulo',status:'Em desenvolvimento',archived:false}],project_members:[],project_tasks:tasks,user_profiles:[{id:OWNER,full_name:'Pessoa fictícia',mobile:'+5511999999999'}]};
const activities=Array.from({length:57},(_,i)=>({event_id:(9007199254741111n-BigInt(i)).toString(),actor_id:OWNER,entity_type:i%2?'project_tasks':'document_revisions',action:i%2?'UPDATE':'INSERT',created_at:new Date(Date.UTC(2026,10,2,20,0)-i*60000).toISOString(),previous:i%2?{title:'Conferir cotas da implantação',stage:'todo'}:{},current:i%2?{title:'Conferir cotas da implantação',stage:'doing'}:{revision_code:`R${String(i).padStart(2,'0')}`,upload_state:'pending'}}));
class Query{
 constructor(table){this.table=table;this.filters=[];}
 select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}order(){return this;}is(k,v){this.filters.push(r=>(r[k]??null)===v);return this;}
 single(){this.one=true;return this;}maybeSingle(){this.one=true;return this;}
 then(resolve,reject){const rows=(data[this.table]||[]).filter(r=>this.filters.every(f=>f(r)));return Promise.resolve({data:structuredClone(this.one?rows[0]||null:rows),error:null}).then(resolve,reject);}
}
export function createClient(){return {auth:{async getUser(){return {data:{user:{id:OWNER,email:'ficticio@bkm.com.br',app_metadata:{providers:['email']}}},error:null};},onAuthStateChange(){}},from(table){return new Query(table);},async rpc(name,args={}){
 if(name==='accept_project_access')return {data:0,error:null};
 if(name==='project_people')return {data:[{user_id:OWNER,display_name:'Pessoa fictícia',project_role:'owner'}],error:null};
 if(name==='project_overview'){
  const selected=tasks.filter(t=>t.project_id===args.p_project_id),active=selected.filter(t=>!t.archived&&t.stage!=='done'),mine=active.filter(t=>t.assignee_id===OWNER),full=args.p_project_id===PROJECT;
  return {data:{project_id:args.p_project_id,generated_at:new Date().toISOString(),today,counts:{documents:full?8:0,ready_revisions:full?12:0,pending_uploads:full?1:0,pending_reviews:full?2:0,open_annotations:full?5:0,active_tasks:active.length,my_tasks:mine.length,paused_tasks:active.filter(t=>t.stage==='paused').length,overdue_tasks:active.filter(t=>taskOverdue(t)).length},priority_tasks:active.filter(t=>t.stage!=='paused').map(t=>({...t,overdue:taskOverdue(t)})),my_tasks:mine.map(t=>({...t,overdue:taskOverdue(t)}))},error:null};
 }
 if(name==='project_activity'){
  const selected=(args.p_project_id===PROJECT?activities:[]).filter(e=>(args.p_kind==='all'||e.entity_type===args.p_kind)&&(!args.p_before||BigInt(e.event_id)<BigInt(args.p_before)));
  const page=selected.slice(0,args.p_limit);return {data:{project_id:args.p_project_id,events:page,has_more:selected.length>args.p_limit,next_cursor:page.at(-1)?.event_id||null},error:null};
 }
 return {data:null,error:{message:'Operação de escrita indisponível neste teste isolado.'}};
 }};}

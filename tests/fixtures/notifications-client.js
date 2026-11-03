// Browser-only QA: all identities and notifications are fictional, in memory.
import {createClient as createCoreClient} from './overview-client.js';
const PROJECT='22222222-2222-4222-8222-222222222222',OTHER='99999999-9999-4999-8999-999999999999',TASK='66666666-6666-4666-8666-666666666666';
const notices=Array.from({length:37},(_,i)=>({id:(9007199254741111n-BigInt(i)).toString(),project_id:i%4===0?OTHER:PROJECT,project_code:i%4===0?'QA-002':'QA-001',project_name:i%4===0?'Segundo projeto · sem pendências':'Projeto fictício de homologação',kind:i%4===0?'review_requested':i%3===0?'task_comment':'task_assigned',target_id:i%4===0?'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':TASK,title:i%4===0?'Análise solicitada: ARQ-001 · revisão R00':i%3===0?'Novo comentário na tarefa: Conferir cotas da implantação':'Tarefa atribuída a você: Conferir cotas da implantação',created_at:new Date(Date.UTC(2026,10,3,2,0)-i*60000).toISOString(),read_at:i===36?'2026-11-03T03:00:00Z':null}));
export function createClient(){const client=createCoreClient(),rpc=client.rpc;client.rpc=async(name,args={})=>{
 if(name==='list_notifications'){
  const scoped=notices.filter(n=>!args.p_project_id||n.project_id===args.p_project_id),selected=scoped.filter(n=>(!args.p_unread||!n.read_at)&&(!args.p_before||BigInt(n.id)<BigInt(args.p_before))),items=selected.slice(0,25);
  return {data:{items:structuredClone(items),unread_count:scoped.filter(n=>!n.read_at).length,through_id:scoped[0]?.id||null,next_cursor:items.at(-1)?.id||null,has_more:selected.length>25},error:null};
 }
 if(name==='mark_notification'){const notice=notices.find(n=>n.id===args.p_notification_id);if(notice)notice.read_at=args.p_read?new Date().toISOString():null;return {data:notice?1:0,error:null};}
 if(name==='mark_notifications_read'){let count=0;notices.filter(n=>(!args.p_project_id||n.project_id===args.p_project_id)&&BigInt(n.id)<=BigInt(args.p_through)&&!n.read_at).forEach(n=>{n.read_at=new Date().toISOString();count++;});return {data:count,error:null};}
 return rpc(name,args);
 };return client;}

import test from 'node:test';import assert from 'node:assert/strict';
import {notificationsPage,readAllForm,unreadBadge} from '../public/notifications-ui.js';
import {createCloudStore} from '../public/cloud-store.js';
const notice={id:'9007199254741111',project_id:'p',project_code:'P1',project_name:'Projeto teste',kind:'task_assigned',title:'Tarefa atribuída a você: Conferir cotas',created_at:'2026-11-03T01:00:00Z',read_at:null};
test('avisos distinguem lido/não lido, tarefa/análise e habilitam leitura em lote',()=>{
 const html=notificationsPage({inbox:{items:[notice,{...notice,id:'2',kind:'review_decided',read_at:'now'}],unread_count:1,through_id:notice.id,has_more:true}});
 assert.match(html,/Abrir tarefa/);assert.match(html,/Ver análises/);assert.match(html,/Marcar como lido/);assert.match(html,/Marcar como não lido/);
 assert.match(html,/data-notifications-prev disabled/);assert.doesNotMatch(html,/data-notifications-next disabled/);assert.doesNotMatch(html,/data-notifications-read-all disabled/);
});
test('estado vazio e falha inicial não afirmam ter carregado avisos',()=>{
 assert.match(notificationsPage({inbox:null}),/Use Atualizar/);
 const html=notificationsPage({inbox:{items:[],unread_count:0}});assert.match(html,/Nenhum aviso/);assert.match(html,/data-notifications-read-all disabled/);
});
test('títulos, nomes e formulários de leitura usam escape',()=>{
 const inbox={items:[{...notice,title:'<script>teste</script>',project_name:'<img>'}],unread_count:1,through_id:'1'};
 for(const html of [notificationsPage({inbox,projects:[{id:'p',name:'<svg>'}]}),readAllForm(inbox,'<img>')]){assert.doesNotMatch(html,/<script>|<img>|<svg>/);assert.match(html,/&lt;/);}
});
test('badge limita exibição, sem converter identificadores para número',()=>{assert.equal(unreadBadge(0),'0');assert.equal(unreadBadge(250),'99+');assert.equal(unreadBadge(null),'—');assert.equal(unreadBadge('bad'),'—');});
test('RPCs de caixa pessoal não aceitam destinatário; cursor e limite de lote preservam precisão',async()=>{
 const calls=[],store=createCloudStore({rpc:async(name,args)=>{calls.push([name,args]);return {data:{items:[]},error:null};}});
 await store.notifications('p',false,notice.id);await store.markNotification(notice.id,false);await store.markNotificationsRead(notice.id,'p');
 assert.deepEqual(calls,[['list_notifications',{p_project_id:'p',p_unread:false,p_before:notice.id}],['mark_notification',{p_notification_id:notice.id,p_read:false}],['mark_notifications_read',{p_through:notice.id,p_project_id:'p'}]]);
});


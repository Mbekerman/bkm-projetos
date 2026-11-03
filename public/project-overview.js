import {esc} from './project-ui.js';
import {taskCode,taskStage,TASK_STAGES,TASK_PRIORITIES} from './task-model.js';

export const ACTIVITY_KINDS=[['all','Todas'],['project_tasks','Tarefas'],['task_comments','Comentários de tarefas'],['documents','Documentos'],['document_revisions','Revisões e envios'],['revision_reviews','Análises'],['document_annotations','Marcações'],['folders','Pastas'],['team','Equipe'],['projects','Projeto']];
const entityLabels={project_tasks:'Tarefa',task_comments:'Comentário de tarefa',documents:'Documento',document_revisions:'Revisão',revision_reviews:'Análise',document_annotations:'Marcação',folders:'Pasta',project_members:'Participação',project_access_invites:'Autorização',projects:'Projeto'};
const labels=Object.fromEntries([...TASK_STAGES,...TASK_PRIORITIES,['open','Aberta'],['resolved','Resolvida'],['in_review','Em análise'],['approved','Aprovada'],['approved_with_comments','Com ressalvas'],['changes_requested','Ajustes solicitados'],['editor','Editor'],['reader','Leitor'],['pending','Pendente'],['ready','Recebido']]);
export const dateLabel=value=>value&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):'Sem prazo';
export function dateTimeLabel(value){const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Data indisponível';}
function selector(project,projects){return `<label class="overview-project">Projeto<select id="cloud-project">${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===project.id?'selected':''}>${esc(p.name)}${p.archived?' (arquivado)':''}</option>`).join('')}</select></label>`;}
function noProject(){return '<div class="empty"><h1>Selecione um projeto</h1><button data-cloud-view="projects">Ver projetos</button></div>';}
function taskQueue(rows,people){return rows.length?rows.map(t=>`<article class="overview-task ${t.overdue?'is-late':''}"><div><strong>${esc(taskCode(t))} · ${esc(t.title)}</strong><p>${esc(taskStage(t))} · ${esc(labels[t.priority]||t.priority)} · ${esc(dateLabel(t.due_date))}${t.overdue?' · Atrasada':''}</p><small>${esc(people.find(p=>p.user_id===t.assignee_id)?.display_name||(t.assignee_id?'Responsável sem vínculo atual':'Sem responsável'))}</small></div><button data-open-task="${esc(t.id)}">Abrir tarefa</button></article>`).join(''):'<p class="empty">Nenhuma tarefa nesta seleção.</p>';}
export function overviewPage({project,projects,overview,people=[]}){
 if(!project)return noProject();
 const header=`<div class="cloud-header"><div><p class="eyebrow">${esc(project.code)}</p><h1>Visão geral</h1><p>${esc(project.name)}${project.archived?' · Arquivado, somente consulta':''}</p></div><button data-refresh>Atualizar</button></div>${selector(project,projects)}`;
 if(!overview||overview.project_id!==project.id)return header+'<p class="note">Use Atualizar para carregar os indicadores.</p>';
 const c=overview.counts;
 const cards=[['overdue_tasks','Tarefas atrasadas','Abertas, sem pausa e com prazo anterior a hoje.'],['my_tasks','Minhas tarefas abertas','Inclui tarefas pausadas atribuídas a você.'],['pending_reviews','Revisões em análise','Solicitações ainda aguardando parecer.'],['pending_uploads','Envios pendentes','Revisões cujo arquivo ainda não foi confirmado.'],['open_annotations','Marcações abertas','Em todas as revisões, sem as removidas.'],['active_tasks','Tarefas abertas','Inclui pausadas; exclui concluídas e arquivadas.'],['paused_tasks','Tarefas pausadas','Prazos continuam visíveis, sem contar como atraso.'],['documents','Documentos',`${Number(c.ready_revisions)||0} revisões com arquivo recebido.`]];
 return header+`<p class="muted overview-updated">Atualizado em ${esc(dateTimeLabel(overview.generated_at))} · Prazos pelo dia ${esc(dateLabel(overview.today))}, horário de São Paulo.</p><div class="overview-metrics">${cards.map(([key,title,hint])=>`<article class="panel metric ${key==='overdue_tasks'&&c[key]>0?'metric-alert':''}"><h2>${title}</h2><strong>${Number(c[key])||0}</strong><p>${esc(hint)}</p></article>`).join('')}</div><div class="cloud-actions overview-shortcuts"><button data-cloud-view="tasks">Ver tarefas</button><button data-cloud-view="approvals">Ver análises</button><button data-cloud-view="files">Ver documentos e envios</button><button data-cloud-view="activity">Histórico de alterações</button></div><div class="overview-queues"><section class="panel"><h2>Próximas tarefas do projeto</h2><p class="muted">Até 8 abertas, sem pausa. Atrasos primeiro, depois prazo e prioridade.</p>${taskQueue(overview.priority_tasks,people)}</section><section class="panel"><h2>Minhas tarefas abertas</h2><p class="muted">Até 8 atribuídas a você neste projeto, incluindo pausadas.</p>${taskQueue(overview.my_tasks,people)}</section></div>`;
}
export function activityAction(event){const a=event.previous||{},b=event.current||{};
 if(event.action==='INSERT')return 'Criação';if(event.action==='DELETE')return 'Remoção';
 if(!a.revoked_at&&b.revoked_at)return 'Revogação';if(!a.accepted_at&&b.accepted_at)return 'Acesso aplicado';
 if(!a.deleted_at&&b.deleted_at)return 'Marcação removida';if(a.archived!==b.archived&&b.archived!==undefined)return b.archived?'Arquivamento':'Restauração';
 return 'Alteração';
}
export function activityChanges(event,people=[]){const a=event.previous||{},b=event.current||{};
 const keys=[['name','Nome'],['title','Título'],['code','Código'],['stage','Lista'],['priority','Prioridade'],['due_date','Prazo'],['assignee_id','Responsável'],['status','Situação'],['role','Papel'],['upload_state','Arquivo']];
 const format=(key,value)=>key==='assignee_id'?(value?(people.find(p=>p.user_id===value)?.display_name||'Participante sem vínculo atual'):'Sem responsável'):key==='due_date'?dateLabel(value):labels[value]||String(value??'—');
 return event.action==='UPDATE'?keys.filter(([key])=>Object.hasOwn(b,key)&&a[key]!==b[key]).map(([key,label])=>`${label}: ${format(key,a[key])} → ${format(key,b[key])}`):[];
}
export function activityPage({project,projects,activity,kind='all',hasPrevious=false,people=[]}){
 if(!project)return noProject();
 const events=activity?.project_id===project.id?activity.events:[];
 return `<div class="cloud-header"><div><p class="eyebrow">${esc(project.code)}</p><h1>Histórico de alterações</h1><p>${esc(project.name)} · Registros de criação, alterações e revogações.</p></div><button data-refresh>Atualizar</button></div><div class="review-filters">${selector(project,projects)}<label>Tipo de atividade<select id="activity-kind">${ACTIVITY_KINDS.map(([value,label])=>`<option value="${value}" ${value===kind?'selected':''}>${label}</option>`).join('')}</select></label></div><p class="muted">Mais recentes primeiro, pela ordem de registro. Datas no horário de São Paulo. Este histórico não registra leitura ou download de arquivos.</p><section class="panel activity-list">${events.map(event=>{
  const row=event.current&&Object.keys(event.current).length?event.current:event.previous||{};
  const target=row.title||row.name||row.code||(row.revision_code?`Revisão ${row.revision_code}`:row.page_number?`Página ${row.page_number}`:'');
  const actor=people.find(p=>p.user_id===event.actor_id)?.display_name||(event.actor_id?'Participante sem vínculo atual':'Sistema');
  const changes=activityChanges(event,people);
  return `<article class="activity-item"><p class="activity-meta">${esc(dateTimeLabel(event.created_at))} · ${esc(actor)}</p><h2>${esc(entityLabels[event.entity_type]||'Registro')} · ${esc(activityAction(event))}</h2>${target?`<p>${esc(target)}</p>`:''}${changes.length?`<ul>${changes.map(text=>`<li>${esc(text)}</li>`).join('')}</ul>`:'<p class="muted">Evento registrado no projeto.</p>'}</article>`;
 }).join('')||'<p class="empty">Nenhuma atividade nesta seleção.</p>'}</section><div class="cloud-actions activity-pages"><button data-activity-prev ${hasPrevious?'':'disabled'}>← Mais recentes</button><button data-activity-next ${activity?.project_id===project.id&&activity.has_more?'':'disabled'}>Mais antigas →</button></div>`;
}

// Adapted from Terrenos fluxo list model and tkAtras/tkConcluir rules.
export const TASK_STAGES=[['backlog','Backlog'],['todo','Fazer'],['doing','Fazendo'],['waiting','Aguardando retorno'],['paused','Pausadas'],['done','Feito']];
export const TASK_PRIORITIES=[['low','Baixa'],['medium','Média'],['high','Alta']];
export const taskCode=task=>`TAR-${String(task.task_number).padStart(6,'0')}`;
export const taskStage=task=>TASK_STAGES.find(([key])=>key===task.stage)?.[1]||'Fazer';
export function todayInSaoPaulo(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export const taskOverdue=(task,today=todayInSaoPaulo())=>!task.archived&&!['done','paused'].includes(task.stage)&&!!task.due_date&&task.due_date<today;
export function taskValues(values){
 const title=String(values.title||'').trim(),description=String(values.description||'').trim(),pause_reason=String(values.pause_reason||'').trim();
 if(!title||title.length>150)throw Error('Informe um título de até 150 caracteres.');if(description.length>5000||pause_reason.length>2000)throw Error('Descrição ou motivo da pausa excede o limite.');
 if(!TASK_STAGES.some(([key])=>key===values.stage)||!TASK_PRIORITIES.some(([key])=>key===values.priority))throw Error('Selecione lista e prioridade válidas.');
 if(values.stage==='paused'&&!pause_reason)throw Error('Informe o motivo da pausa.');
 for(const key of ['start_date','due_date'])if(values[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(values[key])||!Number.isFinite(Date.parse(values[key]))||new Date(values[key]).toISOString().slice(0,10)!==values[key]))throw Error('Informe uma data válida.');
 if(values.start_date&&values.due_date&&values.due_date<values.start_date)throw Error('O prazo deve ser igual ou posterior ao início.');
 return {title,description,stage:values.stage,priority:values.priority,assignee_id:values.assignee_id||null,start_date:values.start_date||null,due_date:values.due_date||null,pause_reason:values.stage==='paused'?pause_reason:'',document_id:values.document_id||null,revision_id:values.revision_id||null,annotation_id:values.annotation_id||null};
}
export function filterTasks(tasks,{query='',assignee='',priority='',overdue=false,archived=false,today=todayInSaoPaulo()}={}){const q=query.trim().toLocaleLowerCase('pt-BR');return tasks.filter(t=>t.archived===archived&&(!assignee||t.assignee_id===assignee)&&(!priority||t.priority===priority)&&(!overdue||taskOverdue(t,today))&&(!q||`${taskCode(t)} ${t.title} ${t.description}`.toLocaleLowerCase('pt-BR').includes(q)));}

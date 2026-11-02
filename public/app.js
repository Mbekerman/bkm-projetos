import { seed, PROJECT_STATUSES, saveProject, archiveProject, saveFolder, folderPath, writableProject } from './model.js';
import { createRepository } from './repository.js';
import { esc, actions, projectForm, projectDetails, directories as directoryView, folderForm, documentForm } from './project-ui.js';
let storage; try { storage=window.localStorage; } catch { storage={getItem(){throw Error()},setItem(){throw Error()}}; }
const repository=createRepository(storage);
let data=repository.data;
let context={}; try { context=JSON.parse(storage.getItem('bkm-projetos-context-v2'))||{}; } catch {}
const state={view:'projetos',query:'',filter:'Todos',project:context.project||data.projects[0]?.id,folder:context.folder||null,taskView:'Quadro',taskProject:null};
function persistContext(){try{storage.setItem('bkm-projetos-context-v2',JSON.stringify({project:state.project,folder:state.folder}))}catch{}}
function navigate(view,project){if(project){state.project=project;state.folder=null}state.query='';document.getElementById('search').value='';persistContext();if(location.hash==='#'+view)render();else location.hash=view}
const main=document.getElementById('main'),dialog=document.getElementById('modal');let timer;
const name=id=>data.projects.find(p=>p.id===id)?.name??'Sem projeto';
const matches=v=>String(v).toLocaleLowerCase().includes(state.query.toLocaleLowerCase());
const tag=v=>`<span class="tag ${['Aprovado','Concluída','Concluído'].includes(v)?'ok':v==='Em análise'?'warn':''}">${esc(v)}</span>`;
function toast(s){const e=document.getElementById('toast');e.textContent=s;e.style.display='block';clearTimeout(timer);timer=setTimeout(()=>e.style.display='none',3500)}
function modal(title,body){if(dialog.open)dialog.close();document.getElementById('modal-body').innerHTML=`<div class="dialog-heading"><h2>${esc(title)}</h2><button data-act="close" aria-label="Fechar">×</button></div>${body}`;dialog.showModal()}
function heading(title,desc,button=''){return `<p class="eyebrow">Engenharia / ${esc(title)}</p><div class="page-heading"><div><h1>${title}</h1><p class="muted">${desc}</p></div>${button}</div><form class="mobile-search" data-form="search"><label class="sr" for="query-mobile">Buscar</label><div class="search-row"><input id="query-mobile" name="query" value="${esc(state.query)}" placeholder="Buscar nesta seção"><button>Buscar</button></div></form>`}
function projects(){const rows=data.projects.filter(p=>matches(p.code+' '+p.name+' '+p.city+' '+p.owner)&&(state.filter==='Arquivados'?p.archived:!p.archived&&(state.filter==='Todos'||p.status===state.filter)));return heading('Projetos','Organize os documentos e acompanhe o trabalho da equipe.','<button class="primary" data-act="project">+ Novo projeto</button>')+`<div class="stats"><div class="stat">Projetos em desenvolvimento<b>${data.projects.filter(p=>!p.archived&&p.status!=='Concluído').length}</b></div><div class="stat">Documentos em análise<b>${data.documents.filter(d=>d.status==='Em análise'&&!data.projects.find(p=>p.id===d.project)?.archived).length}</b></div><div class="stat">Tarefas abertas<b>${data.tasks.filter(t=>t.status!=='Concluída'&&!data.projects.find(p=>p.id===t.project)?.archived).length}</b></div></div><div class="toolbar"><div class="chips">${['Todos',...PROJECT_STATUSES,'Arquivados'].map(v=>`<button class="chip ${state.filter===v?'active':''}" data-filter="${v}">${v}</button>`).join('')}</div><span class="muted">${rows.length} projeto(s)</span></div><div class="grid">${rows.map(p=>{const ds=data.documents.filter(d=>d.project===p.id),percent=ds.length?Math.round(ds.filter(d=>d.status==='Aprovado').length/ds.length*100):0;return `<article class="project-card"><div class="project-art"><img src="assets/projetos.svg" alt=""><span class="code">${esc(p.code)}</span></div><div class="card-body">${tag(p.archived?'Arquivado':p.status)}<h2>${esc(p.name)}</h2><p class="muted">${esc(p.city)}</p><div class="card-meta"><span>${ds.length} documentos</span><span>${percent}% aprovados</span></div><div class="progress"><span style="width:${percent}%"></span></div><div class="card-footer"><span class="initials">EQ</span><button class="quiet" data-open="${esc(p.id)}" aria-label="Abrir projeto ${esc(p.name)}">Abrir projeto →</button></div></div></article>`}).join('')}</div>${rows.length?'':'<div class="empty">Nenhum projeto corresponde à busca.</div>'}`}
function directories(){return directoryView(data,state,heading)}
function taskCard(t){return `<article class="task"><span class="muted">${esc(name(t.project))}</span><h3>${esc(t.title)}</h3><div class="task-meta"><span>${esc(t.owner)}</span><button class="quiet" data-task="${t.id}">Abrir</button></div></article>`}
function tasks(){const rows=data.tasks.filter(t=>(!state.taskProject||t.project===state.taskProject)&&matches(t.title+' '+name(t.project)));return heading('Tarefas','Pendências, responsáveis e próximos passos em um só lugar.','<button class="primary" data-act="task">+ Nova tarefa</button>')+`<div class="toolbar"><div class="chips">${['Quadro','Lista'].map(v=>`<button class="chip ${state.taskView===v?'active':''}" data-taskview="${v}">${v}</button>`).join('')}</div><span class="muted">${rows.length} tarefa(s)${state.taskProject?' · '+esc(name(state.taskProject)):''}</span>${state.taskProject?'<button data-act="all-tasks">Todos os projetos</button>':''}</div>`+(state.taskView==='Quadro'?`<div class="board">${['A fazer','Em andamento','Concluída'].map(s=>`<section class="column"><h2 class="column-title"><span>${s}</span><span class="muted">${rows.filter(t=>t.status===s).length}</span></h2>${rows.filter(t=>t.status===s).map(taskCard).join('')}</section>`).join('')}</div>`:`<div class="panel table-wrap"><table><thead><tr><th>Tarefa</th><th>Projeto</th><th>Responsável</th><th>Situação</th></tr></thead><tbody>${rows.map(t=>`<tr><td><button class="quiet" data-task="${t.id}">${esc(t.title)}</button></td><td>${esc(name(t.project))}</td><td>${esc(t.owner)}</td><td>${tag(t.status)}</td></tr>`).join('')}</tbody></table></div>`)}
function settings(){return heading('Configurações','Preferências deste ambiente de desenvolvimento.')+`<div class="panel settings"><div class="settings-row"><div><h2>Aparência</h2><p class="muted">Claro, escuro ou automático pelo aparelho.</p></div><button data-act="theme">Alterar tema</button></div><div class="settings-row"><div><h2>Dados de demonstração</h2><p class="muted">As alterações ficam neste navegador.</p></div><button data-act="reset">Restaurar exemplos</button></div><div class="settings-row"><div><h2>Integração de dados</h2><p class="muted">Desconectada. Nenhuma alteração no Supabase ou no Terrenos. Versão 0.2 · Projetos e pastas.</p></div>${tag('Demonstração')}</div></div>`}
function icons(){const dark=document.documentElement.dataset.theme==='dark';document.querySelectorAll('img[src^="assets/"]').forEach(i=>{if(i.getAttribute('src').includes('logo'))return;i.src=i.getAttribute('src').replace(/(-dark)?\.svg$/,dark?'-dark.svg':'.svg')})}
function render(){
 if(!data.projects.some(p=>p.id===state.project))state.project=data.projects[0]?.id;
 if(!data.folders.some(f=>f.id===state.folder&&f.project===state.project))state.folder=null;
 main.innerHTML=(repository.warning?`<p class="note" role="alert">${esc(repository.warning)}</p>`:'')+({projetos:projects,projeto:()=>projectDetails(data,state,heading),diretorios:directories,tarefas:tasks,configuracoes:settings}[state.view]??projects)();
 document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===state.view||state.view==='projeto'&&b.dataset.view==='projetos';b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 document.getElementById('create').textContent=state.view==='tarefas'?'+ Criar tarefa':'+ Criar projeto';icons();
}
let preference;try{preference=storage.getItem('bkm-projetos-theme')||'auto'}catch{preference='auto'}if(!['light','dark','auto'].includes(preference))preference='auto';const media=matchMedia('(prefers-color-scheme: dark)');
function theme(v){preference=v;document.documentElement.dataset.theme=v==='auto'?(media.matches?'dark':'light'):v;document.getElementById('theme').value=v;try{storage.setItem('bkm-projetos-theme',v)}catch{}icons()}
theme(preference);media.addEventListener('change',()=>{if(preference==='auto')theme('auto')});document.getElementById('theme').addEventListener('change',e=>theme(e.target.value));document.getElementById('search').addEventListener('input',e=>{state.query=e.target.value;render()});
const options=()=>data.projects.filter(p=>!p.archived).map(p=>`<option value="${esc(p.id)}" ${p.id===state.project?'selected':''}>${esc(p.name)}</option>`).join('');
function create(kind){
 if(kind==='project')return modal('Novo projeto',projectForm(data));
 if(!data.projects.some(p=>!p.archived))return toast('Crie ou restaure um projeto antes de adicionar registros.');
 if(kind==='task')modal('Nova tarefa',`<form class="form-grid" data-form="task"><label>Título<input name="title" required maxlength="150"></label><label>Projeto<select name="project">${options()}</select></label><label>Responsável<input name="owner" required maxlength="80" value="Equipe de Engenharia"></label>${actions}</form>`);
 if(kind==='document')modal('Adicionar documento',documentForm(data,state));
}
function task(id){const t=data.tasks.find(t=>t.id===id);if(!t)return;modal(t.title,`<p class="muted">${esc(name(t.project))}${data.projects.find(p=>p.id===t.project)?.archived?' · Projeto arquivado: alterações bloqueadas.':''}</p><form class="form-grid" data-form="status" data-id="${t.id}"><label>Situação<select name="status">${['A fazer','Em andamento','Concluída'].map(s=>`<option ${s===t.status?'selected':''}>${s}</option>`).join('')}</select></label>${actions}</form><h2 style="margin-top:24px">Comentários</h2>${t.comments.map(c=>`<div class="comment"><b>Equipe BKM</b><p>${esc(c)}</p></div>`).join('')||'<p class="muted">Nenhum comentário ainda.</p>'}<form data-form="comment" data-id="${t.id}"><label>Comentário<textarea name="comment" required maxlength="2000"></textarea></label><div class="dialog-actions"><button>Comentar</button></div></form>`)}
document.getElementById('create').addEventListener('click',()=>create(state.view==='tarefas'?'task':'project'));
document.addEventListener('input',e=>{if(e.target.setCustomValidity)e.target.setCustomValidity('')});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;const d=b.dataset;
 if(d.view){state.taskProject=null;navigate(d.view);return}
 if(d.open){navigate('projeto',d.open);return}
 if(d.filter){state.filter=d.filter;render();return}
 if(d.folder){state.folder=d.folder==='all'?null:d.folder;persistContext();render();return}
 if(d.taskview){state.taskView=d.taskview;render();return}
 if(d.task){task(d.task);return}
 if(d.doc){const x=data.documents.find(x=>x.id===d.doc);if(!x)return;modal(x.name,`<p class="muted">${esc(name(x.project))} / ${esc(folderPath(data,x.folderId).map(f=>f.name).join(' / '))}</p>${tag(x.status)}<h2 style="margin-top:24px">Histórico de revisão</h2><div class="timeline"><div><strong>${esc(x.revision)}</strong><p>Registro fictício de demonstração.</p></div></div><p class="muted">Conteúdo de arquivo e armazenamento ainda não conectados.</p><div class="dialog-actions"><button data-act="close">Fechar</button></div>`);return}
 switch(d.act){
 case'close':dialog.close();break;
 case'project':case'task':case'document':create(d.act);break;
 case'edit-project':modal('Editar projeto',projectForm(data,state.project));break;
 case'folder':modal('Nova pasta',folderForm(data,state));break;
 case'edit-folder':modal('Editar pasta',folderForm(data,state,state.folder));break;
 case'details':navigate('projeto');break;
 case'project-files':navigate('diretorios');break;
 case'project-tasks':state.taskProject=state.project;navigate('tarefas');break;
 case'all-tasks':state.taskProject=null;render();break;
 case'theme':document.getElementById('theme').focus();break;
 case'archive':modal('Arquivar projeto',`<p>Arquivar ${esc(name(state.project))}? As pastas, os documentos e as tarefas serão preservados. Você poderá restaurar o projeto na lista de arquivados.</p><div class="dialog-actions"><button data-act="close">Cancelar</button><button class="primary" data-act="archive-confirm">Arquivar</button></div>`);break;
 case'archive-confirm':case'restore':try{repository.update(next=>archiveProject(next,state.project,d.act==='archive-confirm'));data=repository.data;dialog.close();render();toast(d.act==='restore'?'Projeto restaurado.':'Projeto arquivado.')}catch(error){toast(error.message)}break;
 case'reset':modal('Restaurar dados de exemplo','<p>Os registros criados neste navegador serão substituídos pelos exemplos iniciais.</p><div class="dialog-actions"><button data-act="close">Cancelar</button><button data-act="reset-confirm" class="primary">Restaurar</button></div>');break;
 case'reset-confirm':try{repository.reset();data=repository.data;state.project=data.projects[0].id;state.folder=null;state.taskProject=null;persistContext();dialog.close();render();toast('Exemplos restaurados.')}catch(error){toast(error.message)}break;
 }
});
document.addEventListener('change',e=>{if(e.target.id==='project-select'){state.project=e.target.value;state.folder=null;persistContext();render()}});
document.addEventListener('submit',e=>{
 const form=e.target.closest('[data-form]');if(!form)return;e.preventDefault();
 const f=Object.fromEntries(new FormData(form)),kind=form.dataset.form,id=crypto.randomUUID();
 if(kind==='search'){state.query=f.query;document.getElementById('search').value=f.query;render();return}
 let selected;
 try{
  repository.update(next=>{
   if(kind==='project')selected=saveProject(next,{...f,id},form.dataset.id);
   if(kind==='folder')saveFolder(next,{...f,id,project:state.project},form.dataset.id);
   if(kind==='task'){writableProject(next,f.project);if(!f.title.trim()||!f.owner.trim())throw Error('Preencha título e responsável.');next.tasks.push({id,title:f.title.trim(),project:f.project,owner:f.owner.trim(),status:'A fazer',comments:[]})}
   if(kind==='document'){writableProject(next,state.project);if(!f.name.trim())throw Error('Informe o título.');const folder=next.folders.find(n=>n.id===f.folderId&&n.project===state.project);if(!folder)throw Error('Selecione uma pasta deste projeto.');next.documents.push({id,project:state.project,name:f.name.trim(),folderId:folder.id,revision:'R00',format:'PDF',status:'Em análise'})}
   if(kind==='status'||kind==='comment'){const t=next.tasks.find(t=>t.id===form.dataset.id);if(!t)throw Error('Tarefa não encontrada.');writableProject(next,t.project);if(kind==='status'){if(!['A fazer','Em andamento','Concluída'].includes(f.status))throw Error('Situação inválida.');t.status=f.status}else{if(!f.comment.trim())throw Error('Escreva um comentário.');t.comments.push(f.comment.trim())}}
  });
  data=repository.data;
  if(kind==='comment'){task(form.dataset.id);render();return}
  if(kind==='project'){state.project=selected;state.folder=null;state.filter='Todos';navigate('projeto')}
  if(kind==='folder')state.folder=form.dataset.id||id;
  persistContext();dialog.close();render();toast('Alteração salva neste navegador.');
 }catch(error){let feedback=form.querySelector('.form-error');if(!feedback){feedback=document.createElement('p');feedback.className='form-error';feedback.setAttribute('role','alert');form.append(feedback)}feedback.hidden=false;feedback.textContent=error.message;const field=error.field&&form.elements.namedItem(error.field);if(field?.setCustomValidity){field.setCustomValidity(error.message);field.reportValidity()}}
});
function route(){const v=location.hash.slice(1);state.view=['projetos','projeto','diretorios','tarefas','configuracoes'].includes(v)?v:'projetos';render()}window.addEventListener('hashchange',route);route();

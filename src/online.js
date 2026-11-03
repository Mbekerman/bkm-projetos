import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../public/cloud-config.js';
import {createCloudStore,checked} from '../public/cloud-store.js';
import {esc,projectForm,folderForm} from '../public/project-ui.js';
import {folderPath} from '../public/model.js';
import {googleOptions,normalizeMobile,avatarUrl} from '../public/auth-profile.js';
import {createAnnotationReview} from '../public/annotation-review.js';
import {latestReview,reviewMessage,reviewBadge,reviewHistory,requestReviewForm,decisionReviewForm} from '../public/revision-review.js';
import {taskValues} from '../public/task-model.js';
import {tasksPage,taskForm,taskDetails,taskRevisionOptions} from '../public/task-ui.js';
import {projectAccessPage,addAccessForm,changeAccessForm,revokeAccessForm,corporateEmail,accessRole} from '../public/project-access.js';
import {overviewPage,activityPage} from '../public/project-overview.js';
import {notificationsPage,readAllForm,unreadBadge} from '../public/notifications-ui.js';
import {projectSearchPage,searchValues} from '../public/project-search.js';
import {openPdf} from '../public/pdf-viewer.js';

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const store=createCloudStore(client), main=document.getElementById('cloud-main'), modal=document.getElementById('cloud-modal'), viewer=document.getElementById('file-viewer');
const state={searchResult:null,searchFilter:{query:'',project:'',kind:'all',archived:false},searchCursors:[null],inbox:null,notificationUnread:null,notificationFilter:{project:'',unread:true},notificationCursors:[null],overview:null,activity:null,activityKind:'all',activityCursors:[null],profile:null,googleEnabled:false,user:null,projects:[],members:[],folders:[],documents:[],revisions:[],reviews:[],tasks:[],people:[],invites:[],taskView:'board',taskFilter:{query:'',assignee:'',priority:'',overdue:false,archived:false},reviewFilter:'in_review',project:null,folder:null,view:'projects',authMode:'login',busy:false,query:'',error:'',message:''};
let activeBlob=null,disposePdf=null,review=null,viewerGeneration=0,authGeneration=0;
const project=()=>state.projects.find(p=>p.id===state.project);
const own=()=>project()?.owner_id===state.user?.id;
const editable=()=>!!project()&&!project().archived&&(own()||state.members.some(m=>m.project_id===state.project&&m.user_id===state.user.id&&m.role==='editor'));
const shape=()=>({projects:state.projects.map(p=>({...p,owner:p.responsible_name,startDate:p.start_date||'',endDate:p.end_date||''})),folders:state.folders.map(f=>({...f,project:f.project_id,parent:f.parent_id}))});
function toast(text){const el=document.getElementById('toast');el.textContent=text;el.style.display='block';setTimeout(()=>{el.style.display='none'},6000);}
function dialog(title,body){modal.close();document.getElementById('cloud-modal-body').innerHTML=`<div class="dialog-heading"><h2>${esc(title)}</h2><button data-close-modal aria-label="Fechar">×</button></div>${body}`;modal.showModal();}
function clearViewer(){
 viewerGeneration++;const oldReview=review,oldPdf=disposePdf;review=null;disposePdf=null;
 oldReview?.dispose();if(activeBlob){URL.revokeObjectURL(activeBlob);activeBlob=null}
 document.getElementById('viewer-content').replaceChildren();document.getElementById('annotation-panel').replaceChildren();
 return oldPdf?.();
}
function closeViewer(){const cleanup=clearViewer();viewer.close();return cleanup;}
viewer.addEventListener('close',()=>{if(!viewer.open&&(review||disposePdf||activeBlob||document.getElementById('viewer-content').childNodes.length))void clearViewer();});
function setTheme(value){if(!['light','dark','auto'].includes(value))value='auto';const dark=value==='dark'||value==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=dark?'dark':'light';document.getElementById('theme').value=value;try{localStorage.setItem('bkm-projetos-theme',value)}catch{}}
let initialTheme='auto';try{initialTheme=localStorage.getItem('bkm-projetos-theme')||'auto'}catch{}setTheme(initialTheme);
document.getElementById('theme').addEventListener('change',e=>setTheme(e.target.value));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(document.getElementById('theme').value==='auto')setTheme('auto')});

function loginPage(){
 const signup=state.authMode==='signup';
 return `<section class="panel auth-panel"><p class="eyebrow">BKM Projetos</p><h1>${signup?'Criar acesso':'Entrar no ambiente conectado'}</h1><p class="muted">Seus projetos e documentos, acessíveis com sua conta.</p><button class="primary google-login" data-google-login ${state.googleEnabled&&!state.busy?'':'disabled'}>Entrar com Google BKM</button><p class="muted" data-google-info>Contas @bkm.com.br entram sem cadastro e sem senha.${state.googleEnabled?'':' Login Google em configuração.'}</p><div class="auth-tabs"><button data-auth-mode="login" class="${!signup?'tonal':''}">Entrar</button><button data-auth-mode="signup" class="${signup?'tonal':''}">Criar acesso</button></div>${state.message?`<p class="note">${esc(state.message)}</p>`:''}${state.error?`<p role="alert" class="cloud-error">${esc(state.error)}</p>`:''}<form class="form-grid" data-form="auth"><label>E-mail<input name="email" type="email" required autocomplete="username" maxlength="254"></label><label>Senha<input name="password" type="password" required minlength="${signup?8:1}" autocomplete="${signup?'new-password':'current-password'}"></label>${signup?'<p class="muted">Use pelo menos 8 caracteres. Não é obrigatório usar caracteres especiais. Pode ser necessário confirmar seu e-mail antes de entrar. Criar uma conta não concede acesso aos projetos de outras pessoas.</p>':''}<button class="primary" ${state.busy?'disabled':''}>${state.busy?'Aguarde…':signup?'Criar meu acesso':'Entrar'}</button></form><p class="auth-info muted">Este acesso é independente da conta da Vercel. Para contas BKM, use o Google. O acesso por senha permanece disponível.</p><a href="index.html">Continuar na demonstração local</a></section>`;
}
function projectsPage(){
 const filtered=state.projects.filter(p=>`${p.code} ${p.name} ${p.city}`.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()));
 return `<div class="cloud-header"><div><p class="eyebrow">Ambiente conectado</p><h1>Projetos</h1><p>Projetos aos quais sua conta tem acesso.</p><button data-refresh>Atualizar acessos</button></div><button class="primary" data-new-project>+ Novo projeto</button></div><form class="cloud-search" data-form="search"><label>Buscar projetos<input name="query" type="search" value="${esc(state.query)}" placeholder="Código, nome ou município"></label><button class="quiet">Buscar</button></form><div class="grid">${filtered.map(p=>`<article class="project-card"><div class="project-art"><img src="assets/projetos.svg" alt=""><span>${esc(p.code)}</span></div><div class="card-body"><span class="tag">${esc(p.archived?'Arquivado':p.status)}</span><h2>${esc(p.name)}</h2><p class="muted">${esc(p.city||'Município não informado')}</p><p class="muted">${esc(p.responsible_name||'Responsável não informado')}</p><div class="cloud-actions"><button class="primary" data-project-overview="${p.id}">Visão geral</button><button data-open-project="${p.id}">Abrir diretórios</button><button data-project-team="${p.id}">Equipe</button>${p.owner_id===state.user.id?`<button data-edit-project="${p.id}">Editar</button>`:''}</div></div></article>`).join('')}</div>${filtered.length?'':'<div class="empty"><strong>Nenhum projeto encontrado</strong><p>Crie seu primeiro projeto ou solicite participação ao responsável.</p></div>'}`;
}
function filesPage(){
 if(!project())return '<div class="empty"><h1>Selecione um projeto</h1><p>Abra um projeto na lista para consultar os diretórios.</p><button data-cloud-view="projects">Ver projetos</button></div>';
 const data=shape(), path=folderPath(data,state.folder);
 const docs=state.documents.filter(d=>(!state.folder||d.folder_id===state.folder)&&`${d.code} ${d.title}`.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()));
 return `<div class="cloud-header"><div><p class="eyebrow">${esc(project().code)}</p><h1>${esc(project().name)}</h1><p>${project().archived?'Arquivado · somente consulta':'Documentos e revisões'}</p></div><div class="cloud-actions"><button data-refresh>Atualizar</button>${editable()?'<button class="primary" data-new-document>+ Enviar documento</button>':''}</div></div><div class="directory-head"><label class="sr" for="cloud-project">Projeto</label><select id="cloud-project">${state.projects.map(p=>`<option value="${p.id}" ${p.id===state.project?'selected':''}>${esc(p.name)}${p.archived?' (arquivado)':''}</option>`).join('')}</select></div><form class="cloud-search" data-form="search"><label>Buscar documentos<input name="query" type="search" value="${esc(state.query)}" placeholder="Código ou título"></label><button class="quiet">Buscar</button></form><div class="directory-layout"><section class="panel folder-panel"><h2>Pastas</h2><button data-cloud-folder="all" class="${!state.folder?'active':''}">Todos os documentos</button><div class="cloud-folder-list">${state.folders.map(f=>`<button data-cloud-folder="${f.id}" class="${f.id===state.folder?'active':''}">${esc(folderPath(data,f.id).map(f=>f.name).join(' / '))}</button>`).join('')||'<p class="muted">Crie uma pasta para organizar os arquivos.</p>'}</div>${editable()?'<button data-new-folder>+ Nova pasta</button>':''}</section><section><p class="cloud-parent-path">${esc(path.map(f=>f.name).join(' / ')||'Todos os documentos')}</p>${state.folder&&editable()?'<div class="cloud-actions"><button data-edit-folder>Renomear / mover</button><button data-new-folder>+ Subpasta</button></div>':''}<div class="panel">${docs.map(d=>{
 const revisions=state.revisions.filter(r=>r.document_id===d.id),ready=revisions.find(r=>r.upload_state==='ready'),pending=revisions.some(r=>r.upload_state==='pending');
 return `<div class="cloud-row"><div><strong>${esc(d.code)} · ${esc(d.title)}</strong><p>${esc(folderPath(data,d.folder_id).map(f=>f.name).join(' / '))}</p><span class="cloud-file">${ready?`Disponível: ${esc(ready.revision_code)} · ${esc(ready.original_filename)}`:'Nenhum arquivo recebido ainda'}</span>${ready?`<div>${reviewBadge(latestReview(state.reviews,ready.id))}</div>`:''}${pending?'<p class="cloud-status">Existe um envio pendente. Abra as revisões para retomar.</p>':''}</div><button data-document="${d.id}">Abrir revisões</button></div>`;}).join('')||'<div class="empty">Nenhum documento nesta seleção.</div>'}</div></section></div>`;
}
function connectedSearch(){return projectSearchPage({projects:state.projects,filter:state.searchFilter,result:state.searchResult,hasPrevious:state.searchCursors.length>1});}
function resetSearch(){state.searchResult=null;state.searchCursors=[null];}
async function loadSearch(){const user=state.user?.id,filter={...state.searchFilter},after=state.searchCursors.at(-1);if(!user||!filter.query)return;const result=await store.search(filter,after);if(state.user?.id===user&&state.view==='search'&&JSON.stringify(state.searchFilter)===JSON.stringify(filter)&&state.searchCursors.at(-1)===after)state.searchResult=result;}
async function openSearchResult(item){
 state.project=item.project_id;state.folder=null;state.view=item.kind==='task'?'tasks':'files';await reload();
 if(state.project!==item.project_id)throw Error('Seu acesso a este projeto mudou. Atualize a busca.');
 if(item.kind==='task'){await taskDialog(item.id);return;}
 let revision=null,note=null;
 if(item.kind==='annotation'){note=await store.searchAnnotation(item.project_id,item.id);if(!note)throw Error('Marcação indisponível ou removida. Atualize a busca.');revision=await store.searchRevision(item.project_id,note.revision_id);}
 if(item.kind==='revision')revision=await store.searchRevision(item.project_id,item.id);
 if(item.kind!=='document'&&!revision)throw Error('Revisão indisponível. Atualize a busca.');
 const context=await store.searchDocument(item.project_id,revision?.document_id||item.id);
 state.documents=state.documents.filter(d=>d.id!==context.document.id).concat(context.document);
 state.revisions=state.revisions.filter(r=>r.document_id!==context.document.id).concat(context.revisions);
 const ids=new Set(context.revisions.map(r=>r.id));state.reviews=state.reviews.filter(r=>!ids.has(r.revision_id)).concat(context.reviews);
 if(revision?.upload_state==='ready'){await viewRevision(revision.id,false,{annotationId:note?.id,page:note?.page_number||1});return;}
 documentDialog(context.document.id);
}
function connectedNotifications(){return notificationsPage({inbox:state.inbox,projects:state.projects,filter:state.notificationFilter,hasPrevious:state.notificationCursors.length>1});}
function resetInbox(){state.inbox=null;state.notificationCursors=[null];}
async function loadInbox(){const user=state.user?.id,filter={...state.notificationFilter},cursor=state.notificationCursors.at(-1);if(!user)return;const inbox=await store.notifications(filter.project||null,filter.unread,cursor);if(state.user?.id===user&&state.view==='notifications'&&state.notificationFilter.project===filter.project&&state.notificationFilter.unread===filter.unread)state.inbox=inbox;}
async function refreshInboxCount(){const user=state.user?.id;if(!user)return;try{const inbox=await store.notifications();if(state.user?.id===user)state.notificationUnread=inbox.unread_count;}catch{state.notificationUnread=null;}}
function connectedOverview(){return overviewPage({project:project(),projects:state.projects,overview:state.overview,people:state.people});}
function connectedActivity(){return activityPage({project:project(),projects:state.projects,activity:state.activity,kind:state.activityKind,hasPrevious:state.activityCursors.length>1,people:state.people});}
async function loadOperations(){const id=state.project,user=state.user?.id,view=state.view;if(view==='search'){await loadSearch();return;}if(view==='notifications'){await loadInbox();return;}if(!id)return;const value=view==='overview'?await store.overview(id):view==='activity'?await store.activity(id,state.activityKind,state.activityCursors.at(-1)):null;if(state.project===id&&state.user?.id===user&&state.view===view&&value)state[view]=value;}
function resetOperations(){state.overview=null;state.activity=null;state.activityCursors=[null];}
function participantsPage(){return projectAccessPage({project:project(),projects:state.projects,people:state.people,invites:state.invites,isOwner:own()});}
function connectedTasks(){return tasksPage({project:project(),projects:state.projects,tasks:state.tasks,people:state.people,canWrite:editable(),view:state.taskView,filter:state.taskFilter});}
function openTaskForm(task={}){if(!editable())return;dialog(task.id?'Editar tarefa':'Nova tarefa',taskForm({task,people:state.people,documents:state.documents,revisions:state.revisions,userId:state.user.id}));}
async function taskDialog(id){const task=await store.task(state.project,id);if(!task)throw Error('Tarefa indisponível. Atualize o projeto para verificar seu acesso.');const index=state.tasks.findIndex(t=>t.id===id);if(index<0)state.tasks.push(task);else state.tasks[index]=task;const comments=await store.taskComments(id);dialog(task.title,taskDetails(task,{people:state.people,documents:state.documents,revisions:state.revisions,comments,canWrite:editable()}));}
function approvalsPage(){
 if(!project())return '<div class="empty"><h1>Análises de revisões</h1><p>Crie ou abra um projeto para acompanhar os pareceres.</p><button data-cloud-view="projects">Ver projetos</button></div>';
 const reviews=state.reviews.filter(r=>state.reviewFilter==='all'||r.status===state.reviewFilter);
 return `<div class="cloud-header"><div><p class="eyebrow">${esc(project().code)}</p><h1>Análises de revisões</h1><p>O proprietário registra os pareceres. Cada versão tem seu próprio histórico.</p></div><button data-refresh>Atualizar</button></div><div class="review-filters"><label>Projeto<select id="cloud-project">${state.projects.map(p=>`<option value="${p.id}" ${p.id===state.project?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>Situação<select id="review-filter">${[['in_review','Em análise'],['approved','Aprovadas'],['approved_with_comments','Com ressalvas'],['changes_requested','Ajustes solicitados'],['all','Todas']].map(([value,label])=>`<option value="${value}" ${value===state.reviewFilter?'selected':''}>${label}</option>`).join('')}</select></label></div><section class="panel">${reviews.map(row=>{const r=state.revisions.find(r=>r.id===row.revision_id),doc=state.documents.find(d=>d.id===r?.document_id);if(!r)return '';return `<article class="cloud-row"><div><strong>${esc(doc?.code||'')} · ${esc(doc?.title||r.original_filename)}</strong><p>Revisão ${esc(r.revision_code)} · análise ${row.round_number}</p>${reviewBadge(row)}<p class="muted">Solicitada por ${esc(row.requested_name)}</p>${row.decision_message?`<p class="review-comment">${esc(row.decision_message)}</p>`:''}</div><div class="cloud-actions"><button data-view-revision="${r.id}">Visualizar</button><button data-document="${r.document_id}">Histórico</button>${row.status==='in_review'&&own()&&!project().archived?`<button class="primary" data-decide-review="${row.id}">Emitir parecer</button>`:''}</div></article>`;}).join('')||'<div class="empty">Nenhuma análise nesta seleção. Abra as revisões de um documento para enviar um arquivo para análise.</div>'}</section>`;
}
function profileForm(){const p=state.profile||{},photo=avatarUrl(p.avatar_url);return `<div class="panel cloud-settings">${photo?`<img class="profile-avatar" src="${esc(photo)}" alt="Foto de perfil" referrerpolicy="no-referrer">`:''}<h2>${esc(p.full_name||'Minha conta')}</h2><p>${esc(state.user.email)}</p><form class="form-grid" data-form="profile"><label>Celular<input name="mobile" type="tel" autocomplete="tel" required maxlength="30" placeholder="(11) 99999-9999" value="${esc(p.mobile||'')}"></label><p class="muted">O Google fornece nome, foto e e-mail. Informe seu celular para completar o perfil. Este número não é verificado por SMS.</p><button class="primary" ${state.busy?'disabled':''}>Salvar celular</button></form></div>`;}
function settingsPage(){return `<div class="cloud-header"><h1>Minha conta</h1></div>${profileForm()}<div class="panel cloud-settings"><div class="settings-row"><div><h2>Acesso conectado</h2><p class="auth-email">${esc(state.user.email)}</p><p class="muted">Cada projeto controla seus participantes.</p></div></div><div class="settings-row"><div><h2>Arquivos</h2><p class="muted">PDF, PNG e JPEG, até 20 MiB. Os originais e cada revisão são preservados.</p></div></div><div class="settings-row"><div><h2>Demonstração local</h2><p class="muted">Seus exemplos locais permanecem separados. A importação para a nuvem ainda não está disponível.</p><a href="index.html">Abrir demonstração</a></div></div><div class="settings-row"><p class="muted">Anotações, desenhos e pareceres estão disponíveis por revisão em PDF e imagens. Tarefas vinculadas aos projetos e documentos estão disponíveis. IFC e DWG serão implementados nas próximas etapas.</p></div></div>`;}
function render(){
 const badge=document.getElementById('notification-badge');if(badge)badge.textContent=unreadBadge(state.notificationUnread);
 const signed=!!state.user,needsMobile=signed&&state.user.app_metadata?.providers?.includes('google')&&!state.profile?.mobile;
 document.getElementById('cloud-sidebar').hidden=!signed;document.getElementById('signout').hidden=!signed;main.classList.toggle('auth-page',!signed);
 document.querySelectorAll('[data-cloud-view]').forEach(b=>{const active=b.dataset.cloudView===state.view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 main.innerHTML=needsMobile?`${state.error?`<p role="alert" class="cloud-error">${esc(state.error)}</p>`:''}<h1>Complete seu perfil</h1>${profileForm()}`:signed?`${state.error?`<p role="alert" class="cloud-error">${esc(state.error)}</p>`:''}${state.busy?'<p class="cloud-progress" role="status">Carregando…</p>':''}${({search:connectedSearch,notifications:connectedNotifications,overview:connectedOverview,activity:connectedActivity,projects:projectsPage,files:filesPage,tasks:connectedTasks,approvals:approvalsPage,participants:participantsPage,settings:settingsPage}[state.view]||projectsPage)()}`:loginPage();
 if(signed&&['overview','activity','notifications','search'].includes(state.view))main.scrollIntoView({block:'start'});
}
async function reload(){
 if(!state.user)return;
 await store.acceptAccess();
 state.projects=await store.projects();state.members=await store.members();
 if(!state.projects.some(p=>p.id===state.project))state.project=state.projects[0]?.id||null;
 if(state.project)Object.assign(state,await store.projectData(state.project));else Object.assign(state,{folders:[],documents:[],revisions:[],reviews:[],tasks:[],people:[],invites:[]});
 if(!state.folders.some(f=>f.id===state.folder))state.folder=null;
 resetOperations();resetInbox();resetSearch();if(!state.projects.some(p=>p.id===state.notificationFilter.project))state.notificationFilter.project='';await refreshInboxCount();await loadOperations();
}
async function run(work,{close=true}={}){
 if(state.busy)return;state.busy=true;state.error='';
 const disabledButtons=[...document.querySelectorAll('button')].filter(b=>!viewer.contains(b)).map(button=>({button,disabled:button.disabled}));
 disabledButtons.forEach(({button})=>button.disabled=true);
 const message=modal.open?document.getElementById('cloud-modal-body').querySelector('.form-error'):null;
 if(message){message.hidden=false;message.className='form-error cloud-progress';message.textContent='Processando. Aguarde a confirmação antes de fechar.';}
 try{await work();if(close)modal.close();}
 catch(error){const text=error.message||'Falha na operação. Tente novamente.';if(modal.open){let p=document.getElementById('cloud-modal-body').querySelector('.form-error');if(!p){p=document.createElement('p');document.getElementById('cloud-modal-body').append(p)}p.hidden=false;p.className='form-error';p.setAttribute('role','alert');p.textContent=text;}else state.error=text;}
 finally{state.busy=false;disabledButtons.forEach(({button,disabled})=>{if(button.isConnected)button.disabled=disabled;});render();}
}
function uploadForm(documentId){
 if(!state.folders.length){toast('Crie uma pasta antes de enviar documentos.');return;}
 const doc=state.documents.find(d=>d.id===documentId);
 dialog(doc?'Nova revisão':'Enviar documento',`<form data-form="upload" data-document-id="${doc?.id||''}" class="form-grid">${doc?`<p>${esc(doc.code)} · ${esc(doc.title)}</p>`:`<label>Código do documento<input name="code" maxlength="80" required></label><label>Título<input name="title" maxlength="200" required></label><label>Pasta<select name="folderId" required>${state.folders.map(f=>`<option value="${f.id}" ${f.id===state.folder?'selected':''}>${esc(folderPath(shape(),f.id).map(f=>f.name).join(' / '))}</option>`).join('')}</select></label>`}<label>Código da revisão<input name="revisionCode" required maxlength="30" placeholder="Ex.: R00"></label><label>Arquivo<input name="file" type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" required></label><p class="muted">PDF ou imagem, até 20 MiB. Cada revisão preserva seu arquivo original.</p><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" data-close-modal>Cancelar</button><button class="primary">Enviar arquivo</button></div></form>`);
}
function documentDialog(id){const d=state.documents.find(d=>d.id===id);if(!d)return;
 dialog(d.title,`<p class="muted">${esc(d.code)} · ${esc(folderPath(shape(),d.folder_id).map(f=>f.name).join(' / '))}</p><div>${state.revisions.filter(r=>r.document_id===id).map(r=>{const latest=latestReview(state.reviews,r.id);return `<section class="revision-review"><div class="cloud-row"><div><strong>${esc(r.revision_code)}</strong><p>${esc(r.original_filename)} · ${(Number(r.file_size)/1024/1024).toFixed(2)} MiB</p><span class="tag">${r.upload_state==='ready'?'Arquivo recebido':'Envio pendente'}</span>${r.upload_state==='ready'?reviewBadge(latest):''}</div><div class="cloud-actions">${r.upload_state==='ready'?`<button data-view-revision="${r.id}">Visualizar</button><button data-download-revision="${r.id}">Baixar original</button>${editable()?`<button data-revision-task="${r.id}">Criar tarefa</button>`:''}${editable()&&latest?.status!=='in_review'?`<button data-request-review="${r.id}">${latest?'Solicitar nova análise':'Enviar para análise'}</button>`:''}${own()&&!project().archived&&latest?.status==='in_review'?`<button class="primary" data-decide-review="${latest.id}">Emitir parecer</button>`:''}`:editable()&&r.created_by===state.user.id?`<button data-retry-revision="${r.id}">Retomar envio</button>`:''}</div></div>${reviewHistory(state.reviews,r.id)}</section>`;}).join('')||'<p class="note">Nenhuma revisão enviada. Você pode iniciar um envio abaixo.</p>'}</div>${editable()?`<div class="dialog-actions"><button class="primary" data-new-revision="${id}">+ Nova revisão</button></div>`:''}`);
}
async function viewRevision(id,download=false,{annotationId=null,page=1}={}){
 const r=state.revisions.find(r=>r.id===id);if(!r)throw Error('Revisão não encontrada.');
 const cleanup=download?null:closeViewer(),generation=viewerGeneration;await cleanup;
 if(!download&&generation!==viewerGeneration)return;
 const blob=await store.download(r);if(!download&&generation!==viewerGeneration)return;
 if(download){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=r.original_filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;}
 modal.close();document.getElementById('viewer-title').textContent=`${r.original_filename} · ${r.revision_code}`;viewer.showModal();
 const content=document.getElementById('viewer-content'),tools=document.getElementById('viewer-tools'),panel=document.getElementById('annotation-panel');tools.hidden=r.mime_type!=='application/pdf';content.innerHTML='<p class="note">Abrindo arquivo…</p>';panel.textContent='Carregando anotações…';
 try{const session=await createAnnotationReview({revision:r,store,panel,userId:state.user.id,ownerId:project()?.owner_id,canWrite:editable(),focusId:annotationId,onCreateTask:note=>{void closeViewer();openTaskForm({document_id:r.document_id,revision_id:r.id,annotation_id:note.id,title:note.body.slice(0,150),description:note.body});}});if(generation!==viewerGeneration){session.dispose();return;}review=session;}
 catch{if(generation!==viewerGeneration)return;panel.textContent='Não foi possível carregar as anotações. Feche e abra a revisão para tentar novamente.';}
 try{
  if(r.mime_type==='application/pdf'){const dispose=await openPdf(blob,content,tools,{initialPage:page,onPage:surface=>{if(generation===viewerGeneration)review?.attach(surface);}});if(generation!==viewerGeneration){dispose();return;}disposePdf=dispose;}
  else{activeBlob=URL.createObjectURL(blob);const img=document.createElement('img');img.alt=r.original_filename;img.src=activeBlob;const surface=document.createElement('div');surface.className='annotation-surface image-surface';surface.append(img);content.replaceChildren(surface);review?.attach({element:surface,pageNumber:1});}
 }catch{if(generation!==viewerGeneration)return;review?.dispose();review=null;panel.replaceChildren();content.textContent='Não foi possível visualizar este arquivo. Verifique se ele está íntegro e se o PDF não exige senha. O original continua disponível para download.';}
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button)return;const d=button.dataset;
 if(d.closeViewer!==undefined){closeViewer();return;}
 if(state.busy)return;
 if(d.closeModal!==undefined||d.act==='close'){modal.close();return;}
 if(d.googleLogin!==undefined){await run(async()=>{if(!state.googleEnabled)throw Error('Login Google ainda em configuração.');checked(await client.auth.signInWithOAuth(googleOptions()));},{close:false});return;}
 if(d.authMode){state.authMode=d.authMode;state.error='';state.message='';render();return;}
 if(d.cloudView){state.view=d.cloudView;state.query='';if(['overview','activity','notifications','search'].includes(state.view)){resetOperations();resetInbox();resetSearch();await run(async()=>{if(state.view==='notifications')await refreshInboxCount();await loadOperations();});}else render();return;}
 if(d.searchRefresh!==undefined){resetSearch();await run(loadSearch);return;}
 if(d.searchNext!==undefined||d.searchPrev!==undefined){const old=[...state.searchCursors];if(d.searchNext!==undefined){if(!state.searchResult?.has_more)return;state.searchCursors.push(state.searchResult.next_cursor);}else if(state.searchCursors.length>1)state.searchCursors.pop();else return;await run(async()=>{try{await loadSearch();}catch(error){state.searchCursors=old;throw error;}});return;}
 if(d.searchOpen){const item=state.searchResult?.items.find(row=>row.result_key===d.searchOpen);if(item)await run(()=>openSearchResult(item),{close:false});return;}
 if(d.notificationsNext!==undefined||d.notificationsPrev!==undefined){const old=[...state.notificationCursors];if(d.notificationsNext!==undefined){if(!state.inbox?.has_more)return;state.notificationCursors.push(state.inbox.next_cursor);}else if(state.notificationCursors.length>1)state.notificationCursors.pop();else return;await run(async()=>{try{await loadInbox();}catch(error){state.notificationCursors=old;throw error;}});return;}
 if(d.notificationRead){await run(async()=>{await store.markNotification(d.notificationRead,d.readValue==='true');resetInbox();await refreshInboxCount();await loadInbox();});return;}
 if(d.notificationsReadAll!==undefined){if(state.inbox?.through_id&&state.inbox.unread_count>0)dialog('Marcar avisos como lidos',readAllForm(state.inbox,state.projects.find(p=>p.id===state.notificationFilter.project)?.name));return;}
 if(d.notificationOpen){const notice=state.inbox?.items.find(n=>n.id===d.notificationOpen);if(!notice)return;await run(async()=>{state.project=notice.project_id;state.view=notice.kind.startsWith('task_')?'tasks':'approvals';state.reviewFilter='all';await reload();if(notice.kind.startsWith('task_'))await taskDialog(notice.target_id);},{close:false});return;}
 if(d.projectOverview){state.project=d.projectOverview;state.folder=null;state.view='overview';resetOperations();await run(reload);return;}
 if(d.activityNext!==undefined||d.activityPrev!==undefined){const old=[...state.activityCursors];if(d.activityNext!==undefined){if(!state.activity?.has_more)return;state.activityCursors.push(state.activity.next_cursor);}else if(state.activityCursors.length>1)state.activityCursors.pop();else return;await run(async()=>{try{await loadOperations();}catch(error){state.activityCursors=old;throw error;}});return;}
 if(d.openProject){state.project=d.openProject;state.folder=null;state.query='';state.view='files';await run(reload);return;}
 if(d.editProject){state.project=d.editProject;dialog('Editar projeto',projectForm(shape(),state.project)+`<div class="dialog-actions"><button data-toggle-archive>${project().archived?'Restaurar':'Arquivar'} projeto</button></div>`);return;}
 if(d.newProject!==undefined){dialog('Novo projeto',projectForm(shape()));return;}
 if(d.cloudFolder){state.folder=d.cloudFolder==='all'?null:d.cloudFolder;render();return;}
 if(d.newFolder!==undefined){dialog('Nova pasta',folderForm(shape(),{project:state.project,folder:state.folder}));return;}
 if(d.editFolder!==undefined){dialog('Editar pasta',folderForm(shape(),{project:state.project,folder:state.folder},state.folder));return;}
 if(d.newDocument!==undefined){uploadForm();return;}
 if(d.newRevision){uploadForm(d.newRevision);return;}
 if(d.projectTeam){state.project=d.projectTeam;state.folder=null;state.view='participants';await run(reload);return;}
 if(d.addAccess!==undefined){if(own()&&!project().archived)dialog('Adicionar participante',addAccessForm(project()));return;}
 if(d.memberRole||d.memberRevoke){const person=state.people.find(p=>p.user_id===(d.memberRole||d.memberRevoke));if(person&&own()){const inv=state.invites.find(i=>!i.revoked_at&&i.accepted_by===person.user_id),options={id:person.user_id,kind:'member',label:inv?.email||person.display_name,role:person.project_role,project:project()};dialog(d.memberRole?'Alterar papel':'Revogar acesso',d.memberRole?changeAccessForm(options):revokeAccessForm(options));}return;}
 if(d.inviteRole||d.inviteRevoke){const invite=state.invites.find(i=>i.id===(d.inviteRole||d.inviteRevoke));if(invite&&own()){const options={id:invite.id,kind:'invite',label:invite.email,role:invite.role,project:project()};dialog(d.inviteRole?'Alterar papel':'Revogar autorização',d.inviteRole?changeAccessForm(options):revokeAccessForm(options));}return;}
 if(d.newTask!==undefined){openTaskForm();return;}
 if(d.revisionTask){const r=state.revisions.find(r=>r.id===d.revisionTask);if(r)openTaskForm({document_id:r.document_id,revision_id:r.id});return;}
 if(d.openTask){await run(()=>taskDialog(d.openTask),{close:false});return;}
 if(d.editTask){const task=state.tasks.find(t=>t.id===d.editTask);if(task)openTaskForm(task);return;}
 if(d.taskView){state.taskView=d.taskView;render();return;}
 if(d.taskArchive){const task=state.tasks.find(t=>t.id===d.taskArchive);if(task)await run(async()=>{await store.saveTask({archived:!task.archived},task.id);await reload();toast(task.archived?'Tarefa restaurada.':'Tarefa arquivada.');});return;}
 if(d.taskSource){const task=state.tasks.find(t=>t.id===d.taskSource);if(task?.revision_id)await run(async()=>{const note=task.annotation_id?(await store.annotations(task.revision_id)).find(n=>n.id===task.annotation_id):null;await viewRevision(task.revision_id,false,{annotationId:note?.id,page:note?.page_number||1});},{close:false});return;}
 if(d.requestReview){const r=state.revisions.find(r=>r.id===d.requestReview);if(r)dialog('Enviar revisão para análise',requestReviewForm(r));return;}
 if(d.decideReview){const row=state.reviews.find(row=>row.id===d.decideReview),r=state.revisions.find(r=>r.id===row?.revision_id);if(row&&r)dialog('Emitir parecer',decisionReviewForm(row,r));return;}
 if(d.document){documentDialog(d.document);return;}
 if(d.retryRevision){const r=state.revisions.find(r=>r.id===d.retryRevision);dialog('Retomar envio',`<form class="form-grid" data-form="retry" data-id="${r.id}"><p>Selecione novamente ${esc(r.original_filename)} (${r.file_size} bytes).</p><label>Arquivo<input type="file" name="file" required accept=".pdf,.png,.jpg,.jpeg"></label><p class="form-error" hidden role="alert"></p><div class="dialog-actions"><button type="button" data-close-modal>Cancelar</button><button class="primary">Retomar envio</button></div></form>`);return;}
 if(d.viewRevision||d.downloadRevision){await run(()=>viewRevision(d.viewRevision||d.downloadRevision,!!d.downloadRevision),{close:false});return;}
 if(d.refresh!==undefined){await run(reload);return;}
 if(d.toggleArchive!==undefined){const p=project();dialog(p.archived?'Restaurar projeto':'Arquivar projeto',`<p>${p.archived?'Restaurar':'Arquivar'} ${esc(p.name)}? Os documentos serão preservados.</p><div class="dialog-actions"><button data-close-modal>Cancelar</button><button data-confirm-archive class="primary">Confirmar</button></div>`);return;}
 if(d.confirmArchive!==undefined)await run(async()=>{await store.saveProject({archived:!project().archived},state.project);await reload();toast('Projeto atualizado.');});
 if(button.id==='signout')await run(async()=>{checked(await client.auth.signOut());closeViewer();state.user=null;state.projects=[];state.members=[];state.folders=[];state.documents=[];state.revisions=[];state.reviews=[];state.tasks=[];state.people=[];state.invites=[];state.project=null;resetOperations();resetInbox();resetSearch();state.searchFilter={query:'',project:'',kind:'all',archived:false};state.notificationUnread=null;state.notificationFilter={project:'',unread:true};});
});
document.addEventListener('change',async e=>{if(e.target.id==='notification-project'||e.target.id==='notification-state'){if(state.busy)return;if(e.target.id==='notification-project')state.notificationFilter.project=e.target.value;else state.notificationFilter.unread=e.target.value==='unread';resetInbox();await run(loadInbox);return;}if(e.target.matches('[data-task-stage-select]')){const label=e.target.form.querySelector('[data-task-pause-label]');label.hidden=e.target.value!=='paused';label.querySelector('textarea').required=e.target.value==='paused';}
 if(e.target.matches('[data-task-document]')){const form=e.target.form,select=form.querySelector('[data-task-revision]');select.innerHTML=taskRevisionOptions(state.revisions,e.target.value,null);select.disabled=!e.target.value;form.elements.annotation_id.value='';form.querySelector('[data-task-annotation-label]').hidden=true;}
 if(e.target.matches('[data-task-revision]')){e.target.form.elements.annotation_id.value='';e.target.form.querySelector('[data-task-annotation-label]').hidden=true;}
 if(e.target.matches('[data-review-outcome]')){e.target.form.querySelector('textarea[name="message"]').required=e.target.value!=='approved';}if(e.target.id==='review-filter'){state.reviewFilter=e.target.value;render();return;}if(e.target.id==='activity-kind'){state.activityKind=e.target.value;resetOperations();resetInbox();resetSearch();await run(async()=>{if(state.view==='notifications')await refreshInboxCount();await loadOperations();});return;}if(e.target.id==='cloud-project'){state.project=e.target.value;state.folder=null;state.query='';resetOperations();await run(reload);}});
document.addEventListener('submit',async e=>{
 const form=e.target.closest('form');if(!form)return;e.preventDefault();if(state.busy)return;
 const f=Object.fromEntries(new FormData(form)),kind=form.dataset.form;
 if(kind==='global-search'){await run(async()=>{state.searchFilter=searchValues(f);resetSearch();await loadSearch();});return;}
 if(kind==='task-filter'){state.taskFilter={query:f.query,assignee:f.assignee,priority:f.priority,overdue:!!f.overdue,archived:!!f.archived};render();return;}
 if(kind==='task-comment'){await run(async()=>{const body=String(f.body||'').trim();if(!body||body.length>2000)throw Error('Escreva um comentário de até 2.000 caracteres.');await store.addTaskComment({project_id:state.project,task_id:form.dataset.id,body});await taskDialog(form.dataset.id);},{close:false});return;}
 if(kind==='search'){state.query=f.query.trim();render();return;}
 await run(async()=>{
  if(kind==='notifications-read'){const through=state.inbox?.through_id;if(!through)throw Error('Atualize os avisos antes de confirmar.');await store.markNotificationsRead(through,state.notificationFilter.project||null);resetInbox();await refreshInboxCount();await loadInbox();toast('Avisos marcados como lidos.');}
  if(kind==='add-access'){await store.addAccess(state.project,corporateEmail(f.email),accessRole(f.role));await reload();toast('Autorização de acesso registrada.');}
  if(kind==='change-access'){await store.changeAccess(state.project,form.dataset.id,form.dataset.kind,accessRole(f.role));await reload();toast('Papel atualizado.');}
  if(kind==='revoke-access'){await store.revokeAccess(state.project,form.dataset.id,form.dataset.kind);await reload();toast('Acesso revogado.');}
  if(kind==='task'){const values=taskValues(f);if(!form.dataset.id)values.project_id=state.project;await store.saveTask(values,form.dataset.id);await reload();state.view='tasks';if(!form.dataset.id)state.taskFilter={query:'',assignee:'',priority:'',overdue:false,archived:false};toast('Tarefa salva.');}
  if(kind==='task-move'){await store.saveTask({stage:'paused',pause_reason:String(f.pause_reason||'').trim()},form.dataset.id);await reload();toast('Tarefa pausada.');}
  if(kind==='request-review'){await store.requestReview(form.dataset.id,reviewMessage(f.message));await reload();toast('Revisão enviada para análise.');}
  if(kind==='decide-review'){await store.decideReview(form.dataset.id,f.outcome,reviewMessage(f.message,f.outcome));await reload();toast('Parecer registrado no histórico.');}
  if(kind==='profile'){state.profile=checked(await client.from('user_profiles').update({mobile:normalizeMobile(f.mobile)}).eq('id',state.user.id).select().single());toast('Celular salvo.');}
  if(kind==='auth'){
   if(state.authMode==='signup'){const result=checked(await client.auth.signUp({email:f.email.trim(),password:f.password,options:{emailRedirectTo:'https://bkm-projetos.vercel.app/online.html'}}));state.message=result.session?'Acesso criado.':'Confira o e-mail de confirmação. Depois de confirmar, volte aqui e entre com sua senha.';state.authMode='login';if(!result.session)form.reset();}
   else checked(await client.auth.signInWithPassword({email:f.email.trim(),password:f.password}));
  }
  if(kind==='project'){
   const values={code:f.code.trim(),name:f.name.trim(),city:f.city.trim(),responsible_name:f.owner.trim(),description:f.description.trim(),status:f.status,start_date:f.startDate||null,end_date:f.endDate||null};
   if(!values.code||!values.name||!values.city||!values.responsible_name)throw Error('Preencha código, nome, município e responsável.');
   if(values.start_date&&values.end_date&&values.end_date<values.start_date)throw Error('A conclusão deve ser igual ou posterior ao início.');
   const p=await store.saveProject(values,form.dataset.id);state.project=p.id;await reload();toast('Projeto salvo na nuvem.');
  }
  if(kind==='folder'){
   const values={name:f.name.trim(),parent_id:f.parent||null};if(!values.name)throw Error('Informe o nome da pasta.');if(!form.dataset.id)values.project_id=state.project;
   const folder=await store.saveFolder(values,form.dataset.id);state.folder=folder.id;await reload();toast('Pasta salva.');
  }
  if(kind==='upload'){
   const reservation=await store.reserveUpload({projectId:state.project,folderId:f.folderId,documentId:form.dataset.documentId||null,code:f.code,title:f.title,revisionCode:f.revisionCode,file:f.file});
   try{await store.transferUpload(reservation,f.file);}catch(error){await reload();throw new Error(`${error.message} A revisão ficou pendente. Use Abrir revisões → Retomar envio.`);}
   await reload();toast('Arquivo recebido e revisão confirmada.');
  }
  if(kind==='retry'){const r=state.revisions.find(r=>r.id===form.dataset.id);await store.transferUpload(r,f.file);await reload();toast('Envio concluído.');}
 });
});
modal.addEventListener('cancel',e=>{if(state.busy)e.preventDefault();});
client.auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event))setTimeout(()=>void refreshAuth(),0);});
async function refreshAuth(){
 const generation=++authGeneration;
 try{const {data,error}=await client.auth.getUser();if(generation!==authGeneration)return;
  if(error&&error.name!=='AuthSessionMissingError')throw error;
  const previous=state.user?.id;state.user=data.user||null;
  if(!state.user){state.profile=null;closeViewer();modal.close();state.projects=[];state.members=[];state.folders=[];state.documents=[];state.revisions=[];state.reviews=[];state.tasks=[];state.people=[];state.invites=[];state.project=null;resetOperations();resetInbox();resetSearch();state.searchFilter={query:'',project:'',kind:'all',archived:false};state.notificationUnread=null;state.notificationFilter={project:'',unread:true};render();return;}
  state.profile=checked(await client.from('user_profiles').select('id,full_name,avatar_url,mobile').eq('id',state.user.id).single());
  if(previous!==state.user.id){closeViewer();modal.close();state.projects=[];state.members=[];state.folders=[];state.documents=[];state.revisions=[];state.reviews=[];state.tasks=[];state.people=[];state.invites=[];state.project=null;resetOperations();resetInbox();resetSearch();state.searchFilter={query:'',project:'',kind:'all',archived:false};state.notificationUnread=null;state.notificationFilter={project:'',unread:true};state.folder=null;await reload();}state.error='';render();
 }catch(error){state.error='Não foi possível verificar sua sessão. Confira a conexão e tente entrar novamente.';render();}
}
async function loadProviders(){try{const response=await fetch(`${SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(10000)});if(response.ok){const settings=await response.json();state.googleEnabled=settings.external?.google===true;const button=main.querySelector('[data-google-login]');if(button)button.disabled=!state.googleEnabled||state.busy;const info=main.querySelector('[data-google-info]');if(info)info.textContent=`Contas @bkm.com.br entram sem cadastro e sem senha.${state.googleEnabled?'':' Login Google em configuração.'}`;}}catch{}}
render();void refreshAuth();void loadProviders();

let draggedTask=null;
document.addEventListener('dragstart',e=>{const card=e.target.closest('[data-task-drag]');if(!card||!editable())return;draggedTask=card.dataset.taskDrag;e.dataTransfer.setData('text/plain',draggedTask);});
document.addEventListener('dragover',e=>{if(e.target.closest('[data-task-column]')&&draggedTask&&editable())e.preventDefault();});
document.addEventListener('dragend',()=>{draggedTask=null;});
document.addEventListener('drop',async e=>{const column=e.target.closest('[data-task-column]'),task=state.tasks.find(t=>t.id===draggedTask);draggedTask=null;if(!column||!task||task.archived||!editable()||state.busy)return;e.preventDefault();const stage=column.dataset.taskColumn;if(stage===task.stage)return;if(stage==='paused'){dialog('Pausar tarefa',`<form data-form="task-move" data-id="${task.id}" class="form-grid"><p>${esc(task.title)}</p><label>Motivo da pausa<textarea name="pause_reason" required maxlength="2000"></textarea></label><p class="form-error" hidden role="alert"></p><div class="dialog-actions"><button type="button" data-close-modal>Cancelar</button><button class="primary">Pausar</button></div></form>`);return;}await run(async()=>{await store.saveTask({stage},task.id);await reload();toast('Tarefa movida.');});});


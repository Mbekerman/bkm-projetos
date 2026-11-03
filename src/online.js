import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from '../public/cloud-config.js';
import {createCloudStore,checked} from '../public/cloud-store.js';
import {esc,projectForm,folderForm} from '../public/project-ui.js';
import {folderPath} from '../public/model.js';
import {googleOptions,normalizeMobile,avatarUrl} from '../public/auth-profile.js';
import {createAnnotationReview} from '../public/annotation-review.js';
import {latestReview,reviewMessage,reviewBadge,reviewHistory,requestReviewForm,decisionReviewForm} from '../public/revision-review.js';
import {openPdf} from '../public/pdf-viewer.js';

const client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const store=createCloudStore(client), main=document.getElementById('cloud-main'), modal=document.getElementById('cloud-modal'), viewer=document.getElementById('file-viewer');
const state={profile:null,googleEnabled:false,user:null,projects:[],members:[],folders:[],documents:[],revisions:[],reviews:[],reviewFilter:'in_review',project:null,folder:null,view:'projects',authMode:'login',busy:false,query:'',error:'',message:''};
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
 return `<div class="cloud-header"><div><p class="eyebrow">Ambiente conectado</p><h1>Projetos</h1><p>Projetos aos quais sua conta tem acesso.</p></div><button class="primary" data-new-project>+ Novo projeto</button></div><form class="cloud-search" data-form="search"><label>Buscar projetos<input name="query" type="search" value="${esc(state.query)}" placeholder="Código, nome ou município"></label><button class="quiet">Buscar</button></form><div class="grid">${filtered.map(p=>`<article class="project-card"><div class="project-art"><img src="assets/projetos.svg" alt=""><span>${esc(p.code)}</span></div><div class="card-body"><span class="tag">${esc(p.archived?'Arquivado':p.status)}</span><h2>${esc(p.name)}</h2><p class="muted">${esc(p.city||'Município não informado')}</p><p class="muted">${esc(p.responsible_name||'Responsável não informado')}</p><div class="cloud-actions"><button class="primary" data-open-project="${p.id}">Abrir diretórios</button>${p.owner_id===state.user.id?`<button data-edit-project="${p.id}">Editar</button>`:''}</div></div></article>`).join('')}</div>${filtered.length?'':'<div class="empty"><strong>Nenhum projeto encontrado</strong><p>Crie seu primeiro projeto ou solicite participação ao responsável.</p></div>'}`;
}
function filesPage(){
 if(!project())return '<div class="empty"><h1>Selecione um projeto</h1><p>Abra um projeto na lista para consultar os diretórios.</p><button data-cloud-view="projects">Ver projetos</button></div>';
 const data=shape(), path=folderPath(data,state.folder);
 const docs=state.documents.filter(d=>(!state.folder||d.folder_id===state.folder)&&`${d.code} ${d.title}`.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()));
 return `<div class="cloud-header"><div><p class="eyebrow">${esc(project().code)}</p><h1>${esc(project().name)}</h1><p>${project().archived?'Arquivado · somente consulta':'Documentos e revisões'}</p></div><div class="cloud-actions"><button data-refresh>Atualizar</button>${editable()?'<button class="primary" data-new-document>+ Enviar documento</button>':''}</div></div><div class="directory-head"><label class="sr" for="cloud-project">Projeto</label><select id="cloud-project">${state.projects.map(p=>`<option value="${p.id}" ${p.id===state.project?'selected':''}>${esc(p.name)}${p.archived?' (arquivado)':''}</option>`).join('')}</select></div><form class="cloud-search" data-form="search"><label>Buscar documentos<input name="query" type="search" value="${esc(state.query)}" placeholder="Código ou título"></label><button class="quiet">Buscar</button></form><div class="directory-layout"><section class="panel folder-panel"><h2>Pastas</h2><button data-cloud-folder="all" class="${!state.folder?'active':''}">Todos os documentos</button><div class="cloud-folder-list">${state.folders.map(f=>`<button data-cloud-folder="${f.id}" class="${f.id===state.folder?'active':''}">${esc(folderPath(data,f.id).map(f=>f.name).join(' / '))}</button>`).join('')||'<p class="muted">Crie uma pasta para organizar os arquivos.</p>'}</div>${editable()?'<button data-new-folder>+ Nova pasta</button>':''}</section><section><p class="cloud-parent-path">${esc(path.map(f=>f.name).join(' / ')||'Todos os documentos')}</p>${state.folder&&editable()?'<div class="cloud-actions"><button data-edit-folder>Renomear / mover</button><button data-new-folder>+ Subpasta</button></div>':''}<div class="panel">${docs.map(d=>{
 const revisions=state.revisions.filter(r=>r.document_id===d.id),ready=revisions.find(r=>r.upload_state==='ready'),pending=revisions.some(r=>r.upload_state==='pending');
 return `<div class="cloud-row"><div><strong>${esc(d.code)} · ${esc(d.title)}</strong><p>${esc(folderPath(data,d.folder_id).map(f=>f.name).join(' / '))}</p><span class="cloud-file">${ready?`Disponível: ${esc(ready.revision_code)} · ${esc(ready.original_filename)}`:'Nenhum arquivo recebido ainda'}</span>${ready?`<div>${reviewBadge(latestReview(state.reviews,ready.id))}</div>`:''}${pending?'<p class="cloud-status">Existe um envio pendente. Abra as revisões para retomar.</p>':''}</div><button data-document="${d.id}">Abrir revisões</button></div>`;}).join('')||'<div class="empty">Nenhum documento nesta seleção.</div>'}</div></section></div>`;
}
function approvalsPage(){
 if(!project())return '<div class="empty"><h1>Análises de revisões</h1><p>Crie ou abra um projeto para acompanhar os pareceres.</p><button data-cloud-view="projects">Ver projetos</button></div>';
 const reviews=state.reviews.filter(r=>state.reviewFilter==='all'||r.status===state.reviewFilter);
 return `<div class="cloud-header"><div><p class="eyebrow">${esc(project().code)}</p><h1>Análises de revisões</h1><p>O proprietário registra os pareceres. Cada versão tem seu próprio histórico.</p></div><button data-refresh>Atualizar</button></div><div class="review-filters"><label>Projeto<select id="cloud-project">${state.projects.map(p=>`<option value="${p.id}" ${p.id===state.project?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>Situação<select id="review-filter">${[['in_review','Em análise'],['approved','Aprovadas'],['approved_with_comments','Com ressalvas'],['changes_requested','Ajustes solicitados'],['all','Todas']].map(([value,label])=>`<option value="${value}" ${value===state.reviewFilter?'selected':''}>${label}</option>`).join('')}</select></label></div><section class="panel">${reviews.map(row=>{const r=state.revisions.find(r=>r.id===row.revision_id),doc=state.documents.find(d=>d.id===r?.document_id);if(!r)return '';return `<article class="cloud-row"><div><strong>${esc(doc?.code||'')} · ${esc(doc?.title||r.original_filename)}</strong><p>Revisão ${esc(r.revision_code)} · análise ${row.round_number}</p>${reviewBadge(row)}<p class="muted">Solicitada por ${esc(row.requested_name)}</p>${row.decision_message?`<p class="review-comment">${esc(row.decision_message)}</p>`:''}</div><div class="cloud-actions"><button data-view-revision="${r.id}">Visualizar</button><button data-document="${r.document_id}">Histórico</button>${row.status==='in_review'&&own()&&!project().archived?`<button class="primary" data-decide-review="${row.id}">Emitir parecer</button>`:''}</div></article>`;}).join('')||'<div class="empty">Nenhuma análise nesta seleção. Abra as revisões de um documento para enviar um arquivo para análise.</div>'}</section>`;
}
function profileForm(){const p=state.profile||{},photo=avatarUrl(p.avatar_url);return `<div class="panel cloud-settings">${photo?`<img class="profile-avatar" src="${esc(photo)}" alt="Foto de perfil" referrerpolicy="no-referrer">`:''}<h2>${esc(p.full_name||'Minha conta')}</h2><p>${esc(state.user.email)}</p><form class="form-grid" data-form="profile"><label>Celular<input name="mobile" type="tel" autocomplete="tel" required maxlength="30" placeholder="(11) 99999-9999" value="${esc(p.mobile||'')}"></label><p class="muted">O Google fornece nome, foto e e-mail. Informe seu celular para completar o perfil. Este número não é verificado por SMS.</p><button class="primary" ${state.busy?'disabled':''}>Salvar celular</button></form></div>`;}
function settingsPage(){return `<div class="cloud-header"><h1>Minha conta</h1></div>${profileForm()}<div class="panel cloud-settings"><div class="settings-row"><div><h2>Acesso conectado</h2><p class="auth-email">${esc(state.user.email)}</p><p class="muted">Cada projeto controla seus participantes.</p></div></div><div class="settings-row"><div><h2>Arquivos</h2><p class="muted">PDF, PNG e JPEG, até 20 MiB. Os originais e cada revisão são preservados.</p></div></div><div class="settings-row"><div><h2>Demonstração local</h2><p class="muted">Seus exemplos locais permanecem separados. A importação para a nuvem ainda não está disponível.</p><a href="index.html">Abrir demonstração</a></div></div><div class="settings-row"><p class="muted">Anotações, desenhos e pareceres estão disponíveis por revisão em PDF e imagens. IFC, DWG e integração de tarefas serão implementados nas próximas etapas.</p></div></div>`;}
function render(){
 const signed=!!state.user,needsMobile=signed&&state.user.app_metadata?.providers?.includes('google')&&!state.profile?.mobile;
 document.getElementById('cloud-sidebar').hidden=!signed;document.getElementById('signout').hidden=!signed;main.classList.toggle('auth-page',!signed);
 document.querySelectorAll('[data-cloud-view]').forEach(b=>{const active=b.dataset.cloudView===state.view;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 main.innerHTML=needsMobile?`${state.error?`<p role="alert" class="cloud-error">${esc(state.error)}</p>`:''}<h1>Complete seu perfil</h1>${profileForm()}`:signed?`${state.error?`<p role="alert" class="cloud-error">${esc(state.error)}</p>`:''}${state.busy?'<p class="cloud-progress" role="status">Carregando…</p>':''}${({projects:projectsPage,files:filesPage,approvals:approvalsPage,settings:settingsPage}[state.view]||projectsPage)()}`:loginPage();
}
async function reload(){
 if(!state.user)return;
 state.projects=await store.projects();state.members=await store.members();
 if(!state.projects.some(p=>p.id===state.project))state.project=state.projects[0]?.id||null;
 if(state.project)Object.assign(state,await store.projectData(state.project));else Object.assign(state,{folders:[],documents:[],revisions:[],reviews:[]});
 if(!state.folders.some(f=>f.id===state.folder))state.folder=null;
}
async function run(work,{close=true}={}){
 if(state.busy)return;state.busy=true;state.error='';
 document.querySelectorAll('button').forEach(b=>b.disabled=true);
 const message=modal.open?document.getElementById('cloud-modal-body').querySelector('.form-error'):null;
 if(message){message.hidden=false;message.className='form-error cloud-progress';message.textContent='Processando. Aguarde a confirmação antes de fechar.';}
 try{await work();if(close)modal.close();}
 catch(error){const text=error.message||'Falha na operação. Tente novamente.';if(modal.open){let p=document.getElementById('cloud-modal-body').querySelector('.form-error');if(!p){p=document.createElement('p');document.getElementById('cloud-modal-body').append(p)}p.hidden=false;p.className='form-error';p.setAttribute('role','alert');p.textContent=text;}else state.error=text;}
 finally{state.busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);render();}
}
function uploadForm(documentId){
 if(!state.folders.length){toast('Crie uma pasta antes de enviar documentos.');return;}
 const doc=state.documents.find(d=>d.id===documentId);
 dialog(doc?'Nova revisão':'Enviar documento',`<form data-form="upload" data-document-id="${doc?.id||''}" class="form-grid">${doc?`<p>${esc(doc.code)} · ${esc(doc.title)}</p>`:`<label>Código do documento<input name="code" maxlength="80" required></label><label>Título<input name="title" maxlength="200" required></label><label>Pasta<select name="folderId" required>${state.folders.map(f=>`<option value="${f.id}" ${f.id===state.folder?'selected':''}>${esc(folderPath(shape(),f.id).map(f=>f.name).join(' / '))}</option>`).join('')}</select></label>`}<label>Código da revisão<input name="revisionCode" required maxlength="30" placeholder="Ex.: R00"></label><label>Arquivo<input name="file" type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" required></label><p class="muted">PDF ou imagem, até 20 MiB. Cada revisão preserva seu arquivo original.</p><p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" data-close-modal>Cancelar</button><button class="primary">Enviar arquivo</button></div></form>`);
}
function documentDialog(id){const d=state.documents.find(d=>d.id===id);if(!d)return;
 dialog(d.title,`<p class="muted">${esc(d.code)} · ${esc(folderPath(shape(),d.folder_id).map(f=>f.name).join(' / '))}</p><div>${state.revisions.filter(r=>r.document_id===id).map(r=>{const latest=latestReview(state.reviews,r.id);return `<section class="revision-review"><div class="cloud-row"><div><strong>${esc(r.revision_code)}</strong><p>${esc(r.original_filename)} · ${(Number(r.file_size)/1024/1024).toFixed(2)} MiB</p><span class="tag">${r.upload_state==='ready'?'Arquivo recebido':'Envio pendente'}</span>${r.upload_state==='ready'?reviewBadge(latest):''}</div><div class="cloud-actions">${r.upload_state==='ready'?`<button data-view-revision="${r.id}">Visualizar</button><button data-download-revision="${r.id}">Baixar original</button>${editable()&&latest?.status!=='in_review'?`<button data-request-review="${r.id}">${latest?'Solicitar nova análise':'Enviar para análise'}</button>`:''}${own()&&!project().archived&&latest?.status==='in_review'?`<button class="primary" data-decide-review="${latest.id}">Emitir parecer</button>`:''}`:editable()&&r.created_by===state.user.id?`<button data-retry-revision="${r.id}">Retomar envio</button>`:''}</div></div>${reviewHistory(state.reviews,r.id)}</section>`;}).join('')||'<p class="note">Nenhuma revisão enviada. Você pode iniciar um envio abaixo.</p>'}</div>${editable()?`<div class="dialog-actions"><button class="primary" data-new-revision="${id}">+ Nova revisão</button></div>`:''}`);
}
async function viewRevision(id,download=false){
 const r=state.revisions.find(r=>r.id===id);if(!r)throw Error('Revisão não encontrada.');
 const cleanup=download?null:closeViewer(),generation=viewerGeneration;await cleanup;
 if(!download&&generation!==viewerGeneration)return;
 const blob=await store.download(r);if(!download&&generation!==viewerGeneration)return;
 if(download){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=r.original_filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;}
 modal.close();document.getElementById('viewer-title').textContent=`${r.original_filename} · ${r.revision_code}`;viewer.showModal();
 const content=document.getElementById('viewer-content'),tools=document.getElementById('viewer-tools'),panel=document.getElementById('annotation-panel');tools.hidden=r.mime_type!=='application/pdf';content.innerHTML='<p class="note">Abrindo arquivo…</p>';panel.textContent='Carregando anotações…';
 try{const session=await createAnnotationReview({revision:r,store,panel,userId:state.user.id,ownerId:project()?.owner_id,canWrite:editable()});if(generation!==viewerGeneration){session.dispose();return;}review=session;}
 catch{if(generation!==viewerGeneration)return;panel.textContent='Não foi possível carregar as anotações. Feche e abra a revisão para tentar novamente.';}
 try{
  if(r.mime_type==='application/pdf'){const dispose=await openPdf(blob,content,tools,{onPage:surface=>{if(generation===viewerGeneration)review?.attach(surface);}});if(generation!==viewerGeneration){dispose();return;}disposePdf=dispose;}
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
 if(d.cloudView){state.view=d.cloudView;state.query='';render();return;}
 if(d.openProject){state.project=d.openProject;state.folder=null;state.query='';state.view='files';await run(reload);return;}
 if(d.editProject){state.project=d.editProject;dialog('Editar projeto',projectForm(shape(),state.project)+`<div class="dialog-actions"><button data-toggle-archive>${project().archived?'Restaurar':'Arquivar'} projeto</button></div>`);return;}
 if(d.newProject!==undefined){dialog('Novo projeto',projectForm(shape()));return;}
 if(d.cloudFolder){state.folder=d.cloudFolder==='all'?null:d.cloudFolder;render();return;}
 if(d.newFolder!==undefined){dialog('Nova pasta',folderForm(shape(),{project:state.project,folder:state.folder}));return;}
 if(d.editFolder!==undefined){dialog('Editar pasta',folderForm(shape(),{project:state.project,folder:state.folder},state.folder));return;}
 if(d.newDocument!==undefined){uploadForm();return;}
 if(d.newRevision){uploadForm(d.newRevision);return;}
 if(d.requestReview){const r=state.revisions.find(r=>r.id===d.requestReview);if(r)dialog('Enviar revisão para análise',requestReviewForm(r));return;}
 if(d.decideReview){const row=state.reviews.find(row=>row.id===d.decideReview),r=state.revisions.find(r=>r.id===row?.revision_id);if(row&&r)dialog('Emitir parecer',decisionReviewForm(row,r));return;}
 if(d.document){documentDialog(d.document);return;}
 if(d.retryRevision){const r=state.revisions.find(r=>r.id===d.retryRevision);dialog('Retomar envio',`<form class="form-grid" data-form="retry" data-id="${r.id}"><p>Selecione novamente ${esc(r.original_filename)} (${r.file_size} bytes).</p><label>Arquivo<input type="file" name="file" required accept=".pdf,.png,.jpg,.jpeg"></label><p class="form-error" hidden role="alert"></p><div class="dialog-actions"><button type="button" data-close-modal>Cancelar</button><button class="primary">Retomar envio</button></div></form>`);return;}
 if(d.viewRevision||d.downloadRevision){await run(()=>viewRevision(d.viewRevision||d.downloadRevision,!!d.downloadRevision),{close:false});return;}
 if(d.refresh!==undefined){await run(reload);return;}
 if(d.toggleArchive!==undefined){const p=project();dialog(p.archived?'Restaurar projeto':'Arquivar projeto',`<p>${p.archived?'Restaurar':'Arquivar'} ${esc(p.name)}? Os documentos serão preservados.</p><div class="dialog-actions"><button data-close-modal>Cancelar</button><button data-confirm-archive class="primary">Confirmar</button></div>`);return;}
 if(d.confirmArchive!==undefined)await run(async()=>{await store.saveProject({archived:!project().archived},state.project);await reload();toast('Projeto atualizado.');});
 if(button.id==='signout')await run(async()=>{checked(await client.auth.signOut());closeViewer();state.user=null;state.projects=[];state.members=[];state.folders=[];state.documents=[];state.revisions=[];state.reviews=[];state.project=null;});
});
document.addEventListener('change',async e=>{if(e.target.matches('[data-review-outcome]')){e.target.form.querySelector('textarea[name="message"]').required=e.target.value!=='approved';}if(e.target.id==='review-filter'){state.reviewFilter=e.target.value;render();return;}if(e.target.id==='cloud-project'){state.project=e.target.value;state.folder=null;state.query='';await run(reload);}});
document.addEventListener('submit',async e=>{
 const form=e.target.closest('form');if(!form)return;e.preventDefault();if(state.busy)return;
 const f=Object.fromEntries(new FormData(form)),kind=form.dataset.form;
 if(kind==='search'){state.query=f.query.trim();render();return;}
 await run(async()=>{
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
  if(!state.user){state.profile=null;closeViewer();modal.close();state.projects=[];state.members=[];state.folders=[];state.documents=[];state.revisions=[];state.reviews=[];state.project=null;render();return;}
  state.profile=checked(await client.from('user_profiles').select('id,full_name,avatar_url,mobile').eq('id',state.user.id).single());
  if(previous!==state.user.id){closeViewer();modal.close();state.projects=[];state.members=[];state.folders=[];state.documents=[];state.revisions=[];state.reviews=[];state.project=null;state.folder=null;await reload();}state.error='';render();
 }catch(error){state.error='Não foi possível verificar sua sessão. Confira a conexão e tente entrar novamente.';render();}
}
async function loadProviders(){try{const response=await fetch(`${SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(10000)});if(response.ok){const settings=await response.json();state.googleEnabled=settings.external?.google===true;const button=main.querySelector('[data-google-login]');if(button)button.disabled=!state.googleEnabled||state.busy;const info=main.querySelector('[data-google-info]');if(info)info.textContent=`Contas @bkm.com.br entram sem cadastro e sem senha.${state.googleEnabled?'':' Login Google em configuração.'}`;}}catch{}}
render();void refreshAuth();void loadProviders();

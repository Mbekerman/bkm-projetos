import {esc} from './project-ui.js';
import {annotationPoint,annotationBody,pageAnnotations,canManageAnnotation} from './annotation-model.js';

export async function createAnnotationReview({revision,store,panel,userId,ownerId,canWrite}){
 let rows=await store.annotations(revision.id),closed=false,busy=false,placing=false,draft=null,surface=null,layer=null,page=1,selected=null,error='';
 const canManage=note=>canManageAnnotation(note,{userId,ownerId,canWrite});
 const date=value=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
 function paint(){
  if(closed)return;
  if(layer){layer.replaceChildren();for(const note of pageAnnotations(rows,page)){const marker=document.createElement('button');marker.type='button';marker.className=`annotation-pin ${note.status==='resolved'?'resolved':''} ${note.id===selected?'selected':''}`;marker.style.left=`${note.x*100}%`;marker.style.top=`${note.y*100}%`;marker.textContent=String(rows.indexOf(note)+1);marker.setAttribute('aria-label',`Anotação ${rows.indexOf(note)+1}: ${note.body}`);marker.addEventListener('click',e=>{e.stopPropagation();selected=note.id;draft=null;placing=false;paint();panel.querySelector(`[data-note-id="${note.id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});});layer.append(marker);}
   if(draft){const pin=document.createElement('span');pin.className='annotation-pin draft';pin.style.left=`${draft.x*100}%`;pin.style.top=`${draft.y*100}%`;pin.textContent='+';layer.append(pin);}layer.classList.toggle('placing',placing);}
  const visible=pageAnnotations(rows,page);
  panel.innerHTML=`<div class="annotation-heading"><h3>Anotações · página ${page}</h3><button type="button" data-note-refresh ${busy?'disabled':''}>Atualizar</button></div>${error?`<p class="cloud-error" role="alert">${esc(error)}</p>`:''}${canWrite?`<button type="button" class="${placing?'tonal':'primary'}" data-note-place ${busy||!surface?'disabled':''}>${placing?'Toque no ponto da prancha':'＋ Marcar na prancha'}</button>`:'<p class="muted">Somente consulta de anotações.</p>'}${draft?`<form data-note-form class="form-grid"><label>Comentário<textarea name="body" required maxlength="2000" rows="4">${esc(draft.body||'')}</textarea></label><div class="cloud-actions"><button type="button" data-note-cancel ${busy?'disabled':''}>Cancelar</button><button class="primary" ${busy?'disabled':''}>${busy?'Salvando…':'Salvar anotação'}</button></div></form>`:''}<p class="muted annotation-count">${visible.length} anotação(ões) nesta página · ${rows.filter(n=>!n.deleted_at).length} nesta revisão</p>${visible.map(n=>`<article data-note-id="${n.id}" class="annotation-card ${selected===n.id?'selected':''}"><strong>#${rows.indexOf(n)+1} · ${n.status==='resolved'?'Resolvida':'Aberta'}</strong><p class="annotation-body">${esc(n.body)}</p><small>${esc(n.author_name)} · ${esc(date(n.created_at))}${n.status==='resolved'?` · atualizada ${esc(date(n.updated_at))}`:''}</small>${canManage(n)?`<div class="cloud-actions"><button type="button" data-note-status="${n.id}" ${busy?'disabled':''}>${n.status==='resolved'?'Reabrir':'Resolver'}</button><button type="button" data-note-remove="${n.id}" ${busy?'disabled':''}>Remover</button></div>`:''}</article>`).join('')||'<p class="note">Nenhuma anotação nesta página.</p>'}<p class="muted">Marcações desta revisão. O arquivo original permanece preservado.</p>`;
 }
 async function operation(work){if(busy||closed)return;busy=true;error='';paint();try{await work();}catch(e){error=e.message||'Não foi possível salvar. Tente novamente.';}finally{busy=false;paint();}}
 const captureBody=()=>{const body=panel.querySelector('textarea')?.value;if(draft&&body!==undefined)draft.body=body;};
 const click=async e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();if(busy)return;captureBody();const d=b.dataset;
  if(d.notePlace!==undefined){placing=!placing;draft=null;paint();}
  if(d.noteCancel!==undefined){draft=null;placing=false;paint();}
  if(d.noteRefresh!==undefined)await operation(async()=>{rows=await store.annotations(revision.id);});
  if(d.noteStatus){const n=rows.find(n=>n.id===d.noteStatus);if(!n||!canManage(n))return;await operation(async()=>{const saved=await store.updateAnnotation(n.id,{status:n.status==='resolved'?'open':'resolved'});rows=rows.map(r=>r.id===saved.id?saved:r);});}
  if(d.noteRemove){const n=rows.find(n=>n.id===d.noteRemove);if(!n||!canManage(n))return;await operation(async()=>{const saved=await store.updateAnnotation(n.id,{deleted_at:new Date().toISOString()});rows=rows.map(r=>r.id===saved.id?saved:r);});}
 };
 const submit=async e=>{if(!e.target.matches('[data-note-form]'))return;e.preventDefault();e.stopPropagation();captureBody();if(!draft||busy)return;await operation(async()=>{const note=await store.createAnnotation({project_id:revision.project_id,revision_id:revision.id,page_number:draft.page,x:draft.x,y:draft.y,body:annotationBody(draft.body)});rows.push(note);selected=note.id;draft=null;placing=false;});};
 const onPoint=e=>{if(!placing||!canWrite||busy||e.target.closest('button'))return;const point=annotationPoint(e.clientX,e.clientY,surface.getBoundingClientRect());draft={...point,page,body:''};placing=false;paint();panel.querySelector('textarea')?.focus({preventScroll:true});};
 panel.addEventListener('click',click);panel.addEventListener('submit',submit);paint();
 return {
  attach({element,pageNumber}){if(closed)return;captureBody();if(page!==pageNumber){draft=null;placing=false;}page=pageNumber;surface?.removeEventListener('click',onPoint);layer?.remove();surface=element;layer=document.createElement('div');layer.className='annotation-layer';surface.append(layer);surface.addEventListener('click',onPoint);paint();},
  dispose(){closed=true;surface?.removeEventListener('click',onPoint);layer?.remove();panel.removeEventListener('click',click);panel.removeEventListener('submit',submit);panel.replaceChildren();}
 };
}

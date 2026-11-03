import {esc} from './project-ui.js';
import {annotationPoint,annotationBody,pageAnnotations,canManageAnnotation,DRAWING_TOOLS,drawingGeometry,appendDrawingPoint} from './annotation-model.js';
import {createDrawingSvg,renderAnnotationShape} from './annotation-shapes.js';

export async function createAnnotationReview({revision,store,panel,userId,ownerId,canWrite,focusId=null,onCreateTask}){
 let rows=await store.annotations(revision.id),closed=false,busy=false,placing=false,draft=null,surface=null,layer=null,page=1,selected=focusId,error='',tool='pin',color='#b3261e',weight=3,fontSize=18,stroke=null;
 const canManage=note=>canManageAnnotation(note,{userId,ownerId,canWrite});
 const date=value=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
 const label=kind=>DRAWING_TOOLS.find(([key])=>key===(kind||'pin'))?.[1]||'Marcação';
 const captureBody=()=>{const body=panel.querySelector('textarea')?.value;if(draft&&body!==undefined)draft.body=body;};
 const selectedNote=note=>{if(placing||busy)return;captureBody();selected=note.id;draft=null;paint();panel.querySelector(`[data-note-id="${note.id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});};
 function paintLayer(){
  if(!layer||closed)return;layer.replaceChildren();layer.classList.toggle('placing',placing);const rect=surface.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const canvas=createDrawingSvg(rect.width,rect.height);layer.append(canvas);
  for(const note of pageAnnotations(rows,page)){
   if((note.kind||'pin')==='pin'){
    const marker=document.createElement('button');marker.type='button';marker.className=`annotation-pin ${note.status==='resolved'?'resolved':''} ${note.id===selected?'selected':''}`;marker.style.left=`${note.x*100}%`;marker.style.top=`${note.y*100}%`;if(note.status!=='resolved')marker.style.backgroundColor=note.stroke_color||'#b3261e';marker.textContent=String(rows.indexOf(note)+1);marker.setAttribute('aria-label',`Anotação ${rows.indexOf(note)+1}: ${note.body}`);marker.addEventListener('click',e=>{e.stopPropagation();selectedNote(note);});layer.append(marker);
   }else{const shape=renderAnnotationShape(note,{width:rect.width,height:rect.height,selected:note.id===selected,onSelect:()=>selectedNote(note)});if(shape){shape.classList.toggle('resolved',note.status==='resolved');canvas.append(shape);}}
  }
  const current=stroke||draft;if(current){
   if(current.kind==='pin'){const pin=document.createElement('span');pin.className='annotation-pin draft';pin.style.left=`${current.x*100}%`;pin.style.top=`${current.y*100}%`;pin.textContent='+';layer.append(pin);}
   else{const shape=renderAnnotationShape({...current,geometry:{points:current.points}},{width:rect.width,height:rect.height,draft:true});if(shape)canvas.append(shape);}
  }
 }
 function paint(){
  if(closed)return;paintLayer();const visible=pageAnnotations(rows,page),textTool=draft&&['text','callout'].includes(draft.kind),requiresBody=draft&&(['pin','text','callout'].includes(draft.kind));
  panel.innerHTML=`<div class="annotation-heading"><h3>Anotações · página ${page}</h3><button type="button" data-note-refresh ${busy?'disabled':''}>Atualizar</button></div>${error?`<p class="cloud-error" role="alert">${esc(error)}</p>`:''}${canWrite?`<div class="drawing-toolbar"><label>Ferramenta<select data-drawing-tool ${busy?'disabled':''}>${DRAWING_TOOLS.map(([key,name])=>`<option value="${key}" ${tool===key?'selected':''}>${name}</option>`).join('')}</select></label><div class="drawing-style"><label>Cor<input data-drawing-color type="color" value="${color}" ${busy?'disabled':''}></label><label>Traço<select data-drawing-weight ${busy?'disabled':''}>${[1,2,3,5,8].map(n=>`<option value="${n}" ${weight===n?'selected':''}>${n} px</option>`).join('')}</select></label>${['text','callout'].includes(tool)?`<label>Texto<select data-drawing-font ${busy?'disabled':''}>${[14,18,24,32].map(n=>`<option value="${n}" ${fontSize===n?'selected':''}>${n} px</option>`).join('')}</select></label>`:''}</div><button type="button" class="${placing?'tonal':'primary'}" data-note-place ${busy||!surface?'disabled':''}>${placing?'Cancelar desenho':tool==='pin'?'＋ Marcar na prancha':`＋ ${label(tool)}`}</button><p class="drawing-hint">${placing?(['pin','text'].includes(tool)?'Toque na prancha para posicionar.':'Arraste na prancha para desenhar. No celular, o toque desenha enquanto esta ferramenta está ativa.'):'Selecione a ferramenta, desenhe e salve. Fora do modo desenho, arraste para navegar.'}</p></div>`:'<p class="muted">Somente consulta de anotações.</p>'}${draft?`<form data-note-form class="form-grid"><label>${textTool?'Texto da marcação':`Comentário${requiresBody?'':' (opcional)'}`}<textarea name="body" ${requiresBody?'required':''} maxlength="${textTool?240:2000}" rows="3">${esc(draft.body||'')}</textarea></label><div class="cloud-actions"><button type="button" data-note-cancel ${busy?'disabled':''}>Descartar</button><button class="primary" ${busy?'disabled':''}>${busy?'Salvando…':'Salvar anotação'}</button></div></form>`:''}<p class="muted annotation-count">${visible.length} anotação(ões) nesta página · ${rows.filter(n=>!n.deleted_at).length} nesta revisão</p>${visible.map(n=>`<article data-note-id="${n.id}" class="annotation-card ${selected===n.id?'selected':''}"><button type="button" class="annotation-select" data-note-select="${n.id}">#${rows.indexOf(n)+1} · ${esc(label(n.kind))} · ${n.status==='resolved'?'Resolvida':'Aberta'}</button><p class="annotation-body">${esc(n.body)}</p><small>${esc(n.author_name)} · ${esc(date(n.created_at))}${n.status==='resolved'?` · atualizada ${esc(date(n.updated_at))}`:''}</small>${canWrite&&onCreateTask?`<button type="button" data-note-task="${n.id}">Criar tarefa</button>`:''}${canManage(n)?`<div class="cloud-actions"><button type="button" data-note-status="${n.id}" ${busy?'disabled':''}>${n.status==='resolved'?'Reabrir':'Resolver'}</button><button type="button" data-note-remove="${n.id}" ${busy?'disabled':''}>Remover</button></div>`:''}</article>`).join('')||'<p class="note">Nenhuma anotação nesta página.</p>'}<p class="muted">Marcações desta revisão. O arquivo original permanece preservado.</p>`;
 }
 async function operation(work){if(busy||closed)return;busy=true;error='';paint();try{await work();}catch(e){error=e.message||'Não foi possível salvar. Tente novamente.';}finally{busy=false;paint();}}
 const click=async e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();if(busy)return;captureBody();const d=b.dataset;
  if(d.noteTask){const note=rows.find(n=>n.id===d.noteTask);if(note&&canWrite)await onCreateTask?.(note);return;}
  if(d.notePlace!==undefined){placing=!placing;draft=null;stroke=null;error='';paint();}
  if(d.noteCancel!==undefined){draft=null;placing=false;paint();}
  if(d.noteSelect){const n=rows.find(n=>n.id===d.noteSelect);if(n){placing=false;selectedNote(n);}}
  if(d.noteRefresh!==undefined)await operation(async()=>{rows=await store.annotations(revision.id);});
  if(d.noteStatus){const n=rows.find(n=>n.id===d.noteStatus);if(!n||!canManage(n))return;await operation(async()=>{const saved=await store.updateAnnotation(n.id,{status:n.status==='resolved'?'open':'resolved'});rows=rows.map(r=>r.id===saved.id?saved:r);});}
  if(d.noteRemove){const n=rows.find(n=>n.id===d.noteRemove);if(!n||!canManage(n))return;await operation(async()=>{const saved=await store.updateAnnotation(n.id,{deleted_at:new Date().toISOString()});rows=rows.map(r=>r.id===saved.id?saved:r);});}
 };
 const change=e=>{if(!e.target.matches('[data-drawing-tool],[data-drawing-color],[data-drawing-weight],[data-drawing-font]'))return;captureBody();const d=e.target.dataset;
  if(d.drawingTool!==undefined){tool=e.target.value;placing=false;stroke=null;draft=null;}
  if(d.drawingColor!==undefined){color=e.target.value;if(draft)draft.stroke_color=color;}
  if(d.drawingWeight!==undefined){weight=Number(e.target.value);if(draft)draft.stroke_width=weight;}
  if(d.drawingFont!==undefined){fontSize=Number(e.target.value);if(draft)draft.font_size=fontSize;}
  paint();
 };
 const input=e=>{if(e.target.matches('textarea')&&draft){draft.body=e.target.value;paintLayer();}};
 const submit=async e=>{if(!e.target.matches('[data-note-form]'))return;e.preventDefault();e.stopPropagation();captureBody();if(!draft||busy)return;await operation(async()=>{const body=annotationBody(draft.body||(!['pin','text','callout'].includes(draft.kind)?label(draft.kind):''));const note=await store.createAnnotation({project_id:revision.project_id,revision_id:revision.id,page_number:draft.page,x:draft.x,y:draft.y,kind:draft.kind,geometry:drawingGeometry(draft.kind,draft.points),stroke_color:draft.stroke_color,stroke_width:draft.stroke_width,font_size:draft.font_size,body});rows.push(note);selected=note.id;draft=null;placing=false;});};
 function point(e,clamp=false){const rect=surface.getBoundingClientRect();return annotationPoint(clamp?Math.max(rect.left,Math.min(rect.right,e.clientX)):e.clientX,clamp?Math.max(rect.top,Math.min(rect.bottom,e.clientY)):e.clientY,rect);}
 const down=e=>{
  if(!placing||!canWrite||busy||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
  e.preventDefault();e.stopPropagation();const p=point(e);layer.setPointerCapture(e.pointerId);stroke={...p,page,kind:tool,points:[p],body:'',stroke_color:color,stroke_width:weight,font_size:fontSize,pointerId:e.pointerId};paintLayer();
 };
 const move=e=>{if(!stroke||stroke.pointerId!==e.pointerId)return;e.preventDefault();const p=point(e,true),rect=surface.getBoundingClientRect();if(tool==='freehand')stroke.points=appendDrawingPoint(stroke.points,p,rect);else if(!['pin','text'].includes(tool))stroke.points=[stroke.points[0],p];paintLayer();};
 const up=e=>{if(!stroke||stroke.pointerId!==e.pointerId)return;e.preventDefault();e.stopPropagation();const p=point(e,true);if(tool==='freehand')stroke.points=appendDrawingPoint(stroke.points,p,surface.getBoundingClientRect(),true);else if(!['pin','text'].includes(tool))stroke.points=[stroke.points[0],p];
  const rect=surface.getBoundingClientRect(),distance=stroke.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot((p.x-stroke.points[i].x)*rect.width,(p.y-stroke.points[i].y)*rect.height),0),tooSmall=!['pin','text'].includes(tool)&&distance<4;
  layer.releasePointerCapture(e.pointerId);if(tooSmall){stroke=null;error='Arraste para definir o tamanho da forma.';paint();return;}draft=stroke;stroke=null;placing=false;paint();if(['pin','text','callout'].includes(tool))panel.querySelector('textarea')?.focus({preventScroll:true});
 };
 const cancel=()=>{stroke=null;placing=false;paint();};
 const observer=new ResizeObserver(()=>paintLayer());
 function detach(){observer.disconnect();if(layer){layer.removeEventListener('pointerdown',down);layer.removeEventListener('pointermove',move);layer.removeEventListener('pointerup',up);layer.removeEventListener('pointercancel',cancel);layer.remove();}stroke=null;}
 panel.addEventListener('click',click);panel.addEventListener('change',change);panel.addEventListener('input',input);panel.addEventListener('submit',submit);paint();
 return {
  attach({element,pageNumber}){if(closed)return;captureBody();if(page!==pageNumber){draft=null;placing=false;}detach();page=pageNumber;surface=element;layer=document.createElement('div');layer.className='annotation-layer';surface.append(layer);layer.addEventListener('pointerdown',down);layer.addEventListener('pointermove',move);layer.addEventListener('pointerup',up);layer.addEventListener('pointercancel',cancel);observer.observe(surface);paint();},
  dispose(){closed=true;detach();panel.removeEventListener('click',click);panel.removeEventListener('change',change);panel.removeEventListener('input',input);panel.removeEventListener('submit',submit);panel.replaceChildren();}
 };
}

import { PROJECT_STATUSES, folderPath, descendants } from './model.js';
export const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tag = value => `<span class="tag">${esc(value)}</span>`;
export const actions = '<p class="form-error" role="alert" hidden></p><div class="dialog-actions"><button type="button" data-act="close">Cancelar</button><button class="primary">Salvar</button></div>';
export function projectForm(data, id) {
  let n = data.projects.length + 1;
  while(data.projects.some(p => p.code === `BKM-${String(n).padStart(3,'0')}`)) n++;
  const p = data.projects.find(p=>p.id===id) || {code:`BKM-${String(n).padStart(3,'0')}`,name:'',city:'',owner:'Equipe de Projetos',status:PROJECT_STATUSES[0],description:'',startDate:'',endDate:''};
  return `<form class="form-grid" data-form="project" ${id?`data-id="${esc(id)}"`:''}>
    <label>Código<input name="code" required maxlength="30" value="${esc(p.code)}"></label>
    <label>Nome do projeto<input name="name" required maxlength="100" value="${esc(p.name)}"></label>
    <label>Município<input name="city" required maxlength="80" value="${esc(p.city)}" placeholder="Ex.: São Paulo · SP"></label>
    <label>Responsável<input name="owner" required maxlength="80" value="${esc(p.owner)}"></label>
    <label>Situação<select name="status">${PROJECT_STATUSES.map(s=>`<option ${s===p.status?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
    <div class="form-columns"><label>Início previsto<input name="startDate" type="date" value="${esc(p.startDate)}"></label><label>Conclusão prevista<input name="endDate" type="date" value="${esc(p.endDate)}"></label></div>
    <label>Descrição<textarea name="description" maxlength="2000">${esc(p.description)}</textarea></label>${actions}</form>`;
}
export function projectDetails(data, state, heading) {
  const p=data.projects.find(p=>p.id===state.project);
  if(!p) return heading('Projeto não encontrado','Volte para a lista de projetos.','<button data-view="projetos">Ver projetos</button>');
  const date=v=>v?esc(v.split('-').reverse().join('/')):'Não informada';
  return '<button class="quiet" data-view="projetos">← Todos os projetos</button>'+heading(esc(p.name),`${esc(p.code)} · ${esc(p.city)}`,p.archived?'<button data-act="restore">Restaurar projeto</button>':'<button class="primary" data-act="edit-project">Editar projeto</button>')+
    (p.archived?'<p class="note">Projeto arquivado. Pastas, documentos e tarefas preservados. Restaure-o para continuar as alterações.</p>':'')+
    `<div class="panel detail-panel">${tag(p.archived?'Arquivado':p.status)}<dl class="details"><div><dt>Responsável</dt><dd>${esc(p.owner)}</dd></div><div><dt>Início previsto</dt><dd>${date(p.startDate)}</dd></div><div><dt>Conclusão prevista</dt><dd>${date(p.endDate)}</dd></div><div class="wide"><dt>Descrição</dt><dd class="multiline">${esc(p.description||'Nenhuma descrição informada.')}</dd></div></dl></div>
    <div class="stats detail-stats"><div class="stat">Documentos<b>${data.documents.filter(d=>d.project===p.id).length}</b></div><div class="stat">Pastas<b>${data.folders.filter(f=>f.project===p.id).length}</b></div><div class="stat">Tarefas abertas<b>${data.tasks.filter(t=>t.project===p.id&&t.status!=='Concluída').length}</b></div></div><div class="project-actions"><button class="tonal" data-act="project-files">Abrir diretórios</button><button data-act="project-tasks">Ver tarefas deste projeto</button>${p.archived?'':'<button class="quiet" data-act="archive">Arquivar projeto</button>'}</div>`;
}
export function directories(data,state,heading) {
  const p=data.projects.find(p=>p.id===state.project), disabled=!p||p.archived;
  const rows=data.documents.filter(d=>d.project===state.project&&(!state.folder||d.folderId===state.folder)&&d.name.toLocaleLowerCase().includes(state.query.toLocaleLowerCase()));
  function tree(parent=null,depth=0,seen=new Set()) {return data.folders.filter(f=>f.project===state.project&&f.parent===parent&&!seen.has(f.id)).map(f=>{const next=new Set(seen);next.add(f.id);return `<div class="folder-node"><button style="--depth:${Math.min(depth,8)}" data-folder="${esc(f.id)}" class="${state.folder===f.id?'active':''}" title="${esc(folderPath(data,f.id).map(n=>n.name).join(' / '))}">${esc(f.name)}</button>${tree(f.id,depth+1,next)}</div>`}).join('')}
  return heading('Diretórios','Pastas por projeto. Documentos de demonstração.',`<button class="primary" data-act="document" ${disabled?'disabled':''}>+ Adicionar documento</button>`)+
    `<div class="directory-head"><label class="sr" for="project-select">Projeto</label><select id="project-select">${data.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===state.project?'selected':''}>${esc(p.name)}${p.archived?' (arquivado)':''}</option>`).join('')}</select><button data-act="details">Detalhes do projeto</button></div>${p?.archived?'<p class="note">Projeto arquivado: consulta disponível; alterações bloqueadas.</p>':''}
    <div class="directory-layout"><section class="panel folder-panel"><h2>Pastas e disciplinas</h2><button data-folder="all" class="${state.folder?'':'active'}">Todos os documentos</button><div class="folder-tree">${tree()||'<p class="muted">Nenhuma pasta criada.</p>'}</div><button data-act="folder" ${disabled?'disabled':''}>+ Nova pasta</button></section>
    <section><div class="breadcrumbs" aria-label="Caminho da pasta"><button class="quiet" data-folder="all">Todos os documentos</button>${folderPath(data,state.folder).map(f=>`<span>/</span><button class="quiet" data-folder="${esc(f.id)}">${esc(f.name)}</button>`).join('')}</div><div class="toolbar"><span class="muted">${rows.length} documento(s) ${state.folder?'nesta pasta':'no projeto'}</span><div class="chips">${state.folder&&!disabled?'<button data-act="edit-folder">Renomear / mover</button><button data-act="folder">+ Subpasta</button>':''}</div></div>
    <div class="panel table-wrap"><table><thead><tr><th>Documento</th><th>Revisão</th><th>Situação</th><th></th></tr></thead><tbody>${rows.map(d=>`<tr><td><div class="file-title"><img src="assets/arquivo.svg" alt=""><div><strong>${esc(d.name)}</strong><p class="muted">${esc(folderPath(data,d.folderId).map(n=>n.name).join(' / ')||d.folder||'Sem pasta')} · ${esc(d.format)}</p></div></div></td><td>${esc(d.revision)}</td><td>${tag(d.status)}</td><td><button class="quiet" data-doc="${esc(d.id)}">Detalhes</button></td></tr>`).join('')}</tbody></table>${rows.length?'':'<div class="empty"><strong>Nenhum documento nesta seleção</strong><p>Selecione outra pasta ou adicione um registro de demonstração.</p></div>'}</div></section></div><p class="note">Arquivos ainda não são enviados. Os dados ficam apenas neste navegador.</p>`;
}
export function folderForm(data,state,id) {
  const f=data.folders.find(f=>f.id===id), excluded=id?descendants(data,id):new Set(), parent=f?f.parent:state.folder;
  return `<form class="form-grid" data-form="folder" ${id?`data-id="${esc(id)}"`:''}><label>Nome da pasta<input name="name" required maxlength="80" value="${esc(f?.name||'')}"></label><label>Pasta superior<select name="parent"><option value="">Raiz do projeto</option>${data.folders.filter(n=>n.project===state.project&&!excluded.has(n.id)).map(n=>`<option value="${esc(n.id)}" ${n.id===parent?'selected':''}>${esc(folderPath(data,n.id).map(p=>p.name).join(' / '))}</option>`).join('')}</select></label><p class="muted">Renomear ou mover preserva os documentos e as subpastas vinculadas.</p>${actions}</form>`;
}
export function documentForm(data,state) {
  return `<form class="form-grid" data-form="document"><label>Título<input name="name" required maxlength="150"></label><p class="muted">Projeto: ${esc(data.projects.find(p=>p.id===state.project)?.name)}</p><label>Pasta<select name="folderId" required><option value="">Selecione uma pasta</option>${data.folders.filter(f=>f.project===state.project).map(f=>`<option value="${esc(f.id)}" ${f.id===state.folder?'selected':''}>${esc(folderPath(data,f.id).map(n=>n.name).join(' / '))}</option>`).join('')}</select></label><p class="muted">Será criado um registro simulado. Nenhum arquivo será enviado.</p>${actions}</form>`;
}

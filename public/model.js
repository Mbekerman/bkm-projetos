export const PROJECT_STATUSES = ['Em desenvolvimento', 'Em análise', 'Suspenso', 'Concluído'];
export class ValidationError extends Error {
  constructor(message, field) { super(message); this.field = field; }
}
const clean = value => String(value ?? '').trim();
const equal = (a, b) => clean(a).normalize('NFKC').toLocaleLowerCase('pt-BR') === clean(b).normalize('NFKC').toLocaleLowerCase('pt-BR');
function required(value, field, label, limit) {
  const result = clean(value);
  if (!result) throw new ValidationError(`${label} é obrigatório.`, field);
  if (result.length > limit) throw new ValidationError(`${label} deve ter até ${limit} caracteres.`, field);
  return result;
}
export function seed() {
  return migrate({ projects: [
    { id: 'p1', name: 'Residencial Horizonte', city: 'São Paulo · SP', status: 'Em desenvolvimento' },
    { id: 'p2', name: 'Residencial Jardim', city: 'São José dos Campos · SP', status: 'Em análise' },
    { id: 'p3', name: 'Residencial Alameda', city: 'São Paulo · SP', status: 'Concluído' }
  ], documents: [
    { id: 'd1', project: 'p1', name: 'Planta do pavimento térreo', folder: 'Arquitetura', revision: 'R02', format: 'PDF', status: 'Em análise' },
    { id: 'd2', project: 'p1', name: 'Planta de formas', folder: 'Estrutura', revision: 'R01', format: 'DWG', status: 'Aprovado' },
    { id: 'd3', project: 'p2', name: 'Estudo de implantação', folder: 'Arquitetura', revision: 'R00', format: 'PDF', status: 'Em análise' }
  ], tasks: [
    { id: 't1', title: 'Conferir acessibilidade do térreo', project: 'p1', status: 'A fazer', owner: 'Equipe de Arquitetura', comments: [] },
    { id: 't2', title: 'Compatibilizar estrutura e instalações', project: 'p1', status: 'Em andamento', owner: 'Equipe de Engenharia', comments: [] },
    { id: 't3', title: 'Validar estudo de implantação', project: 'p2', status: 'A fazer', owner: 'Equipe de Projetos', comments: [] },
    { id: 't4', title: 'Organizar disciplinas', project: 'p3', status: 'Concluída', owner: 'Equipe de Engenharia', comments: [] }
  ] });
}
export function migrate(input) {
  if (!input || !['projects', 'documents', 'tasks'].every(k => Array.isArray(input[k]))) throw new Error('Formato de dados inválido.');
  if (input.schemaVersion > 2) throw new Error('Estes dados exigem uma versão mais recente do aplicativo.');
  const data = structuredClone(input);
  data.folders ??= [];
  if (!Array.isArray(data.folders)) throw new Error('Formato de pastas inválido.');
  data.projects.forEach((p, i) => {
    p.code ??= `BKM-${String(i + 1).padStart(3, '0')}`;
    p.description ??= ''; p.owner ??= 'Equipe de Projetos';
    p.startDate ??= ''; p.endDate ??= ''; p.archived ??= false;
  });
  if (data.schemaVersion !== 2) {
    data.projects.forEach(p => {
      const labels = new Set(['Arquitetura', 'Estrutura', 'Instalações', ...data.documents.filter(d => d.project === p.id).map(d => d.folder).filter(Boolean)]);
      [...labels].forEach((name, index) => {
        if (!data.folders.some(f => f.project === p.id && f.parent === null && f.name === name)) data.folders.push({ id: `legacy-${p.id}-${index}`, project: p.id, parent: null, name });
      });
    });
    data.documents.forEach(d => { d.folderId ??= data.folders.find(f => f.project === d.project && f.name === d.folder)?.id ?? null; });
  }
  data.schemaVersion = 2;
  return data;
}
export function projectById(data, id) {
  const p = data.projects.find(p => p.id === id);
  if (!p) throw new ValidationError('Projeto não encontrado.', 'project');
  return p;
}
export function writableProject(data, id) {
  const p = projectById(data, id);
  if (p.archived) throw new ValidationError('Restaure o projeto antes de alterá-lo.', 'project');
  return p;
}
export function saveProject(data, values, id) {
  const existing = id ? writableProject(data, id) : null;
  const code = required(values.code, 'code', 'Código', 30);
  if (data.projects.some(p => p.id !== id && equal(p.code, code))) throw new ValidationError('Já existe um projeto com este código, inclusive entre os arquivados.', 'code');
  const fields = {
    code, name: required(values.name, 'name', 'Nome', 100), city: required(values.city, 'city', 'Município', 80),
    owner: required(values.owner, 'owner', 'Responsável', 80), description: clean(values.description),
    status: values.status, startDate: clean(values.startDate), endDate: clean(values.endDate)
  };
  if (!PROJECT_STATUSES.includes(fields.status)) throw new ValidationError('Selecione uma situação válida.', 'status');
  if (fields.description.length > 2000) throw new ValidationError('Use até 2.000 caracteres.', 'description');
  for (const key of ['startDate', 'endDate']) {
    if (fields[key] && (!/^\d{4}-\d{2}-\d{2}$/.test(fields[key]) || !Number.isFinite(Date.parse(fields[key])) || new Date(fields[key]).toISOString().slice(0, 10) !== fields[key])) throw new ValidationError('Informe uma data válida.', key);
  }
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) throw new ValidationError('A conclusão deve ser igual ou posterior ao início.', 'endDate');
  if (existing) Object.assign(existing, fields);
  else data.projects.push({ id: values.id, ...fields, archived: false });
  return existing?.id ?? values.id;
}
export function archiveProject(data, id, archived) { projectById(data, id).archived = archived; }
function folderFields(data, project, name, parent, id) {
  writableProject(data, project);
  name = required(name, 'name', 'Nome da pasta', 80);
  if (parent !== null && !data.folders.some(f => f.id === parent && f.project === project)) throw new ValidationError('Pasta de destino inválida.', 'parent');
  const visited = new Set();
  let cursor = parent;
  while (cursor !== null) {
    if (cursor === id || visited.has(cursor)) throw new ValidationError('Uma pasta não pode ficar dentro de si ou de uma descendente.', 'parent');
    visited.add(cursor); cursor = data.folders.find(f => f.id === cursor)?.parent ?? null;
  }
  if (data.folders.some(f => f.id !== id && f.project === project && f.parent === parent && equal(f.name, name))) throw new ValidationError('Já existe uma pasta com este nome neste nível.', 'name');
  return { name, parent };
}
export function saveFolder(data, values, id) {
  const existing = id ? data.folders.find(f => f.id === id) : null;
  if (id && !existing) throw new ValidationError('Pasta não encontrada.', 'name');
  const project = existing?.project ?? values.project;
  const fields = folderFields(data, project, values.name, values.parent || null, id);
  if (existing) Object.assign(existing, fields);
  else data.folders.push({ id: values.id, project, ...fields });
}
export function folderPath(data, id) {
  const path = [], visited = new Set();
  while (id && !visited.has(id)) { visited.add(id); const f = data.folders.find(f => f.id === id); if (!f) break; path.unshift(f); id = f.parent; }
  return path;
}
export function descendants(data, id) {
  const found = new Set([id]); let changed = true;
  while (changed) { changed = false; data.folders.forEach(f => { if (found.has(f.parent) && !found.has(f.id)) { found.add(f.id); changed = true; } }); }
  return found;
}

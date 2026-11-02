import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed, migrate, saveProject, archiveProject, saveFolder, folderPath } from '../public/model.js';
import { createRepository, DATA_KEY } from '../public/repository.js';
const project = { id:'new',code:'TEST-1',name:'Projeto de teste',city:'São Paulo',owner:'Equipe',status:'Em desenvolvimento',startDate:'2026-11-01',endDate:'2026-11-30' };
test('migra dados legados, mantém IDs e associa documento à pasta; migração é idempotente', () => {
 const legacy={projects:[{id:'p',name:'Legado'}],tasks:[],documents:[{id:'d',project:'p',folder:'Projetos especiais'}]};
 const data=migrate(legacy);assert.equal(data.documents[0].id,'d');
 assert.equal(data.folders.find(f=>f.id===data.documents[0].folderId).name,'Projetos especiais');
 assert.deepEqual(migrate(data),data);assert.equal(legacy.schemaVersion,undefined);
});
test('código único inclui arquivados, valida datas e edição preserva vínculos', () => {
 const data=seed();saveProject(data,project);archiveProject(data,'new',true);
 assert.throws(()=>saveProject(data,{...project,id:'other',code:' test-1 '}),/código/);
 archiveProject(data,'new',false);
 assert.throws(()=>saveProject(data,{...project,endDate:'2026-10-30'},'new'),/conclusão/);
 assert.throws(()=>saveProject(data,{...project,endDate:'2026-02-30'},'new'),/data válida/);
 const docs=structuredClone(data.documents);saveProject(data,{...project,name:'Atualizado'},'new');
 assert.equal(data.projects.find(p=>p.id==='new').name,'Atualizado');assert.deepEqual(data.documents,docs);
});
test('pastas permitem mesmo nome em outro nível, impedem duplicata, ciclos e destino de outro projeto', () => {
 const data=seed();saveFolder(data,{id:'a',project:'p1',name:'Executivo',parent:null});
 saveFolder(data,{id:'b',project:'p1',name:'Executivo',parent:'a'});
 assert.throws(()=>saveFolder(data,{id:'c',project:'p1',name:' executivo ',parent:null}),/Já existe/);
 assert.throws(()=>saveFolder(data,{name:'Executivo',parent:'b'},'a'),/descendente/);
 assert.throws(()=>saveFolder(data,{name:'Executivo',parent:'legacy-p2-0'},'a'),/destino inválida/);
 saveFolder(data,{name:'Detalhamento',parent:null},'a');
 assert.deepEqual(folderPath(data,'b').map(f=>f.name),['Detalhamento','Executivo']);
});
test('renomear/mover mantém associação de documentos e arquivar não remove registros', () => {
 const data=seed(), doc=data.documents[0], original=doc.folderId, count=data.documents.length;
 saveFolder(data,{id:'a',project:'p1',name:'Fase 1',parent:null});
 saveFolder(data,{name:'Arquitetura executiva',parent:'a'},original);
 assert.equal(doc.folderId,original);assert.deepEqual(folderPath(data,doc.folderId).map(f=>f.name),['Fase 1','Arquitetura executiva']);
 archiveProject(data,'p1',true);assert.equal(data.documents.length,count);
 assert.throws(()=>saveFolder(data,{id:'blocked',project:'p1',name:'Bloqueada',parent:null}),/Restaure/);
 archiveProject(data,'p1',false);assert.equal(data.documents[0].folderId,original);
});
test('falha de armazenamento não altera estado; leitura inválida não sobrescreve dados', () => {
 let writes=0;const storage={getItem:()=>null,setItem(){writes++;throw Error('QuotaExceeded')}};
 const repo=createRepository(storage),before=repo.data;
 assert.throws(()=>repo.update(d=>saveProject(d,project)),/Nenhuma alteração/);assert.deepEqual(repo.data,before);
 const bad=createRepository({getItem:()=>'{bad',setItem(){writes++}});
 assert.ok(bad.warning);const previous=writes;assert.throws(()=>bad.update(d=>saveProject(d,project)),/recuperado/);assert.equal(writes,previous);
});
test('gravação bem-sucedida persiste alterações para uma nova sessão', () => {
 const values=new Map();const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const repo=createRepository(storage);repo.update(d=>saveProject(d,project));
 assert.equal(createRepository(storage).data.projects.find(p=>p.id==='new').code,'TEST-1');
 assert.equal(JSON.parse(values.get(DATA_KEY)).schemaVersion,2);
});

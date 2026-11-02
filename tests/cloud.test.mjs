import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFile,createCloudStore,MAX_FILE_BYTES} from '../public/cloud-store.js';
const pdf=()=>new File(['%PDF-1.7\nTeste'], 'teste.pdf',{type:'application/pdf'});
function fixture({exists=false,infoError,uploadError,updateError}={}){
 const calls=[];const file=pdf();
 const client={storage:{from(bucket){return {
  info:async path=>{calls.push('info');return infoError?{error:infoError}:exists?{data:{size:file.size,contentType:'application/pdf'},error:null}:{error:{statusCode:'404',message:'Object not found'}}},
  upload:async(path,body,opts)=>{calls.push('upload');assert.equal(opts.upsert,false);return {data:{path},error:uploadError||null}},
  download:async()=>({data:file,error:null})
 }}},from(table){return {update(values){calls.push('confirm');assert.deepEqual(values,{upload_state:'ready'});return {eq(){return this},select(){return this},single:async()=>({data:{upload_state:'ready'},error:updateError||null})}}}}};
 return {store:createCloudStore(client),calls,file,revision:{id:'r1',object_path:'project/revision/original.pdf',original_filename:file.name,file_size:file.size,mime_type:'application/pdf',upload_state:'pending'}};
}
test('valida assinatura, extensão, arquivo vazio e limite de tamanho',async()=>{
 assert.equal(await validateFile(pdf()),'application/pdf');
 await assert.rejects(()=>validateFile(new File(['não é pdf'],'teste.pdf',{type:'application/pdf'})),/válido/);
 await assert.rejects(()=>validateFile(new File([],'vazio.pdf')),/vazio/);
 await assert.rejects(()=>validateFile({size:MAX_FILE_BYTES+1}),/20 MiB/);
 await assert.rejects(()=>validateFile(new File(['%PDF-1.7'],'teste.dwg')),/IFC e DWG/);
});
test('confirma revisão somente depois do upload concluído',async()=>{
 const f=fixture();await f.store.transferUpload(f.revision,f.file);assert.deepEqual(f.calls,['info','upload','confirm']);
});
test('falha de upload preserva revisão pendente sem confirmar',async()=>{
 const f=fixture({uploadError:{message:'Rede indisponível'}});await assert.rejects(()=>f.store.transferUpload(f.revision,f.file),/Rede/);assert.deepEqual(f.calls,['info','upload']);
});
test('retoma resposta perdida sem sobrescrever objeto já recebido',async()=>{
 const f=fixture({exists:true});await f.store.transferUpload(f.revision,f.file);assert.deepEqual(f.calls,['info','confirm']);
});
test('erro de autorização na consulta não inicia upload',async()=>{
 const f=fixture({infoError:{statusCode:'403',message:'Forbidden'}});await assert.rejects(()=>f.store.transferUpload(f.revision,f.file),/verificar/);assert.deepEqual(f.calls,['info']);
});
test('arquivo de retomada diferente não faz chamadas de rede',async()=>{
 const f=fixture();await assert.rejects(()=>f.store.transferUpload(f.revision,new File(['%PDF-1.7\nTeste'],'outro.pdf')),/mesmo nome/);assert.deepEqual(f.calls,[]);
});
test('download pendente é impedido; versão pronta valida o tamanho',async()=>{
 const f=fixture();await assert.rejects(()=>f.store.download(f.revision),/não foi concluído/);
 assert.equal((await f.store.download({...f.revision,upload_state:'ready'})).size,f.file.size);
 await assert.rejects(()=>f.store.download({...f.revision,upload_state:'ready',file_size:10000}),/tamanho/);
});

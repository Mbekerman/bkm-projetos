export const BUCKET = 'bkm-documents';
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export function checked(result) {
  if (result.error) {
    const code = result.error.code;
    const message = code === '23505' ? 'Este código ou nome já está em uso. Confira também os registros existentes.' :
      code === '42501' ? 'Sua conta não tem permissão para esta operação, ou o projeto está arquivado.' :
      result.error.message || 'Não foi possível concluir a operação.';
    throw new Error(message);
  }
  return result.data;
}
export async function validateFile(file) {
  if (!file || !file.size) throw new Error('Selecione um arquivo que não esteja vazio.');
  if (file.size > MAX_FILE_BYTES) throw new Error('O limite inicial é de 20 MiB por arquivo.');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const ext = file.name.split('.').at(-1).toLowerCase();
  const pdf = [37,80,68,70,45].every((v,i) => bytes[i] === v);
  const png = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (ext === 'pdf' && pdf) return 'application/pdf';
  if (ext === 'png' && png) return 'image/png';
  if (['jpg','jpeg'].includes(ext) && jpg) return 'image/jpeg';
  throw new Error('Envie um PDF, PNG ou JPEG válido. IFC e DWG ainda não são aceitos nesta entrega.');
}
export function createCloudStore(client) {
  const rows = async query => checked(await query) || [];
  return {
    async projects() { return rows(client.from('projects').select('*').order('created_at', {ascending:false})); },
    async notifications(projectId=null,unread=true,before=null){return checked(await client.rpc('list_notifications',{p_project_id:projectId,p_unread:unread,p_before:before}));},
    async markNotification(id,read=true){return checked(await client.rpc('mark_notification',{p_notification_id:id,p_read:read}));},
    async markNotificationsRead(through,projectId=null){return checked(await client.rpc('mark_notifications_read',{p_through:through,p_project_id:projectId}));},
    async overview(projectId){return checked(await client.rpc('project_overview',{p_project_id:projectId}));},
    async activity(projectId,kind='all',before=null){return checked(await client.rpc('project_activity',{p_project_id:projectId,p_kind:kind,p_before:before,p_limit:25}));},
    async task(projectId,id){return checked(await client.from('project_tasks').select('*').eq('project_id',projectId).eq('id',id).maybeSingle());},
    async members() { return rows(client.from('project_members').select('project_id,user_id,role')); },
    async projectData(projectId) {
      const [folders,documents,revisions,reviews,tasks,people,invites] = await Promise.all([
        rows(client.from('folders').select('*').eq('project_id', projectId).order('name')),
        rows(client.from('documents').select('*').eq('project_id', projectId).order('title')),
        rows(client.from('document_revisions').select('*').eq('project_id', projectId).order('created_at',{ascending:false})),
        rows(client.from('revision_reviews').select('*').eq('project_id', projectId).order('created_at',{ascending:false})),
        rows(client.from('project_tasks').select('*').eq('project_id',projectId).order('created_at',{ascending:false})),
        rows(client.rpc('project_people',{p_project_id:projectId})),
        rows(client.from('project_access_invites').select('*').eq('project_id',projectId).order('created_at',{ascending:false}))
      ]);
      return {folders,documents,revisions,reviews,tasks,people,invites};
    },
    async saveProject(values,id) {
      if (id) return checked(await client.from('projects').update(values).eq('id',id).select().single());
      return checked(await client.from('projects').insert(values).select().single());
    },
    async saveFolder(values,id) {
      if (id) return checked(await client.from('folders').update(values).eq('id',id).select().single());
      return checked(await client.from('folders').insert(values).select().single());
    },
    async reserveUpload({projectId,folderId,documentId,code,title,revisionCode,file}) {
      const mime = await validateFile(file);
      let doc;
      if (!documentId) {
        // Reuse an existing document left by an interrupted first emission only after
        // verifying its identity/context. Never send demonstration records here.
        const existing = checked(await client.from('documents').select('*').eq('project_id',projectId).eq('code',code.trim()).maybeSingle());
        if (existing) {
          if (existing.folder_id !== folderId || existing.title !== title.trim()) throw new Error('O código pertence a outro documento. Use Nova revisão no documento existente.');
          const prior = await rows(client.from('document_revisions').select('id').eq('document_id',existing.id));
          if (prior.length) throw new Error('Este documento já existe. Abra-o para enviar uma nova revisão ou retomar o envio pendente.');
          doc=existing;
        } else doc=checked(await client.from('documents').insert({project_id:projectId,folder_id:folderId,code:code.trim(),title:title.trim()}).select().single());
        documentId=doc.id;
      }
      const id=crypto.randomUUID(), suffix=mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg';
      return checked(await client.from('document_revisions').insert({id,project_id:projectId,document_id:documentId,revision_code:revisionCode.trim(),object_path:`${projectId}/${id}/original.${suffix}`,original_filename:file.name,mime_type:mime,file_size:file.size}).select().single());
    },
    async transferUpload(revision,file) {
      const mime=await validateFile(file);
      if(file.size!==Number(revision.file_size)||mime!==revision.mime_type||file.name!==revision.original_filename) throw new Error('Para retomar, selecione o mesmo nome, tamanho e tipo de arquivo da reserva.');
      // An object may already exist after a lost upload response. In that case verify
      // its size/type before confirming; never overwrite an existing revision.
      const existing=await client.storage.from(BUCKET).info(revision.object_path);
      if(!existing.error) {
        const size=existing.data?.size??existing.data?.metadata?.size;
        const type=existing.data?.contentType??existing.data?.mimetype??existing.data?.metadata?.mimetype;
        if(Number(size)!==Number(revision.file_size)||type!==mime) throw new Error('O arquivo armazenado diverge da reserva. O envio precisa ser revisado.');
      } else {
        const status=Number(existing.error.statusCode??existing.error.status);
        if(![400,404].includes(status) && !/not found|does not exist/i.test(existing.error.message||'')) throw new Error('Não foi possível verificar o armazenamento. Tente novamente; a revisão foi preservada.');
        checked(await client.storage.from(BUCKET).upload(revision.object_path,file,{contentType:mime,upsert:false,cacheControl:'0'}));
      }
      return checked(await client.from('document_revisions').update({upload_state:'ready'}).eq('id',revision.id).eq('upload_state','pending').select().single());
    },
    async acceptAccess(){return checked(await client.rpc('accept_project_access'));},
    async addAccess(projectId,email,role){return checked(await client.rpc('add_project_access',{p_project_id:projectId,p_email:email,p_role:role}));},
    async changeAccess(projectId,id,kind,role){return checked(await client.rpc(kind==='member'?'change_project_member':'change_project_invite',kind==='member'?{p_project_id:projectId,p_user_id:id,p_role:role}:{p_invite_id:id,p_role:role}));},
    async revokeAccess(projectId,id,kind){return checked(await client.rpc(kind==='member'?'revoke_project_member':'revoke_project_invite',kind==='member'?{p_project_id:projectId,p_user_id:id}:{p_invite_id:id}));},
    async saveTask(values,id){return checked(await (id?client.from('project_tasks').update(values).eq('id',id):client.from('project_tasks').insert(values)).select().single());},
    async taskComments(taskId){return rows(client.from('task_comments').select('*').eq('task_id',taskId).order('created_at'));},
    async addTaskComment(values){return checked(await client.from('task_comments').insert(values).select().single());},
    async requestReview(revisionId,message) {return checked(await client.rpc('request_revision_review',{p_revision_id:revisionId,p_message:message}));},
    async decideReview(reviewId,outcome,message) {return checked(await client.rpc('decide_revision_review',{p_review_id:reviewId,p_outcome:outcome,p_message:message}));},
    async annotations(revisionId) {return rows(client.from('document_annotations').select('*').eq('revision_id',revisionId).is('deleted_at',null).order('created_at'));},
    async createAnnotation(values) {return checked(await client.from('document_annotations').insert(values).select().single());},
    async updateAnnotation(id,values) {return checked(await client.from('document_annotations').update(values).eq('id',id).select().single());},
    async download(revision) {
      if(revision.upload_state!=='ready')throw new Error('O envio desta revisão ainda não foi concluído.');
      const blob=checked(await client.storage.from(BUCKET).download(revision.object_path));
      if(blob.size!==Number(revision.file_size))throw new Error('O tamanho recebido diverge do registro. Não foi possível abrir o arquivo.');
      return blob;
    }
  };
}

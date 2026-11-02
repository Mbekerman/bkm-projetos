-- Confirmação de recebimento sem permitir reescrever revisões.
alter table public.document_revisions add column upload_state text not null default 'pending' check(upload_state in ('pending','ready'));
grant update(upload_state) on public.document_revisions to authenticated;
create policy revisions_confirm_upload on public.document_revisions for update to authenticated
 using(created_by=(select auth.uid()) and upload_state='pending' and bkm_private.can_access_project(project_id,true))
 with check(upload_state='ready' and created_by=(select auth.uid()) and bkm_private.can_access_project(project_id,true) and exists(
  select 1 from storage.objects o where o.bucket_id='bkm-documents' and o.name=object_path
   and (o.metadata->>'size')::bigint=file_size and o.metadata->>'mimetype'=mime_type
 ));
create trigger revisions_confirm_audit after update on public.document_revisions for each row execute function bkm_private.audit_record();
comment on column public.document_revisions.upload_state is 'ready somente após o Storage possuir objeto com caminho, tamanho e MIME esperados. pending permite retomar um upload interrompido.';

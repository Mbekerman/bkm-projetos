-- Integration test: synthetic identities and records are rolled back together.
begin;
select set_config('bkm.test_owner',gen_random_uuid()::text,true);
select set_config('bkm.test_editor',gen_random_uuid()::text,true);
select set_config('bkm.test_reader',gen_random_uuid()::text,true);
select set_config('bkm.test_outsider',gen_random_uuid()::text,true);
select set_config('bkm.test_project',gen_random_uuid()::text,true);
select set_config('bkm.test_folder',gen_random_uuid()::text,true);
insert into auth.users(id) values
 (current_setting('bkm.test_owner')::uuid),(current_setting('bkm.test_editor')::uuid),
 (current_setting('bkm.test_reader')::uuid),(current_setting('bkm.test_outsider')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.test_owner'),true);
insert into public.projects(id,code,name) values(current_setting('bkm.test_project')::uuid,'INTEGRATION-TEST','Projeto temporário');
insert into public.project_members(project_id,user_id,role) values
 (current_setting('bkm.test_project')::uuid,current_setting('bkm.test_editor')::uuid,'editor'),
 (current_setting('bkm.test_project')::uuid,current_setting('bkm.test_reader')::uuid,'reader');
insert into public.folders(id,project_id,name) values(current_setting('bkm.test_folder')::uuid,current_setting('bkm.test_project')::uuid,'Arquitetura');
do $$
declare child uuid=gen_random_uuid(); doc uuid=gen_random_uuid(); rev uuid=gen_random_uuid(); events bigint;
begin
 insert into public.folders(id,project_id,parent_id,name) values(child,current_setting('bkm.test_project')::uuid,current_setting('bkm.test_folder')::uuid,'Executivo');
 begin
  update public.folders set parent_id=child where id=current_setting('bkm.test_folder')::uuid;
  raise exception 'TEST FAILED: cycle accepted';
 exception when raise_exception then
  if sqlerrm like 'TEST FAILED:%' then raise; end if;
  if sqlerrm not like 'Uma pasta não pode%' then raise; end if;
 end;
 begin
  insert into public.folders(project_id,name) values(current_setting('bkm.test_project')::uuid,' arquitetura ');
  raise exception 'TEST FAILED: duplicate accepted';
 exception when unique_violation then null;
 end;
 insert into public.documents(id,project_id,folder_id,code,title) values(doc,current_setting('bkm.test_project')::uuid,current_setting('bkm.test_folder')::uuid,'ARQ-001','Planta temporária');
 insert into public.document_revisions(id,project_id,document_id,revision_code,object_path,original_filename,mime_type,file_size)
 values(rev,current_setting('bkm.test_project')::uuid,doc,'R00',current_setting('bkm.test_project')||'/'||rev::text||'/teste.pdf','teste.pdf','application/pdf',1024);
 begin
  update public.document_revisions set revision_code='R01' where id=rev;
  raise exception 'TEST FAILED: immutable revision updated';
 exception when insufficient_privilege then null;
 end;
 select count(*) into events from public.audit_events where project_id=current_setting('bkm.test_project')::uuid;
 if events<7 then raise exception 'TEST FAILED: audit missing'; end if;
end;
$$;

select set_config('request.jwt.claim.sub',current_setting('bkm.test_outsider'),true);
do $$ begin
 if exists(select 1 from public.projects where id=current_setting('bkm.test_project')::uuid) then raise exception 'TEST FAILED: outsider sees project'; end if;
 if exists(select 1 from public.folders where project_id=current_setting('bkm.test_project')::uuid) then raise exception 'TEST FAILED: outsider sees folders'; end if;
 if exists(select 1 from public.document_revisions where project_id=current_setting('bkm.test_project')::uuid) then raise exception 'TEST FAILED: outsider sees revisions'; end if;
 if exists(select 1 from public.audit_events where project_id=current_setting('bkm.test_project')::uuid) then raise exception 'TEST FAILED: outsider sees audit'; end if;
 begin
  insert into public.folders(project_id,name) values(current_setting('bkm.test_project')::uuid,'Forbidden');
  raise exception 'TEST FAILED: outsider writes folder';
 exception when insufficient_privilege then null;
 end;
end; $$;

select set_config('request.jwt.claim.sub',current_setting('bkm.test_reader'),true);
do $$ declare changed bigint; begin
 if not exists(select 1 from public.projects where id=current_setting('bkm.test_project')::uuid) then raise exception 'TEST FAILED: reader cannot read'; end if;
 update public.folders set name='Forbidden' where id=current_setting('bkm.test_folder')::uuid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'TEST FAILED: reader edits folder'; end if;
 begin
  insert into public.project_members(project_id,user_id,role) values(current_setting('bkm.test_project')::uuid,current_setting('bkm.test_outsider')::uuid,'editor');
  raise exception 'TEST FAILED: reader grants membership';
 exception when insufficient_privilege then null;
 end;
end; $$;

select set_config('request.jwt.claim.sub',current_setting('bkm.test_editor'),true);
insert into public.folders(project_id,name) values(current_setting('bkm.test_project')::uuid,'Estrutura');
do $$ declare changed bigint; begin
 update public.projects set code='Forbidden' where id=current_setting('bkm.test_project')::uuid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'TEST FAILED: editor changes project metadata'; end if;
end; $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.test_owner'),true);
update public.projects set archived=true where id=current_setting('bkm.test_project')::uuid;
select set_config('request.jwt.claim.sub',current_setting('bkm.test_editor'),true);
do $$ begin
 begin
  insert into public.folders(project_id,name) values(current_setting('bkm.test_project')::uuid,'Forbidden archived');
  raise exception 'TEST FAILED: archived project accepts folder';
 exception when insufficient_privilege then null;
 end;
end; $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.projects','SELECT') then raise exception 'TEST FAILED: anonymous grant'; end if;
 if not exists(select 1 from storage.buckets where id='bkm-documents' and public=false and file_size_limit=20971520) then raise exception 'TEST FAILED: storage configuration'; end if;
end; $$;
select 'PASS: owner/editor/reader/outsider, archive, revisions, folders and audit' as verification;
rollback;

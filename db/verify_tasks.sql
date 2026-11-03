begin;
select set_config('bkm.ann_owner',gen_random_uuid()::text,true),set_config('bkm.ann_editor',gen_random_uuid()::text,true),set_config('bkm.ann_reader',gen_random_uuid()::text,true),set_config('bkm.ann_outsider',gen_random_uuid()::text,true),set_config('bkm.ann_project',gen_random_uuid()::text,true),set_config('bkm.ann_note','',true);
insert into auth.users(id) values(current_setting('bkm.ann_owner')::uuid),(current_setting('bkm.ann_editor')::uuid),(current_setting('bkm.ann_reader')::uuid),(current_setting('bkm.ann_outsider')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.ann_owner'),true);
insert into public.projects(id,code,name) values(current_setting('bkm.ann_project')::uuid,'ANNOTATIONS-TEST','Temporário');
insert into public.project_members(project_id,user_id,role) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_editor')::uuid,'editor'),(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_reader')::uuid,'reader');
reset role;
do $$ declare f uuid=gen_random_uuid();d uuid=gen_random_uuid();r uuid=gen_random_uuid();pending uuid=gen_random_uuid();img uuid=gen_random_uuid();begin
 insert into public.folders(id,project_id,name) values(f,current_setting('bkm.ann_project')::uuid,'Teste');
 insert into public.documents(id,project_id,folder_id,code,title,created_by) values(d,current_setting('bkm.ann_project')::uuid,f,'TEST','Teste',current_setting('bkm.ann_owner')::uuid);
 insert into public.document_revisions(id,project_id,document_id,revision_code,object_path,original_filename,mime_type,file_size,created_by,upload_state) values
 (r,current_setting('bkm.ann_project')::uuid,d,'R00',current_setting('bkm.ann_project')||'/'||r||'/original.pdf','original.pdf','application/pdf',1024,current_setting('bkm.ann_owner')::uuid,'ready'),
 (pending,current_setting('bkm.ann_project')::uuid,d,'R01',current_setting('bkm.ann_project')||'/'||pending||'/original.pdf','original.pdf','application/pdf',1024,current_setting('bkm.ann_owner')::uuid,'pending'),
 (img,current_setting('bkm.ann_project')::uuid,d,'IMG',current_setting('bkm.ann_project')||'/'||img||'/original.png','original.png','image/png',1024,current_setting('bkm.ann_owner')::uuid,'ready');
 perform set_config('bkm.ann_revision',r::text,true);perform set_config('bkm.ann_pending',pending::text,true);perform set_config('bkm.ann_image',img::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.ann_editor'),true);
do $$ declare n uuid; r uuid;begin
 insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,.25,.75,'Rever cota') returning id into n;
 perform set_config('bkm.ann_note',n::text,true);
 update public.document_annotations set status='resolved' where id=n returning id into r;
 if r is null then raise exception 'Resolve returning failed';end if;
 update public.document_annotations set status='open' where id=n;
 begin update public.document_annotations set body='alterado' where id=n;raise exception 'Immutable content changed';exception when insufficient_privilege then null;end;
 begin update public.document_annotations set created_by=current_setting('bkm.ann_owner')::uuid where id=n;raise exception 'Author spoof accepted';exception when insufficient_privilege then null;end;
 begin insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_pending')::uuid,1,0,0,'pending');raise exception 'Pending annotation accepted';exception when insufficient_privilege then null;end;
 begin insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_image')::uuid,2,0,0,'wrong page');raise exception 'Image page 2 accepted';exception when insufficient_privilege then null;end;
 begin insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,1.1,0,'out of bounds');raise exception 'Invalid coordinates accepted';exception when check_violation then null;end;
end $$;
do $$ declare t uuid;d uuid;n bigint;old_completed timestamptz;begin
 select document_id into d from public.document_revisions where id=current_setting('bkm.ann_revision')::uuid;
 insert into public.project_tasks(project_id,title,assignee_id,document_id,revision_id,annotation_id,due_date)
 values(current_setting('bkm.ann_project')::uuid,'Conferir cota',current_setting('bkm.ann_editor')::uuid,d,current_setting('bkm.ann_revision')::uuid,current_setting('bkm.ann_note')::uuid,'2026-11-01') returning id,task_number into t,n;
 perform set_config('bkm.task_id',t::text,true);if n is null then raise exception 'Task number missing';end if;
 update public.project_tasks set stage='done' where id=t;
 if not exists(select 1 from public.project_tasks where id=t and completed_at is not null and completed_by=auth.uid()) then raise exception 'Completion not stamped';end if;
 select completed_at into old_completed from public.project_tasks where id=t;update public.project_tasks set title='Conferir cota revisada' where id=t;
 if (select completed_at from public.project_tasks where id=t) is distinct from old_completed then raise exception 'Completion changed on edit';end if;
 update public.project_tasks set stage='doing' where id=t;
 if exists(select 1 from public.project_tasks where id=t and completed_at is not null) then raise exception 'Reopen retained completion';end if;
 begin update public.project_tasks set stage='paused' where id=t;raise exception 'Pause without reason';exception when check_violation then null;end;
 update public.project_tasks set stage='paused',pause_reason='Aguardando definição' where id=t;
 update public.project_tasks set stage='todo' where id=t;
 if (select pause_reason from public.project_tasks where id=t)<>'' then raise exception 'Pause reason not cleared';end if;
 begin update public.project_tasks set created_by=current_setting('bkm.ann_owner')::uuid where id=t;raise exception 'Author spoof';exception when insufficient_privilege then null;end;
 begin update public.project_tasks set assignee_id=current_setting('bkm.ann_reader')::uuid where id=t;raise exception 'Reader assigned';exception when check_violation then null;end;
 begin update public.project_tasks set assignee_id=current_setting('bkm.ann_outsider')::uuid where id=t;raise exception 'Outsider assigned';exception when check_violation then null;end;
 begin update public.project_tasks set revision_id=current_setting('bkm.ann_pending')::uuid,annotation_id=null where id=t;raise exception 'Pending revision linked';exception when check_violation then null;end;
 begin update public.project_tasks set start_date='2026-11-02',due_date='2026-11-01' where id=t;raise exception 'Invalid dates accepted';exception when check_violation then null;end;
 begin update public.project_tasks set document_id=gen_random_uuid() where id=t;raise exception 'Forged source accepted';exception when foreign_key_violation then null;end;
 insert into public.task_comments(project_id,task_id,body) values(current_setting('bkm.ann_project')::uuid,t,'Comentário de teste');
 begin update public.task_comments set body='alterado' where task_id=t;raise exception 'Comment overwritten';exception when insufficient_privilege then null;end;
 update public.project_tasks set archived=true where id=t;
 begin update public.project_tasks set stage='doing' where id=t;raise exception 'Archived task changed';exception when check_violation then null;end;
 begin insert into public.task_comments(project_id,task_id,body) values(current_setting('bkm.ann_project')::uuid,t,'Arquivada');raise exception 'Archived task comment accepted';exception when insufficient_privilege then null;end;
 update public.project_tasks set archived=false where id=t;
 if (select count(*) from public.project_people(current_setting('bkm.ann_project')::uuid))<>3 then raise exception 'Project people incorrect';end if;
 if not exists(select 1 from public.audit_events where entity_type='project_tasks' and entity_id=t::text and action='UPDATE') then raise exception 'Task audit missing';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ann_reader'),true);
do $$ begin
 if not exists(select 1 from public.project_tasks where id=current_setting('bkm.task_id')::uuid) then raise exception 'Reader cannot see task';end if;
 update public.project_tasks set title='Leitor' where id=current_setting('bkm.task_id')::uuid;if found then raise exception 'Reader changed task';end if;
 begin insert into public.task_comments(project_id,task_id,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.task_id')::uuid,'Leitor');raise exception 'Reader commented';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ann_outsider'),true);
do $$ begin
 if exists(select 1 from public.project_tasks where id=current_setting('bkm.task_id')::uuid) then raise exception 'Outsider sees task';end if;
 if exists(select 1 from public.task_comments where task_id=current_setting('bkm.task_id')::uuid) then raise exception 'Outsider sees comments';end if;
 begin perform * from public.project_people(current_setting('bkm.ann_project')::uuid);raise exception 'Outsider sees directory';exception when insufficient_privilege then null;end;
 begin insert into public.project_tasks(project_id,title) values(current_setting('bkm.ann_project')::uuid,'Externo');raise exception 'Outsider created task';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ann_outsider'),true);
do $$ begin
 if exists(select 1 from public.document_annotations where project_id=current_setting('bkm.ann_project')::uuid) then raise exception 'Outsider sees annotations';end if;
 begin insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,0,0,'outsider');raise exception 'Outsider annotation accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ann_reader'),true);
do $$ begin
 if not exists(select 1 from public.document_annotations where id=current_setting('bkm.ann_note')::uuid) then raise exception 'Reader cannot read';end if;
 update public.document_annotations set status='resolved' where id=current_setting('bkm.ann_note')::uuid;if found then raise exception 'Reader updated';end if;
 begin insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,0,0,'reader');raise exception 'Reader annotation accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ann_owner'),true);
do $$ declare n uuid;begin
 update public.document_annotations set deleted_at=now() where id=current_setting('bkm.ann_note')::uuid returning id into n;
 if n is null then raise exception 'Owner removal failed';end if;
 update public.document_annotations set deleted_at=null where id=n;if found then raise exception 'Removed annotation restored';end if;
 if not exists(select 1 from public.audit_events where entity_id=n::text and entity_type='document_annotations' and action='UPDATE') then raise exception 'Audit missing';end if;
end $$;
update public.projects set archived=true where id=current_setting('bkm.ann_project')::uuid;
do $$ begin
 begin insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,0,0,'archived');raise exception 'Archived annotation accepted';exception when insufficient_privilege then null;end;
end $$;
do $$ begin
 update public.project_tasks set title='Arquivado' where id=current_setting('bkm.task_id')::uuid;if found then raise exception 'Archived project task changed';end if;
end $$;
reset role;
select 'PASS: tasks creation/returning, assignment, source links, completion/reopen, pause, archive, dates, comments, directory and roles' verification;
rollback;

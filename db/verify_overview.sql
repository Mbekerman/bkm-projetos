-- Synthetic identities and records only. Entire test rolls back.
begin;
select set_config('bkm.ov_owner',gen_random_uuid()::text,true),set_config('bkm.ov_reader',gen_random_uuid()::text,true),set_config('bkm.ov_outside',gen_random_uuid()::text,true),set_config('bkm.ov_project',gen_random_uuid()::text,true),set_config('bkm.ov_other',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('bkm.ov_owner')::uuid),(current_setting('bkm.ov_reader')::uuid),(current_setting('bkm.ov_outside')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.ov_owner'),true);
insert into public.projects(id,code,name) values(current_setting('bkm.ov_project')::uuid,'OVERVIEW-TEST','Projeto sintético');
insert into public.project_members(project_id,user_id,role) values(current_setting('bkm.ov_project')::uuid,current_setting('bkm.ov_reader')::uuid,'reader');
insert into public.project_tasks(project_id,title,assignee_id,due_date) values(current_setting('bkm.ov_project')::uuid,'Atrasada',auth.uid(),(now() at time zone 'America/Sao_Paulo')::date-1);
insert into public.project_tasks(project_id,title,due_date) values(current_setting('bkm.ov_project')::uuid,'Hoje',(now() at time zone 'America/Sao_Paulo')::date);
insert into public.project_tasks(project_id,title,stage,pause_reason,assignee_id,due_date) values(current_setting('bkm.ov_project')::uuid,'Pausada','paused','Espera',auth.uid(),(now() at time zone 'America/Sao_Paulo')::date-2);
insert into public.project_tasks(project_id,title,stage,due_date) values(current_setting('bkm.ov_project')::uuid,'Concluída','done',(now() at time zone 'America/Sao_Paulo')::date-2);
insert into public.project_tasks(project_id,title,due_date) values(current_setting('bkm.ov_project')::uuid,'Arquivada',(now() at time zone 'America/Sao_Paulo')::date-2);
update public.project_tasks set archived=true where project_id=current_setting('bkm.ov_project')::uuid and title='Arquivada';
insert into public.project_tasks(project_id,title) select current_setting('bkm.ov_project')::uuid,'Volume '||n from generate_series(1,1005) n;
reset role;
do $$ declare f uuid=gen_random_uuid();d uuid=gen_random_uuid();r uuid=gen_random_uuid();pending uuid=gen_random_uuid();begin
 insert into public.folders(id,project_id,name) values(f,current_setting('bkm.ov_project')::uuid,'Pasta sintética');
 insert into public.documents(id,project_id,folder_id,code,title,created_by) values(d,current_setting('bkm.ov_project')::uuid,f,'TEST','Documento sintético',current_setting('bkm.ov_owner')::uuid);
 insert into public.document_revisions(id,project_id,document_id,revision_code,object_path,original_filename,mime_type,file_size,created_by,upload_state) values
 (r,current_setting('bkm.ov_project')::uuid,d,'R00',current_setting('bkm.ov_project')||'/'||r||'/original.pdf','original.pdf','application/pdf',1024,current_setting('bkm.ov_owner')::uuid,'ready'),
 (pending,current_setting('bkm.ov_project')::uuid,d,'R01',current_setting('bkm.ov_project')||'/'||pending||'/original.pdf','original.pdf','application/pdf',1024,current_setting('bkm.ov_owner')::uuid,'pending');
 perform set_config('bkm.ov_revision',r::text,true);
 insert into public.audit_events(project_id,actor_id,entity_type,entity_id,action,new_values)
 values(current_setting('bkm.ov_project')::uuid,current_setting('bkm.ov_owner')::uuid,'project_access_invites',gen_random_uuid()::text,'INSERT','{"email":"sentinela-ficticia@bkm.com.br","mobile":"999999999","object_path":"sentinela-arquivo","body":"sentinela-comentario","geometry":{"points":[]},"role":"reader"}');
end $$;
set local role authenticated;
insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values
 (current_setting('bkm.ov_project')::uuid,current_setting('bkm.ov_revision')::uuid,1,.1,.1,'Aberta'),
 (current_setting('bkm.ov_project')::uuid,current_setting('bkm.ov_revision')::uuid,1,.2,.2,'Resolvida'),
 (current_setting('bkm.ov_project')::uuid,current_setting('bkm.ov_revision')::uuid,1,.3,.3,'Removida');
update public.document_annotations set status='resolved' where project_id=current_setting('bkm.ov_project')::uuid and body='Resolvida';
update public.document_annotations set deleted_at=now() where project_id=current_setting('bkm.ov_project')::uuid and body='Removida';
select public.request_revision_review(current_setting('bkm.ov_revision')::uuid,'Teste sintético');
select set_config('request.jwt.claim.sub',current_setting('bkm.ov_outside'),true);
insert into public.projects(id,code,name) values(current_setting('bkm.ov_other')::uuid,'OTHER-TEST','Outro projeto sintético');
insert into public.project_tasks(project_id,title) values(current_setting('bkm.ov_other')::uuid,'Invisível no primeiro projeto');
select set_config('request.jwt.claim.sub',current_setting('bkm.ov_owner'),true);
do $$ declare v jsonb;page jsonb;next_page jsonb;n bigint;before_n bigint;begin
 select count(*) into before_n from public.audit_events where project_id=current_setting('bkm.ov_project')::uuid;
 v=public.project_overview(current_setting('bkm.ov_project')::uuid);
 if (v#>>'{counts,active_tasks}')::int<>1008 or (v#>>'{counts,overdue_tasks}')::int<>1 or (v#>>'{counts,paused_tasks}')::int<>1 or (v#>>'{counts,my_tasks}')::int<>2 then raise exception 'Task counts incorrect: %',v->'counts';end if;
 if (v#>>'{counts,documents}')::int<>1 or (v#>>'{counts,ready_revisions}')::int<>1 or (v#>>'{counts,pending_uploads}')::int<>1 or (v#>>'{counts,pending_reviews}')::int<>1 or (v#>>'{counts,open_annotations}')::int<>1 then raise exception 'Document counts incorrect';end if;
 if jsonb_array_length(v->'priority_tasks')<>8 or v#>>'{priority_tasks,0,title}'<>'Atrasada' or jsonb_array_length(v->'my_tasks')<>2 then raise exception 'Queues incorrect';end if;
 if v->>'today'<>((now() at time zone 'America/Sao_Paulo')::date)::text then raise exception 'Wrong timezone';end if;
 page=public.project_activity(current_setting('bkm.ov_project')::uuid,'all',null,2);
 if jsonb_array_length(page->'events')<>2 or not (page->>'has_more')::boolean then raise exception 'Pagination missing';end if;
 next_page=public.project_activity(current_setting('bkm.ov_project')::uuid,'all',(page->>'next_cursor')::bigint,2);
 if (next_page#>>'{events,0,event_id}')::bigint>=(page->>'next_cursor')::bigint then raise exception 'Cursor duplicates';end if;
 page=public.project_activity(current_setting('bkm.ov_project')::uuid,'team',null,50);
 if page::text like '%sentinela%' or page::text like '%999999999%' or page::text like '%geometry%' then raise exception 'Private payload leaked';end if;
 if not exists(select 1 from jsonb_array_elements(page->'events') e where e->>'entity_type'='project_access_invites') then raise exception 'Team filter missing authorization';end if;
 page=public.project_activity(current_setting('bkm.ov_project')::uuid,'project_tasks',null,50);
 if exists(select 1 from jsonb_array_elements(page->'events') e where e->>'entity_type'<>'project_tasks' or jsonb_typeof(e->'event_id')<>'string') then raise exception 'Filter or ID precision incorrect';end if;
 select count(*) into n from public.audit_events where project_id=current_setting('bkm.ov_project')::uuid;
 if n<>before_n then raise exception 'Read queries wrote audit records';end if;
 begin perform public.project_activity(current_setting('bkm.ov_project')::uuid,'bad');raise exception 'Invalid filter accepted';exception when check_violation then null;end;
 begin perform public.project_activity(current_setting('bkm.ov_project')::uuid,'all',null,51);raise exception 'Invalid limit accepted';exception when check_violation then null;end;
 begin perform public.project_activity(current_setting('bkm.ov_project')::uuid,'all',0,25);raise exception 'Invalid cursor accepted';exception when check_violation then null;end;
 begin perform public.project_overview(current_setting('bkm.ov_other')::uuid);raise exception 'Other project exposed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ov_reader'),true);
do $$ declare v jsonb;begin
 v=public.project_overview(current_setting('bkm.ov_project')::uuid);
 if (v#>>'{counts,my_tasks}')::int<>0 or (v#>>'{counts,active_tasks}')::int<>1008 then raise exception 'Reader or personal scope incorrect';end if;
 perform public.project_activity(current_setting('bkm.ov_project')::uuid);
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ov_outside'),true);
do $$ begin
 begin perform public.project_overview(current_setting('bkm.ov_project')::uuid);raise exception 'Outsider sees overview';exception when insufficient_privilege then null;end;
 begin perform public.project_activity(current_setting('bkm.ov_project')::uuid);raise exception 'Outsider sees activity';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.ov_owner'),true);
update public.projects set archived=true where id=current_setting('bkm.ov_project')::uuid;
do $$ begin perform public.project_overview(current_setting('bkm.ov_project')::uuid);perform public.project_activity(current_setting('bkm.ov_project')::uuid);end $$;
delete from public.project_members where project_id=current_setting('bkm.ov_project')::uuid and user_id=current_setting('bkm.ov_reader')::uuid;
select set_config('request.jwt.claim.sub',current_setting('bkm.ov_reader'),true);
do $$ begin
 begin perform public.project_overview(current_setting('bkm.ov_project')::uuid);raise exception 'Revoked member sees overview';exception when insufficient_privilege then null;end;
 begin perform public.project_activity(current_setting('bkm.ov_project')::uuid);raise exception 'Revoked member sees history';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.project_overview(uuid)','execute') or has_function_privilege('anon','public.project_activity(uuid,text,bigint,integer)','execute') then raise exception 'Anonymous execution allowed';end if;
 if exists(select 1 from pg_proc where oid in ('public.project_overview(uuid)'::regprocedure,'public.project_activity(uuid,text,bigint,integer)'::regprocedure) and prosecdef) then raise exception 'Invoker changed';end if;
end $$;
rollback;
select 'Overview and activity checks passed; synthetic records rolled back.' as result;

-- All recipients, messages and records are synthetic and rolled back.
begin;
select set_config('bkm.n_owner',gen_random_uuid()::text,true),set_config('bkm.n_editor',gen_random_uuid()::text,true),set_config('bkm.n_peer',gen_random_uuid()::text,true),set_config('bkm.n_reader',gen_random_uuid()::text,true),set_config('bkm.n_project',gen_random_uuid()::text,true),set_config('bkm.n_other',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('bkm.n_owner')::uuid),(current_setting('bkm.n_editor')::uuid),(current_setting('bkm.n_peer')::uuid),(current_setting('bkm.n_reader')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_owner'),true);
insert into public.projects(id,code,name) values(current_setting('bkm.n_project')::uuid,'NOTIFY-TEST','Projeto temporário de avisos');
insert into public.projects(id,code,name) values(current_setting('bkm.n_other')::uuid,'NOTIFY-OTHER','Segundo projeto temporário');
insert into public.project_members(project_id,user_id,role) values
 (current_setting('bkm.n_project')::uuid,current_setting('bkm.n_editor')::uuid,'editor'),
 (current_setting('bkm.n_project')::uuid,current_setting('bkm.n_peer')::uuid,'editor'),
 (current_setting('bkm.n_project')::uuid,current_setting('bkm.n_reader')::uuid,'reader');
do $$ declare t uuid;begin
 insert into public.project_tasks(project_id,title,assignee_id) values(current_setting('bkm.n_project')::uuid,'Tarefa sintética',current_setting('bkm.n_editor')::uuid) returning id into t;
 perform set_config('bkm.n_task',t::text,true);
 update public.project_tasks set title='Tarefa sintética editada' where id=t;
 insert into public.project_tasks(project_id,title,assignee_id) values(current_setting('bkm.n_project')::uuid,'Minha tarefa',auth.uid());
end $$;
reset role;
do $$ begin
 if (select count(*) from public.project_notifications where project_id=current_setting('bkm.n_project')::uuid)<>1 then raise exception 'Assignment duplicated or self-notification emitted';end if;
 if not exists(select 1 from public.project_notifications where project_id=current_setting('bkm.n_project')::uuid and recipient_id=current_setting('bkm.n_editor')::uuid and kind='task_assigned') then raise exception 'Assignee not notified';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_peer'),true);
insert into public.task_comments(project_id,task_id,body) values(current_setting('bkm.n_project')::uuid,current_setting('bkm.n_task')::uuid,'Comentário sintético confidencial');
reset role;
do $$ begin
 if (select count(*) from public.project_notifications where project_id=current_setting('bkm.n_project')::uuid and kind='task_comment')<>2 then raise exception 'Comment recipients incorrect';end if;
 if exists(select 1 from public.project_notifications where project_id=current_setting('bkm.n_project')::uuid and title like '%confidencial%') then raise exception 'Comment body copied into notification';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_editor'),true);
insert into public.task_comments(project_id,task_id,body) values(current_setting('bkm.n_project')::uuid,current_setting('bkm.n_task')::uuid,'Resposta sintética');
do $$ declare v jsonb;notice_id bigint;begin
 v=public.list_notifications();
 if (v->>'unread_count')::int<>2 or jsonb_array_length(v->'items')<>2 then raise exception 'Private inbox count wrong';end if;
 if exists(select 1 from public.project_notifications where recipient_id<>auth.uid()) then raise exception 'Another recipient visible';end if;
 notice_id=(v#>>'{items,0,id}')::bigint;
 if public.mark_notification(notice_id)<>1 then raise exception 'Own read failed';end if;
 if (public.list_notifications()->>'unread_count')::int<>1 then raise exception 'Read count unchanged';end if;
 perform public.mark_notification(notice_id,false);
 if (public.list_notifications()->>'unread_count')::int<>2 then raise exception 'Unread restoration failed';end if;
 begin update public.project_notifications set title='Forjado' where id=notice_id;raise exception 'Content changed';exception when insufficient_privilege then null;end;
 begin insert into public.project_notifications(project_id,recipient_id,kind,target_id,title) values(current_setting('bkm.n_project')::uuid,auth.uid(),'task_assigned',gen_random_uuid(),'Forjado');raise exception 'Forged notification inserted';exception when insufficient_privilege then null;end;
 begin perform bkm_private.notify_project(current_setting('bkm.n_project')::uuid,array[auth.uid()],'task_assigned',gen_random_uuid(),'Forjado');raise exception 'Internal sender exposed';exception when insufficient_privilege then null;end;
end $$;
-- Real review workflow with synthetic ready revision. No Storage object is sent.
reset role;
do $$ declare f uuid=gen_random_uuid();d uuid=gen_random_uuid();r uuid=gen_random_uuid();begin
 insert into public.folders(id,project_id,name) values(f,current_setting('bkm.n_project')::uuid,'Sintética');
 insert into public.documents(id,project_id,folder_id,code,title,created_by) values(d,current_setting('bkm.n_project')::uuid,f,'NOT-001','Documento sintético',current_setting('bkm.n_owner')::uuid);
 insert into public.document_revisions(id,project_id,document_id,revision_code,object_path,original_filename,mime_type,file_size,created_by,upload_state) values(r,current_setting('bkm.n_project')::uuid,d,'R00',current_setting('bkm.n_project')||'/'||r||'/original.pdf','original.pdf','application/pdf',1024,current_setting('bkm.n_owner')::uuid,'ready');
 perform set_config('bkm.n_revision',r::text,true);
end $$;
set local role authenticated;
do $$ declare review uuid;begin review=public.request_revision_review(current_setting('bkm.n_revision')::uuid,'Solicitação sintética');perform set_config('bkm.n_review',review::text,true);end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_owner'),true);
do $$ begin
 if not exists(select 1 from public.project_notifications where target_id=current_setting('bkm.n_review')::uuid and kind='review_requested') then raise exception 'Owner review notification missing';end if;
 perform public.decide_revision_review(current_setting('bkm.n_review')::uuid,'approved','');
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_editor'),true);
do $$ begin
 if not exists(select 1 from public.project_notifications where target_id=current_setting('bkm.n_review')::uuid and kind='review_decided') then raise exception 'Requester decision notification missing';end if;
end $$;
-- Bulk-read cursor must not include events allocated after the observed cutoff.
reset role;
insert into public.project_notifications(project_id,recipient_id,actor_id,kind,target_id,title)
 select current_setting('bkm.n_project')::uuid,current_setting('bkm.n_editor')::uuid,current_setting('bkm.n_owner')::uuid,'task_assigned',current_setting('bkm.n_task')::uuid,'Aviso sintético '||n from generate_series(1,30)n;
insert into public.project_notifications(project_id,recipient_id,kind,target_id,title) values(current_setting('bkm.n_other')::uuid,current_setting('bkm.n_owner')::uuid,'task_assigned',gen_random_uuid(),'Outro projeto');
set local role authenticated;
do $$ declare page jsonb;page2 jsonb;begin
 page=public.list_notifications();
 if jsonb_array_length(page->'items')<>25 or not (page->>'has_more')::boolean then raise exception 'Pagination missing';end if;
 perform set_config('bkm.n_cutoff',page->>'through_id',true);
 page2=public.list_notifications(null,true,(page->>'next_cursor')::bigint);
 if (page2#>>'{items,0,id}')::bigint >= (page->>'next_cursor')::bigint then raise exception 'Cursor repeated';end if;
 if jsonb_typeof(page#>'{items,0,id}')<>'string' then raise exception 'Unsafe numeric cursor';end if;
end $$;
reset role;
insert into public.project_notifications(project_id,recipient_id,kind,target_id,title) values(current_setting('bkm.n_project')::uuid,current_setting('bkm.n_editor')::uuid,'task_assigned',current_setting('bkm.n_task')::uuid,'Aviso posterior');
set local role authenticated;
do $$ begin
 perform public.mark_notifications_read(current_setting('bkm.n_cutoff')::bigint,current_setting('bkm.n_project')::uuid);
 if (public.list_notifications()->>'unread_count')::int<>1 then raise exception 'Bulk read crossed cutoff';end if;
 begin perform public.list_notifications(current_setting('bkm.n_other')::uuid);raise exception 'Other project exposed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_reader'),true);
do $$ begin
 if (public.list_notifications()->>'unread_count')::int<>0 or exists(select 1 from public.project_notifications) then raise exception 'Reader sees another inbox';end if;
 if public.mark_notification(current_setting('bkm.n_cutoff')::bigint)<>0 then raise exception 'Reader marked someone else read';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_owner'),true);
update public.projects set archived=true where id=current_setting('bkm.n_project')::uuid;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_editor'),true);
do $$ begin
 if (public.list_notifications(current_setting('bkm.n_project')::uuid)->>'unread_count')::int<>1 then raise exception 'Archived inbox unavailable';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_owner'),true);
delete from public.project_members where project_id=current_setting('bkm.n_project')::uuid and user_id=current_setting('bkm.n_editor')::uuid;
select set_config('request.jwt.claim.sub',current_setting('bkm.n_editor'),true);
do $$ begin
 if jsonb_array_length(public.list_notifications(null,false)->'items')<>0 then raise exception 'Revoked member sees notices';end if;
 if public.mark_notification(current_setting('bkm.n_cutoff')::bigint)<>0 then raise exception 'Revoked member changes notice';end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.list_notifications(uuid,boolean,bigint)','execute') or has_function_privilege('anon','public.mark_notification(bigint,boolean)','execute') or has_function_privilege('anon','public.mark_notifications_read(bigint,uuid)','execute') then raise exception 'Anonymous notification API';end if;
 if has_table_privilege('authenticated','public.project_notifications','INSERT') or has_table_privilege('authenticated','public.project_notifications','DELETE') then raise exception 'Public mutation allowed';end if;
end $$;
rollback;
select 'Notification checks passed; all synthetic recipients and notices rolled back.' as result;

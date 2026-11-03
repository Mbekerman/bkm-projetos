-- Primary runtime checks, synthetic data only. No Storage writes or messages.
begin;
select set_config('bkm.s_owner',gen_random_uuid()::text,true),set_config('bkm.s_reader',gen_random_uuid()::text,true),set_config('bkm.s_project',gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('bkm.s_owner')::uuid),(current_setting('bkm.s_reader')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.s_owner'),true);
insert into public.projects(id,code,name) values(current_setting('bkm.s_project')::uuid,'SEARCH-QA','Projeto sintético');
insert into public.folders(project_id,name) values(current_setting('bkm.s_project')::uuid,'Pasta');
insert into public.documents(project_id,folder_id,code,title) select project_id,id,'A_B','Implantação 100% A'||chr(92)||'B' from public.folders where project_id=current_setting('bkm.s_project')::uuid;
insert into public.documents(project_id,folder_id,code,title) select current_setting('bkm.s_project')::uuid,f.id,'LOTE-'||n,'Lote volumoso '||n from public.folders f cross join generate_series(1,1005)n where f.project_id=current_setting('bkm.s_project')::uuid;
insert into public.project_tasks(project_id,title,description) values(current_setting('bkm.s_project')::uuid,'Checar laje','Memorial estrutural específico');
reset role;
do $$declare r uuid=gen_random_uuid();begin
 insert into public.document_revisions(id,project_id,document_id,revision_code,object_path,original_filename,mime_type,file_size,created_by,upload_state) select r,project_id,id,'R00',project_id::text||'/'||r||'/original.pdf','cadastral.pdf','application/pdf',1024,current_setting('bkm.s_owner')::uuid,'ready' from public.documents where project_id=current_setting('bkm.s_project')::uuid and code='A_B';
 perform set_config('bkm.s_revision',r::text,true);
end $$;
set local role authenticated;
insert into public.document_annotations(project_id,revision_id,page_number,x,y,body) values(current_setting('bkm.s_project')::uuid,current_setting('bkm.s_revision')::uuid,1,.1,.1,'Atenção à entrada');
do $$declare v jsonb;v2 jsonb;begin
 v=public.search_project_content('IMPLANTACAO',null,'document');assert (v->>'total')::int=1,'Accent search';
 v=public.search_project_content('100%',null,'document');assert (v->>'total')::int=1,'Literal percent';
 v=public.search_project_content('A_B',null,'document');assert (v->>'total')::int=1,'Literal underscore';
 v=public.search_project_content('A'||chr(92)||'B',null,'document');assert (v->>'total')::int=1,'Literal backslash';
 v=public.search_project_content('cadastral',null,'revision');assert (v->>'total')::int=1,'Revision filename';
 v=public.search_project_content('especifico',null,'task');assert (v->>'total')::int=1,'Task description';
 v=public.search_project_content('atencao',null,'annotation');assert (v->>'total')::int=1,'Annotation text';
 v=public.search_project_content('lote volumoso');assert (v->>'total')::int=1005 and jsonb_array_length(v->'items')=25 and (v->>'has_more')::boolean,'Exact total above row limit';
 v2=public.search_project_content('lote volumoso',null,'all',false,v->>'next_cursor');assert (v2#>>'{items,0,result_key}') collate "C">(v->>'next_cursor') collate "C",'Cursor duplication';
 begin perform public.search_project_content('x');raise exception 'Short query accepted';exception when check_violation then null;end;
 begin perform public.search_project_content('teste',null,'bad');raise exception 'Invalid kind';exception when check_violation then null;end;
end $$;
update public.document_annotations set deleted_at=now() where project_id=current_setting('bkm.s_project')::uuid;
update public.projects set archived=true where id=current_setting('bkm.s_project')::uuid;
do $$begin
 assert (public.search_project_content('implantacao')->>'total')::int=0,'Archive default';
 assert (public.search_project_content('implantacao',null,'document',true)->>'total')::int=1,'Include archived';
 assert (public.search_project_content('atencao',null,'annotation',true)->>'total')::int=0,'Removed annotation';
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.s_reader'),true);
do $$begin
 assert (public.search_project_content('lote volumoso',null,'all',true)->>'total')::int=0,'Outsider results';
 begin perform public.search_project_content('lote',current_setting('bkm.s_project')::uuid);raise exception 'Explicit forbidden project';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.s_owner'),true);
update public.projects set archived=false where id=current_setting('bkm.s_project')::uuid;
insert into public.project_members(project_id,user_id,role) values(current_setting('bkm.s_project')::uuid,current_setting('bkm.s_reader')::uuid,'reader');
update public.projects set archived=true where id=current_setting('bkm.s_project')::uuid;
select set_config('request.jwt.claim.sub',current_setting('bkm.s_reader'),true);
do $$begin assert (public.search_project_content('lote volumoso',null,'all',true)->>'total')::int=1005,'Reader scope';end $$;
reset role;
do $$begin
 assert not has_function_privilege('anon','public.search_project_content(text,uuid,text,boolean,text)','execute'),'Anonymous search';
 assert not (select prosecdef from pg_proc where oid='public.search_project_content(text,uuid,text,boolean,text)'::regprocedure),'RLS bypass';
end $$;
rollback;
select 'Search runtime checks passed, including 1005 results and access isolation. Synthetic data rolled back.' as result;

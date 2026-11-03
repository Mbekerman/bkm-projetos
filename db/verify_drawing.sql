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
do $$ declare k text; g jsonb; n uuid;bad jsonb;begin
 foreach k in array array['freehand','arrow','line','rectangle','ellipse','callout','text'] loop
  g=case when k='text' then '{"points":[{"x":0.1,"y":0.2}]}'::jsonb else '{"points":[{"x":0.1,"y":0.2},{"x":0.8,"y":0.7}]}'::jsonb end;
  insert into public.document_annotations(project_id,revision_id,page_number,x,y,body,kind,geometry,stroke_color,stroke_width,font_size)
  values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,.1,.2,'Forma de teste',k,g,'#1255ff',5,24) returning id into n;
  if n is null then raise exception 'Shape insert returning failed';end if;
  begin update public.document_annotations set geometry='{}' where id=n;raise exception 'Geometry edit accepted';exception when insufficient_privilege then null;end;
 end loop;
 foreach bad in array array['{}'::jsonb,'{"points":[]}'::jsonb,'{"points":[{"x":0.1,"y":0.2},{"x":1.2,"y":0.7}]}'::jsonb,'{"points":[{"x":"0.1","y":0.2},{"x":0.8,"y":0.7}]}'::jsonb,'{"points":[{"x":0.3,"y":0.2},{"x":0.8,"y":0.7}]}'::jsonb,'{"points":[{"x":0.1,"y":0.2},{"x":0.8,"y":0.7}],"script":"bad"}'::jsonb] loop
  begin
   insert into public.document_annotations(project_id,revision_id,page_number,x,y,body,kind,geometry) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,.1,.2,'Inválida','rectangle',bad);
   raise exception 'Invalid geometry accepted';
  exception when check_violation then null;end;
 end loop;
 select jsonb_build_object('points',jsonb_agg(jsonb_build_object('x',.1,'y',.2))) into g from generate_series(1,1001);
 begin insert into public.document_annotations(project_id,revision_id,page_number,x,y,body,kind,geometry) values(current_setting('bkm.ann_project')::uuid,current_setting('bkm.ann_revision')::uuid,1,.1,.2,'Inválida','freehand',g);raise exception 'Oversized stroke accepted';exception when check_violation then null;end;
 if (select kind from public.document_annotations where id=current_setting('bkm.ann_note')::uuid)<>'pin' then raise exception 'Legacy pin changed';end if;
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
reset role;
select 'PASS: seven drawing types, valid geometry, invalid/oversized payloads denied, legacy pins and annotation permissions' verification;
rollback;

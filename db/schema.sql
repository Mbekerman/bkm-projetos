-- BKM_autodoc: fundação de persistência. Aplicar somente em projeto vazio.
-- As chaves da API, senhas e tokens não fazem parte deste arquivo.
create schema bkm_private;
revoke all on schema bkm_private from public;
grant usage on schema bkm_private to authenticated;

create table public.projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 code text not null check (length(btrim(code)) between 1 and 30),
 name text not null check (length(btrim(name)) between 1 and 100),
 city text not null default '' check (length(city)<=80),
 responsible_name text not null default '' check (length(responsible_name)<=80),
 description text not null default '' check (length(description)<=2000),
 status text not null default 'Em desenvolvimento' check (status in ('Em desenvolvimento','Em análise','Suspenso','Concluído')),
 start_date date, end_date date,
 archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (end_date is null or start_date is null or end_date>=start_date)
);
create unique index projects_owner_code on public.projects(owner_id,lower(btrim(code)));
create index projects_owner on public.projects(owner_id);
create table public.project_members (
 project_id uuid not null references public.projects(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('editor','reader')),
 created_at timestamptz not null default now(),
 primary key(project_id,user_id)
);
create index project_members_user on public.project_members(user_id,project_id);

-- Authorization helpers deliberately bypass RLS only to resolve membership without
-- recursive policies. No user-controlled SQL, metadata claims or target user IDs.
create function bkm_private.owns_project(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.projects p where p.id=target and p.owner_id=auth.uid());
$$;
create function bkm_private.can_access_project(target uuid, writing boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
 select 1 from public.projects p where p.id=target
 and (not writing or not p.archived)
 and (p.owner_id=auth.uid() or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=auth.uid() and (not writing or m.role='editor'))));
$$;
revoke all on function bkm_private.owns_project(uuid),bkm_private.can_access_project(uuid,boolean) from public,anon;
grant execute on function bkm_private.owns_project(uuid),bkm_private.can_access_project(uuid,boolean) to authenticated;

create table public.folders (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 parent_id uuid, name text not null check(length(btrim(name)) between 1 and 80),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,project_id),
 foreign key(parent_id,project_id) references public.folders(id,project_id), check(parent_id is distinct from id)
);
create unique index folders_sibling_name on public.folders(project_id,parent_id,lower(btrim(name))) nulls not distinct;
create index folders_parent on public.folders(parent_id,project_id);
create table public.documents (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 folder_id uuid not null, code text not null check(length(btrim(code)) between 1 and 80),
 title text not null check(length(btrim(title)) between 1 and 200),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,project_id), foreign key(folder_id,project_id) references public.folders(id,project_id)
);
create unique index documents_project_code on public.documents(project_id,lower(btrim(code)));
create index documents_folder on public.documents(folder_id,project_id);
create index documents_creator on public.documents(created_by);
create table public.document_revisions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
 document_id uuid not null, revision_code text not null check(length(btrim(revision_code)) between 1 and 30),
 object_path text not null unique,
 original_filename text not null check(length(original_filename) between 1 and 255),
 mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),
 file_size bigint not null check(file_size>0 and file_size<=20971520),
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 foreign key(document_id,project_id) references public.documents(id,project_id),
 check(split_part(object_path,'/',1)=project_id::text and split_part(object_path,'/',2)=id::text and split_part(object_path,'/',3)<>'' and split_part(object_path,'/',4)='')
);
create unique index revision_document_code on public.document_revisions(document_id,lower(btrim(revision_code)));
create index revisions_project on public.document_revisions(project_id);
create index revisions_document_project on public.document_revisions(document_id,project_id);
create index revisions_creator on public.document_revisions(created_by);

create table public.audit_events (
 id bigint generated always as identity primary key,
 project_id uuid not null references public.projects(id), actor_id uuid references auth.users(id),
 entity_type text not null, entity_id text not null, action text not null,
 old_values jsonb, new_values jsonb, created_at timestamptz not null default now()
);
create index audit_project_time on public.audit_events(project_id,created_at desc);
create index audit_actor on public.audit_events(actor_id);

create function bkm_private.enforce_record_update() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.id<>old.id then raise exception 'A identidade do registro não pode mudar.'; end if;
 if tg_table_name='projects' then
  if new.owner_id<>old.owner_id then raise exception 'Transferência de proprietário exige fluxo específico.'; end if;
 else
  if new.project_id<>old.project_id then raise exception 'O registro não pode mudar de projeto.'; end if;
 end if;
 if tg_table_name='documents' then
  if new.created_by<>old.created_by then raise exception 'O autor de criação não pode mudar.'; end if;
 end if;
 new.created_at=old.created_at; new.updated_at=now(); return new;
end;
$$;
create function bkm_private.prevent_folder_cycle() returns trigger
language plpgsql set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.project_id::text,0));
 if exists(with recursive parents as (
  select f.id,f.parent_id from public.folders f where f.id=new.parent_id
  union select f.id,f.parent_id from public.folders f join parents p on f.id=p.parent_id
 ) select 1 from parents where id=new.id) then raise exception 'Uma pasta não pode ficar dentro de uma descendente.'; end if;
 return new;
end;
$$;
create function bkm_private.audit_record() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous jsonb; current_record jsonb; project uuid;
begin
 if tg_op<>'INSERT' then previous=to_jsonb(old); end if;
 if tg_op<>'DELETE' then current_record=to_jsonb(new); end if;
 project=case when tg_table_name='projects' then coalesce(current_record,previous)->>'id' else coalesce(current_record,previous)->>'project_id' end;
 insert into public.audit_events(project_id,actor_id,entity_type,entity_id,action,old_values,new_values)
 values(project,auth.uid(),tg_table_name,coalesce(coalesce(current_record,previous)->>'id',coalesce(current_record,previous)->>'user_id'),tg_op,previous,current_record);
 return null;
end;
$$;
revoke all on function bkm_private.enforce_record_update(),bkm_private.prevent_folder_cycle(),bkm_private.audit_record() from public,anon,authenticated;

create trigger projects_update before update on public.projects for each row execute function bkm_private.enforce_record_update();
create trigger folders_update before update on public.folders for each row execute function bkm_private.enforce_record_update();
create trigger documents_update before update on public.documents for each row execute function bkm_private.enforce_record_update();
create trigger folders_cycle before insert or update on public.folders for each row execute function bkm_private.prevent_folder_cycle();
create trigger projects_audit after insert or update on public.projects for each row execute function bkm_private.audit_record();
create trigger members_audit after insert or update or delete on public.project_members for each row execute function bkm_private.audit_record();
create trigger folders_audit after insert or update on public.folders for each row execute function bkm_private.audit_record();
create trigger documents_audit after insert or update on public.documents for each row execute function bkm_private.audit_record();
create trigger revisions_audit after insert on public.document_revisions for each row execute function bkm_private.audit_record();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.folders enable row level security;
alter table public.documents enable row level security;
alter table public.document_revisions enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.projects,public.project_members,public.folders,public.documents,public.document_revisions,public.audit_events from anon,authenticated;
grant select,insert,update on public.projects,public.folders,public.documents to authenticated;
grant select,insert,update,delete on public.project_members to authenticated;
grant select,insert on public.document_revisions to authenticated;
grant select on public.audit_events to authenticated;

create policy projects_read on public.projects for select to authenticated using(bkm_private.can_access_project(id));
create policy projects_create on public.projects for insert to authenticated with check(owner_id=(select auth.uid()));
create policy projects_edit on public.projects for update to authenticated using(bkm_private.owns_project(id)) with check(owner_id=(select auth.uid()));
create policy members_read on public.project_members for select to authenticated using(bkm_private.can_access_project(project_id));
create policy members_create on public.project_members for insert to authenticated with check(bkm_private.owns_project(project_id));
create policy members_edit on public.project_members for update to authenticated using(bkm_private.owns_project(project_id)) with check(bkm_private.owns_project(project_id));
create policy members_remove on public.project_members for delete to authenticated using(bkm_private.owns_project(project_id));
create policy folders_read on public.folders for select to authenticated using(bkm_private.can_access_project(project_id));
create policy folders_create on public.folders for insert to authenticated with check(bkm_private.can_access_project(project_id,true));
create policy folders_edit on public.folders for update to authenticated using(bkm_private.can_access_project(project_id,true)) with check(bkm_private.can_access_project(project_id,true));
create policy documents_read on public.documents for select to authenticated using(bkm_private.can_access_project(project_id));
create policy documents_create on public.documents for insert to authenticated with check(bkm_private.can_access_project(project_id,true) and created_by=(select auth.uid()));
create policy documents_edit on public.documents for update to authenticated using(bkm_private.can_access_project(project_id,true)) with check(bkm_private.can_access_project(project_id,true));
create policy revisions_read on public.document_revisions for select to authenticated using(bkm_private.can_access_project(project_id));
create policy revisions_create on public.document_revisions for insert to authenticated with check(bkm_private.can_access_project(project_id,true) and created_by=(select auth.uid()));
create policy audit_read on public.audit_events for select to authenticated using(bkm_private.can_access_project(project_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('bkm-documents','bkm-documents',false,20971520,array['application/pdf','image/png','image/jpeg']);
create policy bkm_files_read on storage.objects for select to authenticated using(
 bucket_id='bkm-documents' and exists(select 1 from public.document_revisions r where r.object_path=name and bkm_private.can_access_project(r.project_id)));
create policy bkm_files_create on storage.objects for insert to authenticated with check(
 bucket_id='bkm-documents' and exists(select 1 from public.document_revisions r where r.object_path=name and r.created_by=(select auth.uid()) and bkm_private.can_access_project(r.project_id,true)));

comment on table public.document_revisions is 'Emissões imutáveis: metadados reservados antes do upload. Existência do registro não confirma que o arquivo foi recebido. Aprovações serão implementadas em etapa própria.';
comment on table public.project_members is 'Participação por projeto. Proprietário administra; editor altera pastas/documentos; leitor consulta. Convites e papéis de aprovação ainda não implementados.';

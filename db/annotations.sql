-- Annotation coordinates use the displayed page orientation, normalized to [0,1].
alter table public.document_revisions add constraint revisions_id_project unique(id,project_id);
create table public.document_annotations (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id),
 revision_id uuid not null,
 page_number integer not null check(page_number between 1 and 100000),
 x double precision not null check(x>=0 and x<=1),
 y double precision not null check(y>=0 and y<=1),
 body text not null check(length(btrim(body)) between 1 and 2000),
 status text not null default 'open' check(status in ('open','resolved')),
 created_by uuid not null default auth.uid() references auth.users(id),
 author_name text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 foreign key(revision_id,project_id) references public.document_revisions(id,project_id)
);
create index annotations_revision_page on public.document_annotations(revision_id,page_number,created_at);
create index annotations_project on public.document_annotations(project_id);
create index annotations_creator on public.document_annotations(created_by);
alter table public.document_annotations enable row level security;
revoke all on public.document_annotations from public,anon,authenticated;
grant select on public.document_annotations to authenticated;
grant insert(project_id,revision_id,page_number,x,y,body) on public.document_annotations to authenticated;
grant update(status,deleted_at) on public.document_annotations to authenticated;
create policy annotations_read on public.document_annotations for select to authenticated
using(bkm_private.can_access_project(project_id));
create policy annotations_create on public.document_annotations for insert to authenticated
with check(created_by=(select auth.uid()) and bkm_private.can_access_project(project_id,true)
 and exists(select 1 from public.document_revisions r where r.id=revision_id and r.project_id=document_annotations.project_id and r.upload_state='ready' and (r.mime_type='application/pdf' or page_number=1)));
create policy annotations_update on public.document_annotations for update to authenticated
using(deleted_at is null and bkm_private.can_access_project(project_id,true) and (created_by=(select auth.uid()) or bkm_private.owns_project(project_id)))
with check(bkm_private.can_access_project(project_id,true) and (created_by=(select auth.uid()) or bkm_private.owns_project(project_id)));

-- Author display name is a snapshot, not an authorization claim. No directory API.
create function bkm_private.annotation_stamp() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if auth.uid() is null or new.created_by<>auth.uid() then raise exception 'Autor inválido.' using errcode='42501';end if;
  select coalesce(nullif(p.full_name,''),'Participante') into new.author_name from public.user_profiles p where p.id=auth.uid();
  new.author_name=coalesce(new.author_name,'Participante');
 else
  new.updated_at=now();
  if new.deleted_at is not null then new.deleted_at=now();end if;
 end if;
 return new;
end $$;
revoke all on function bkm_private.annotation_stamp() from public,anon,authenticated;
create trigger annotations_stamp before insert or update on public.document_annotations for each row execute function bkm_private.annotation_stamp();
create trigger annotations_audit after insert or update on public.document_annotations for each row execute function bkm_private.audit_record();

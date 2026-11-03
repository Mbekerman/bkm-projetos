-- Literal substring search; no OCR, dynamic SQL or external indexing service.
create function bkm_private.search_normalize(value text) returns text
language sql immutable strict security invoker set search_path='' as $$
 select translate(lower(value),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn');
$$;
revoke all on function bkm_private.search_normalize(text) from public,anon,authenticated;
grant execute on function bkm_private.search_normalize(text) to authenticated;

create function public.search_project_content(p_query text,p_project_id uuid default null,p_kind text default 'all',p_include_archived boolean default false,p_after text default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare term text=btrim(p_query);pattern text;result jsonb;
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_project_id is not null and not bkm_private.can_access_project(p_project_id) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if term is null or length(term) not between 2 and 120 or p_kind is null or p_kind not in ('all','document','revision','task','annotation') or p_include_archived is null
  or (p_after is not null and p_after !~ '^(document|revision|task|annotation):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
  raise exception 'Informe de 2 a 120 caracteres e filtros válidos.' using errcode='23514';
 end if;
 pattern='%'||replace(replace(replace(bkm_private.search_normalize(term),chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_')||'%';
 with projects as materialized (
  select id,code,name,archived from public.projects where (p_project_id is null or id=p_project_id) and (p_include_archived or not archived)
 ), hits as materialized (
  select 'document:'||d.id as result_key,'document'::text as kind,d.id,p.id as project_id,p.code as project_code,p.name as project_name,p.archived,
   d.code||' · '||d.title as title,''::text as excerpt,null::text as status,d.id as document_id,null::uuid as revision_id,null::integer as page_number
  from public.documents d join projects p on p.id=d.project_id
  where p_kind in ('all','document') and bkm_private.search_normalize(d.code||' '||d.title) like pattern escape E'\\'
  union all
  select 'revision:'||r.id,'revision',r.id,p.id,p.code,p.name,p.archived,
   d.code||' · '||d.title||' · '||r.revision_code,r.original_filename,r.upload_state,d.id,r.id,null::integer
  from public.document_revisions r join projects p on p.id=r.project_id join public.documents d on d.id=r.document_id and d.project_id=p.id
  where p_kind in ('all','revision') and bkm_private.search_normalize(d.code||' '||d.title||' '||r.revision_code||' '||r.original_filename) like pattern escape E'\\'
  union all
  select 'task:'||t.id,'task',t.id,p.id,p.code,p.name,p.archived or t.archived,
   'TAR-'||lpad(t.task_number::text,greatest(6,length(t.task_number::text)),'0')||' · '||t.title,left(t.description,320),t.stage,t.document_id,t.revision_id,null::integer
  from public.project_tasks t join projects p on p.id=t.project_id
  where p_kind in ('all','task') and (p_include_archived or not t.archived)
   and bkm_private.search_normalize('TAR-'||lpad(t.task_number::text,greatest(6,length(t.task_number::text)),'0')||' '||t.title||' '||t.description) like pattern escape E'\\'
  union all
  select 'annotation:'||a.id,'annotation',a.id,p.id,p.code,p.name,p.archived,
   d.code||' · '||r.revision_code||' · página '||a.page_number,left(a.body,320),a.status,d.id,r.id,a.page_number
  from public.document_annotations a join projects p on p.id=a.project_id
   join public.document_revisions r on r.id=a.revision_id and r.project_id=p.id
   join public.documents d on d.id=r.document_id and d.project_id=p.id
  where p_kind in ('all','annotation') and a.deleted_at is null and bkm_private.search_normalize(a.body) like pattern escape E'\\'
 ), candidates as materialized (
  select * from hits where p_after is null or result_key collate "C">p_after collate "C" order by result_key collate "C" limit 26
 ), page as materialized (select * from candidates order by result_key collate "C" limit 25)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(h) order by h.result_key collate "C") from page h),'[]'::jsonb),
  'total',(select count(*) from hits),'has_more',(select count(*)>25 from candidates),
  'next_cursor',(select result_key from page order by result_key collate "C" desc limit 1)) into result;
 return result;
end $$;
revoke all on function public.search_project_content(text,uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.search_project_content(text,uuid,text,boolean,text) to authenticated;

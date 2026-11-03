-- Read-only operational queries. Counts are computed in Postgres, independently
-- of the Data API's row limit or the records currently loaded by the browser.
create function public.project_overview(p_project_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; today date=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if auth.uid() is null or not bkm_private.can_access_project(p_project_id) then
  raise exception 'Acesso não autorizado.' using errcode='42501';
 end if;
 with tasks as materialized (
  select t.*,not t.archived and t.stage not in ('done','paused') and t.due_date<today as overdue
  from public.project_tasks t where t.project_id=p_project_id
 ), priority_tasks as (
  select id,task_number::text,title,stage,priority,due_date,assignee_id,overdue
  from tasks where not archived and stage not in ('done','paused')
  order by overdue desc nulls last,due_date asc nulls last,
   case priority when 'high' then 0 when 'medium' then 1 else 2 end,created_at,id limit 8
 ), my_tasks as (
  select id,task_number::text,title,stage,priority,due_date,assignee_id,overdue
  from tasks where not archived and stage<>'done' and assignee_id=auth.uid()
  order by overdue desc nulls last,due_date asc nulls last,created_at,id limit 8
 ) select jsonb_build_object(
  'project_id',p_project_id,'generated_at',now(),'today',today,
  'counts',jsonb_build_object(
   'documents',(select count(*) from public.documents where project_id=p_project_id),
   'ready_revisions',(select count(*) from public.document_revisions where project_id=p_project_id and upload_state='ready'),
   'pending_uploads',(select count(*) from public.document_revisions where project_id=p_project_id and upload_state='pending'),
   'pending_reviews',(select count(*) from public.revision_reviews where project_id=p_project_id and status='in_review'),
   'open_annotations',(select count(*) from public.document_annotations where project_id=p_project_id and status='open' and deleted_at is null),
   'active_tasks',(select count(*) from tasks where not archived and stage<>'done'),
   'overdue_tasks',(select count(*) from tasks where overdue),
   'paused_tasks',(select count(*) from tasks where not archived and stage='paused'),
   'my_tasks',(select count(*) from tasks where not archived and stage<>'done' and assignee_id=auth.uid())
  ),'priority_tasks',coalesce((select jsonb_agg(to_jsonb(t)) from priority_tasks t),'[]'::jsonb),
  'my_tasks',coalesce((select jsonb_agg(to_jsonb(t)) from my_tasks t),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.project_overview(uuid) from public,anon,authenticated;
grant execute on function public.project_overview(uuid) to authenticated;

-- Cursor is a bigint represented as a string in JSON, avoiding JS precision loss.
-- Only an explicit allowlist of snapshot fields is returned, never raw payloads,
-- e-mails, phone numbers, storage paths, comment bodies or drawing geometry.
create function public.project_activity(p_project_id uuid,p_kind text default 'all',p_before bigint default null,p_limit integer default 25) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not bkm_private.can_access_project(p_project_id) then
  raise exception 'Acesso não autorizado.' using errcode='42501';
 end if;
 if p_kind is null or p_kind not in ('all','project_tasks','task_comments','documents','document_revisions','revision_reviews','document_annotations','folders','projects','team')
  or p_limit is null or p_limit not between 1 and 50 or p_before<=0 then
  raise exception 'Filtro ou página inválidos.' using errcode='23514';
 end if;
 with candidates as materialized (
  select a.* from public.audit_events a where project_id=p_project_id and (p_before is null or id<p_before)
   and (p_kind='all' or entity_type=p_kind or (p_kind='team' and entity_type in ('project_members','project_access_invites')))
  order by id desc limit p_limit+1
 ), page as materialized (select * from candidates order by id desc limit p_limit),
 safe as (
  select a.id,a.id::text as event_id,a.actor_id,a.entity_type,a.action,a.created_at,
   (select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(coalesce(a.old_values,'{}'::jsonb))
    where key in ('code','name','title','task_number','stage','priority','due_date','assignee_id','archived','status','role','upload_state','revision_code','round_number','page_number','deleted_at','revoked_at','accepted_at')) as previous,
   (select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(coalesce(a.new_values,'{}'::jsonb))
    where key in ('code','name','title','task_number','stage','priority','due_date','assignee_id','archived','status','role','upload_state','revision_code','round_number','page_number','deleted_at','revoked_at','accepted_at')) as current
  from page a
 ) select jsonb_build_object('project_id',p_project_id,
  'events',coalesce((select jsonb_agg(to_jsonb(s)-'id' order by s.id desc) from safe s),'[]'::jsonb),
  'has_more',(select count(*)>p_limit from candidates),
  'next_cursor',(select min(id)::text from page)) into result;
 return result;
end $$;
revoke all on function public.project_activity(uuid,text,bigint,integer) from public,anon,authenticated;
grant execute on function public.project_activity(uuid,text,bigint,integer) to authenticated;
create index audit_project_id on public.audit_events(project_id,id desc);

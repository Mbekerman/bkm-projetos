create table public.revision_reviews (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id),
 revision_id uuid not null,
 round_number integer not null check(round_number>0),
 status text not null default 'in_review' check(status in ('in_review','approved','approved_with_comments','changes_requested')),
 request_message text not null default '' check(length(request_message)<=2000),
 requested_by uuid not null references auth.users(id),requested_name text not null,
 created_at timestamptz not null default now(),
 decision_message text,decided_by uuid references auth.users(id),decided_name text,decided_at timestamptz,
 foreign key(revision_id,project_id) references public.document_revisions(id,project_id),
 unique(revision_id,round_number),
 check((status='in_review' and decision_message is null and decided_by is null and decided_at is null and decided_name is null)
 or (status<>'in_review' and decision_message is not null and length(decision_message)<=2000 and decided_by is not null and decided_at is not null and decided_name is not null)),
 check(status not in ('approved_with_comments','changes_requested') or length(btrim(decision_message))>0)
);
create unique index reviews_one_pending on public.revision_reviews(revision_id) where status='in_review';
create index reviews_project_created on public.revision_reviews(project_id,created_at desc);
create index reviews_requester on public.revision_reviews(requested_by);
create index reviews_decider on public.revision_reviews(decided_by);
alter table public.revision_reviews enable row level security;
revoke all on public.revision_reviews from public,anon,authenticated;
grant select on public.revision_reviews to authenticated;
create policy reviews_read on public.revision_reviews for select to authenticated using(bkm_private.can_access_project(project_id));
create trigger reviews_audit after insert or update on public.revision_reviews for each row execute function bkm_private.audit_record();

-- Public wrappers are invokers. Only these private, checked operations can write.
create function bkm_private.request_revision_review(p_revision_id uuid,p_message text) returns uuid
language plpgsql security definer set search_path='' as $$
declare project uuid;author text;result uuid;next_round integer;message text=btrim(coalesce(p_message,''));
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if length(message)>2000 then raise exception 'O comentário deve ter até 2.000 caracteres.' using errcode='23514';end if;
 select project_id into project from public.document_revisions where id=p_revision_id;
 if not bkm_private.can_access_project(project,true) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 perform 1 from public.projects where id=project and not archived for update;
 if not found or not bkm_private.can_access_project(project,true) then raise exception 'Acesso não autorizado ou projeto arquivado.' using errcode='42501';end if;
 perform 1 from public.document_revisions where id=p_revision_id and upload_state='ready' for update;
 if not found then raise exception 'Conclua o envio do arquivo antes de solicitar análise.' using errcode='23514';end if;
 if exists(select 1 from public.revision_reviews where revision_id=p_revision_id and status='in_review') then raise exception 'Esta revisão já está em análise. Atualize a tela.';end if;
 select coalesce(max(round_number),0)+1 into next_round from public.revision_reviews where revision_id=p_revision_id;
 select coalesce(nullif(full_name,''),'Participante') into author from public.user_profiles where id=auth.uid();
 insert into public.revision_reviews(project_id,revision_id,round_number,request_message,requested_by,requested_name)
 values(project,p_revision_id,next_round,message,auth.uid(),coalesce(author,'Participante')) returning id into result;
 return result;
end $$;
create function bkm_private.decide_revision_review(p_review_id uuid,p_outcome text,p_message text) returns uuid
language plpgsql security definer set search_path='' as $$
declare project uuid;current_review public.revision_reviews;author text;message text=btrim(coalesce(p_message,''));
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_outcome is null or p_outcome not in ('approved','approved_with_comments','changes_requested') or length(message)>2000 or (p_outcome<>'approved' and message='') then raise exception 'Escolha o parecer e descreva as ressalvas ou ajustes necessários (até 2.000 caracteres).' using errcode='23514';end if;
 select project_id into project from public.revision_reviews where id=p_review_id;
 if not bkm_private.owns_project(project) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 perform 1 from public.projects where id=project and not archived for update;
 if not found or not bkm_private.owns_project(project) then raise exception 'Somente o proprietário pode emitir o parecer em um projeto ativo.' using errcode='42501';end if;
 select * into current_review from public.revision_reviews where id=p_review_id for update;
 if not found or current_review.status is distinct from 'in_review' then raise exception 'Esta análise já foi encerrada. Atualize a tela para consultar o parecer.';end if;
 select coalesce(nullif(full_name,''),'Participante') into author from public.user_profiles where id=auth.uid();
 update public.revision_reviews set status=p_outcome,decision_message=message,decided_by=auth.uid(),decided_name=coalesce(author,'Participante'),decided_at=now() where id=p_review_id;
 return p_review_id;
end $$;
revoke all on function bkm_private.request_revision_review(uuid,text),bkm_private.decide_revision_review(uuid,text,text) from public,anon,authenticated;
grant execute on function bkm_private.request_revision_review(uuid,text),bkm_private.decide_revision_review(uuid,text,text) to authenticated;
create function public.request_revision_review(p_revision_id uuid,p_message text default '') returns uuid language sql security invoker set search_path='' as $$ select bkm_private.request_revision_review(p_revision_id,p_message); $$;
create function public.decide_revision_review(p_review_id uuid,p_outcome text,p_message text default '') returns uuid language sql security invoker set search_path='' as $$ select bkm_private.decide_revision_review(p_review_id,p_outcome,p_message); $$;
revoke all on function public.request_revision_review(uuid,text),public.decide_revision_review(uuid,text,text) from public,anon,authenticated;
grant execute on function public.request_revision_review(uuid,text),public.decide_revision_review(uuid,text,text) to authenticated;

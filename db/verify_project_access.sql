begin;
do $$ declare key text;uid uuid;begin
 foreach key in array array['owner','verified','manual','attacker','late','cancelled','archived','outsider','project'] loop perform set_config('bkm.access_'||key,gen_random_uuid()::text,true);end loop;
 foreach key in array array['owner','verified','manual','attacker','outsider'] loop
  uid=current_setting('bkm.access_'||key)::uuid;
  insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
  values(uid,case when key in ('owner','outsider') then uid::text||'@example.test' else uid::text||'@bkm.com.br' end,now(),'{"provider":"email"}','{"full_name":"Pessoa de teste","email_verified":true,"provider":"google"}');
 end loop;
 insert into auth.identities(id,provider_id,user_id,provider,identity_data) values(gen_random_uuid(),current_setting('bkm.access_verified'),current_setting('bkm.access_verified')::uuid,'google',jsonb_build_object('email',current_setting('bkm.access_verified')||'@bkm.com.br','email_verified',true));
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_owner'),true);
insert into public.projects(id,code,name) values(current_setting('bkm.access_project')::uuid,'ACCESS-TEST','Projeto temporário');
insert into public.project_members(project_id,user_id,role) values(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_manual')::uuid,'reader');
do $$ declare invite uuid;begin
 invite=public.add_project_access(current_setting('bkm.access_project')::uuid,upper(current_setting('bkm.access_verified')||'@BKM.COM.BR'),'editor');perform set_config('bkm.inv_verified',invite::text,true);
 if not exists(select 1 from public.project_members where project_id=current_setting('bkm.access_project')::uuid and user_id=current_setting('bkm.access_verified')::uuid and role='editor') then raise exception 'Verified identity not granted';end if;
 perform set_config('bkm.inv_late',public.add_project_access(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_late')||'@bkm.com.br','reader')::text,true);
 perform public.change_project_invite(current_setting('bkm.inv_late')::uuid,'editor');
 perform set_config('bkm.inv_attacker',public.add_project_access(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_attacker')||'@bkm.com.br','editor')::text,true);
 perform set_config('bkm.inv_manual',public.add_project_access(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_manual')||'@bkm.com.br','editor')::text,true);
 invite=public.add_project_access(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_cancelled')||'@bkm.com.br','editor');perform public.revoke_project_invite(invite);
 perform set_config('bkm.inv_archived',public.add_project_access(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_archived')||'@bkm.com.br','editor')::text,true);
 begin perform public.add_project_access(current_setting('bkm.access_project')::uuid,'pessoa@bkm.com.br.evil.test','editor');raise exception 'Invalid domain accepted';exception when check_violation then null;end;
 begin perform public.add_project_access(current_setting('bkm.access_project')::uuid,'pessoa@bkm.com.br','owner');raise exception 'Owner role accepted';exception when check_violation then null;end;
 begin perform public.add_project_access(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_verified')||'@bkm.com.br','reader');raise exception 'Duplicate accepted';exception when check_violation then null;end;
 begin perform public.change_project_member(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_owner')::uuid,'reader');raise exception 'Owner changed';exception when check_violation then null;end;
 begin perform public.revoke_project_member(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_owner')::uuid);raise exception 'Owner removed';exception when check_violation then null;end;
 perform public.change_project_member(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_verified')::uuid,'reader');
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_verified'),true);
do $$ begin
 if not bkm_private.can_access_project(current_setting('bkm.access_project')::uuid) or bkm_private.can_access_project(current_setting('bkm.access_project')::uuid,true) then raise exception 'Reader downgrade failed';end if;
 if exists(select 1 from public.project_access_invites) then raise exception 'Member sees invitation email';end if;
 if exists(select 1 from public.audit_events where project_id=current_setting('bkm.access_project')::uuid and entity_type='project_access_invites' and (new_values ? 'email' or old_values ? 'email')) then raise exception 'Email leaked to audit';end if;
 begin perform public.add_project_access(current_setting('bkm.access_project')::uuid,'forbidden@bkm.com.br','editor');raise exception 'Reader granted access';exception when insufficient_privilege then null;end;
 update public.project_members set role='editor' where project_id=current_setting('bkm.access_project')::uuid and user_id=auth.uid();if found then raise exception 'Self escalation';end if;
 if public.accept_project_access()<>0 then raise exception 'Accepted invitation consumed twice';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_attacker'),true);
do $$ begin
 if public.accept_project_access()<>0 then raise exception 'Metadata spoof accepted';end if;
 if bkm_private.can_access_project(current_setting('bkm.access_project')::uuid) then raise exception 'Metadata spoof granted access';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_owner'),true);
select public.revoke_project_member(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_verified')::uuid);
select set_config('request.jwt.claim.sub',current_setting('bkm.access_verified'),true);
do $$ begin
 if public.accept_project_access()<>0 or bkm_private.can_access_project(current_setting('bkm.access_project')::uuid) then raise exception 'Revoked access restored by login';end if;
 if exists(select 1 from public.projects where id=current_setting('bkm.access_project')::uuid) then raise exception 'Revoked user sees project';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_owner'),true);
select public.add_project_access(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_verified')||'@bkm.com.br','reader');
select public.revoke_project_invite(current_setting('bkm.inv_verified')::uuid);
do $$ begin
 if not exists(select 1 from public.project_members where project_id=current_setting('bkm.access_project')::uuid and user_id=current_setting('bkm.access_verified')::uuid) then raise exception 'Stale revocation removed new authorization';end if;
end $$;
reset role;
do $$ declare key text;uid uuid;begin
 foreach key in array array['late','cancelled','archived'] loop
  uid=current_setting('bkm.access_'||key)::uuid;insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(uid,uid::text||'@bkm.com.br',now(),'{"full_name":"Pessoa de teste"}');
 end loop;
 foreach key in array array['late','cancelled','archived','manual'] loop
  uid=current_setting('bkm.access_'||key)::uuid;insert into auth.identities(id,provider_id,user_id,provider,identity_data) values(gen_random_uuid(),uid::text,uid,'google',jsonb_build_object('email',uid::text||'@bkm.com.br','email_verified',true));
 end loop;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_late'),true);
do $$ declare accepted integer;begin
 accepted=public.accept_project_access();
 if accepted<>1 then raise exception 'First verified login accepted % invitations, expected 1',accepted;end if;
 if not bkm_private.can_access_project(current_setting('bkm.access_project')::uuid,true) then raise exception 'First verified login membership missing';end if;
 if public.accept_project_access()<>0 then raise exception 'Acceptance not idempotent';end if;
 if exists(select 1 from public.user_profiles where id=current_setting('bkm.access_owner')::uuid) then raise exception 'Profile privacy changed';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_cancelled'),true);
do $$ begin
 if public.accept_project_access()<>0 or bkm_private.can_access_project(current_setting('bkm.access_project')::uuid) then raise exception 'Cancelled invitation accepted';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_manual'),true);
do $$ begin
 if public.accept_project_access()<>1 or bkm_private.can_access_project(current_setting('bkm.access_project')::uuid,true) then raise exception 'Login widened previous manual role';end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_outsider'),true);
do $$ begin
 if exists(select 1 from public.project_access_invites) then raise exception 'Outsider sees invitations';end if;
 begin perform public.change_project_member(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_late')::uuid,'editor');raise exception 'Outsider changed role';exception when insufficient_privilege then null;end;
 begin perform public.revoke_project_invite(current_setting('bkm.inv_late')::uuid);raise exception 'Outsider revoked';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_owner'),true);
update public.projects set archived=true where id=current_setting('bkm.access_project')::uuid;
do $$ begin
 begin perform public.add_project_access(current_setting('bkm.access_project')::uuid,'archived@bkm.com.br','reader');raise exception 'Archived grant accepted';exception when insufficient_privilege then null;end;
 begin perform public.change_project_member(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_late')::uuid,'reader');raise exception 'Archived role changed';exception when insufficient_privilege then null;end;
 perform public.revoke_project_member(current_setting('bkm.access_project')::uuid,current_setting('bkm.access_verified')::uuid);
end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_archived'),true);
do $$ begin if public.accept_project_access()<>0 then raise exception 'Archived pending access accepted';end if;end $$;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_owner'),true);
update public.projects set archived=false where id=current_setting('bkm.access_project')::uuid;
select set_config('request.jwt.claim.sub',current_setting('bkm.access_archived'),true);
do $$ begin if public.accept_project_access()<>1 then raise exception 'Restored pending access not accepted';end if;end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.add_project_access(uuid,text,text)','EXECUTE') or has_function_privilege('anon','public.accept_project_access()','EXECUTE') then raise exception 'Anonymous RPC grant';end if;
 if has_function_privilege('authenticated','bkm_private.verified_bkm_email(uuid)','EXECUTE') then raise exception 'Private identity lookup exposed';end if;
 if has_table_privilege('authenticated','public.project_access_invites','INSERT') then raise exception 'Direct invitation write grant';end if;
end $$;
select 'PASS: scoped team access, verified corporate identities, pending first login, roles, revocation, stale requests, private email/audit and archived projects' verification;
rollback;

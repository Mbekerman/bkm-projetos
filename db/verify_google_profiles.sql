begin;
select set_config('bkm.test_user',gen_random_uuid()::text,true);
select set_config('bkm.test_other',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values
(current_setting('bkm.test_user')::uuid,'test@bkm.com.br','{"provider":"google","providers":["google"]}','{"full_name":"Pessoa Teste"}'),
(current_setting('bkm.test_other')::uuid,'other@example.test','{"provider":"email"}','{}');
insert into auth.identities(id,provider_id,user_id,provider,identity_data)
values(gen_random_uuid(),'bkm-test',current_setting('bkm.test_user')::uuid,'google','{"email":"Test@BKM.com.br","email_verified":true}');
do $$ declare v jsonb; begin
 foreach v in array array['{"email":"test@gmail.com","email_verified":true}'::jsonb,'{"email":"test@bkm.com.br.evil.test","email_verified":true}'::jsonb,'{"email":"test@bkm.com.br","email_verified":false}'::jsonb] loop
  begin
   insert into auth.identities(id,provider_id,user_id,provider,identity_data) values(gen_random_uuid(),gen_random_uuid()::text,current_setting('bkm.test_other')::uuid,'google',v);
   raise exception 'Invalid Google identity was accepted';
  exception when insufficient_privilege then null; end;
 end loop;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('bkm.test_user'),true);
do $$ begin
 if (select count(*) from public.user_profiles) <> 1 then raise exception 'Profile isolation failed'; end if;
 if (select full_name from public.user_profiles) <> 'Pessoa Teste' then raise exception 'Automatic profile failed'; end if;
 update public.user_profiles set mobile='+5511999991234' where id=current_setting('bkm.test_user')::uuid;
 if (select mobile from public.user_profiles) <> '+5511999991234' then raise exception 'Mobile persistence failed'; end if;
 update public.user_profiles set mobile='+5511999990000' where id=current_setting('bkm.test_other')::uuid;
 if found then raise exception 'Other profile update was accepted'; end if;
 begin update public.user_profiles set full_name='Spoof';raise exception 'Profile metadata write accepted';exception when insufficient_privilege then null;end;
end $$;
rollback;

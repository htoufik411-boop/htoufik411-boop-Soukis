create or replace function public.create_corporate_ad_checkout(p_request_id uuid,p_payment_provider text,p_payment_method text default null) returns public.corporate_ad_payments language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();v_request public.corporate_ad_requests%rowtype;v_payment public.corporate_ad_payments;
begin
 if v_user is null then raise exception 'not_authenticated';end if;if p_payment_provider not in('chargily','satim','manual') then raise exception 'invalid_payment_provider';end if;if p_payment_method is not null and p_payment_method not in('cib','edahabia','qr','cash','other','chargily_app') then raise exception 'invalid_payment_method';end if;
 select * into v_request from public.corporate_ad_requests where id=p_request_id and (user_id=v_user or public.is_admin()) for update;if not found then raise exception 'request_not_found';end if;if v_request.status<>'approved' then raise exception 'request_not_approved';end if;
 if exists(select 1 from public.corporate_ad_payments where request_id=p_request_id and status in('pending','paid')) then raise exception 'payment_already_exists';end if;
 insert into public.corporate_ad_payments(request_id,user_id,amount_dzd,payment_provider,payment_method) values(v_request.id,v_request.user_id,v_request.amount_dzd,p_payment_provider,p_payment_method) returning * into v_payment;return v_payment;
exception when unique_violation then raise exception 'payment_already_exists';end; $$;
revoke all on function public.create_corporate_ad_checkout(uuid,text,text) from public,anon;grant execute on function public.create_corporate_ad_checkout(uuid,text,text) to authenticated;

create or replace function public.prepare_chargily_checkout(p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();r public.corporate_ad_requests;p public.corporate_ad_payments;t uuid;admin_user boolean:=false;
begin
 if u is null then raise exception 'not_authenticated';end if;admin_user:=public.is_admin();select * into r from public.corporate_ad_requests where id=p_request_id and (user_id=u or admin_user) for update;if not found then raise exception 'request_not_found';end if;if r.status<>'approved' then raise exception 'request_not_approved';end if;
 select * into p from public.corporate_ad_payments where request_id=r.id and payment_provider='chargily' and status='pending' and (user_id=u or admin_user) order by created_at desc limit 1 for update;if not found then raise exception 'pending_chargily_payment_not_found';end if;
 if p.provider_checkout_id is not null then return jsonb_build_object('status','already_created','payment_id',p.id,'checkout_id',p.provider_checkout_id);end if;if p.checkout_creation_started_at is not null and p.checkout_creation_started_at>now()-interval '10 minutes' then raise exception 'checkout_creation_in_progress';end if;
 t:=gen_random_uuid();update public.corporate_ad_payments set checkout_creation_token=t,checkout_creation_started_at=now() where id=p.id;return jsonb_build_object('status','ready','payment_id',p.id,'request_id',r.id,'amount_dzd',p.amount_dzd,'currency',lower(p.currency),'payment_method',case when p.payment_method in('edahabia','cib','chargily_app') then p.payment_method else null end,'creation_token',t);
end; $$;
revoke all on function public.prepare_chargily_checkout(uuid) from public,anon;grant execute on function public.prepare_chargily_checkout(uuid) to authenticated;

create or replace function public.bind_chargily_checkout(p_payment_id uuid,p_creation_token uuid,p_checkout_id text) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.corporate_ad_payments;u uuid:=auth.uid();admin_user boolean:=false;
begin
 if u is null then raise exception 'not_authenticated';end if;admin_user:=public.is_admin();if nullif(trim(p_checkout_id),'') is null then raise exception 'checkout_id_required';end if;
 update public.corporate_ad_payments set provider_checkout_id=trim(p_checkout_id),checkout_creation_token=null,checkout_creation_started_at=null where id=p_payment_id and payment_provider='chargily' and status='pending' and checkout_creation_token=p_creation_token and (user_id=u or admin_user) returning * into p;if not found then raise exception 'checkout_binding_failed';end if;
 return jsonb_build_object('status','bound','payment_id',p.id,'checkout_id',p.provider_checkout_id);
exception when unique_violation then raise exception 'checkout_id_already_bound';end; $$;
revoke all on function public.bind_chargily_checkout(uuid,uuid,text) from public,anon;grant execute on function public.bind_chargily_checkout(uuid,uuid,text) to authenticated;

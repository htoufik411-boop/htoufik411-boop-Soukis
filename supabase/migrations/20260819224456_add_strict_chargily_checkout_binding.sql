create or replace function public.prepare_chargily_checkout(p_request_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare u uuid:=auth.uid();r public.corporate_ad_requests;p public.corporate_ad_payments;t uuid;
begin
 if u is null then raise exception 'not_authenticated'; end if;
 select * into r from public.corporate_ad_requests where id=p_request_id and user_id=u for update;
 if not found then raise exception 'request_not_found'; end if;
 if r.status<>'approved' then raise exception 'request_not_approved'; end if;
 select * into p from public.corporate_ad_payments where request_id=r.id and user_id=u and payment_provider='chargily' and status='pending' order by created_at desc limit 1 for update;
 if not found then raise exception 'pending_chargily_payment_not_found'; end if;
 if p.provider_checkout_id is not null then return jsonb_build_object('status','already_created','payment_id',p.id,'checkout_id',p.provider_checkout_id); end if;
 if p.checkout_creation_started_at is not null and p.checkout_creation_started_at>now()-interval '10 minutes' then raise exception 'checkout_creation_in_progress'; end if;
 t:=gen_random_uuid();update public.corporate_ad_payments set checkout_creation_token=t,checkout_creation_started_at=now() where id=p.id;
 return jsonb_build_object('status','ready','payment_id',p.id,'request_id',r.id,'amount_dzd',p.amount_dzd,'currency',lower(p.currency),'payment_method',case when p.payment_method in('edahabia','cib','chargily_app') then p.payment_method else null end,'creation_token',t);
end; $$;
revoke all on function public.prepare_chargily_checkout(uuid) from public,anon;grant execute on function public.prepare_chargily_checkout(uuid) to authenticated;

create or replace function public.bind_chargily_checkout(p_payment_id uuid,p_creation_token uuid,p_checkout_id text) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.corporate_ad_payments;u uuid:=auth.uid();
begin
 if u is null then raise exception 'not_authenticated'; end if;
 if nullif(trim(p_checkout_id),'') is null then raise exception 'checkout_id_required'; end if;
 update public.corporate_ad_payments set provider_checkout_id=trim(p_checkout_id),checkout_creation_token=null,checkout_creation_started_at=null where id=p_payment_id and user_id=u and payment_provider='chargily' and status='pending' and checkout_creation_token=p_creation_token returning * into p;
 if not found then raise exception 'checkout_binding_failed'; end if;
 return jsonb_build_object('status','bound','payment_id',p.id,'checkout_id',p.provider_checkout_id);
exception when unique_violation then raise exception 'checkout_id_already_bound';
end; $$;
revoke all on function public.bind_chargily_checkout(uuid,uuid,text) from public,anon;grant execute on function public.bind_chargily_checkout(uuid,uuid,text) to authenticated;

create or replace function public.process_chargily_checkout_paid(p_event_id text,p_checkout_id text,p_request_id uuid,p_amount numeric,p_currency text,p_payment_method text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.corporate_ad_payments;r public.corporate_ad_requests;c public.corporate_ad_campaigns;
begin
 if nullif(trim(p_event_id),'') is null then raise exception 'event_id_required'; end if;if nullif(trim(p_checkout_id),'') is null then raise exception 'checkout_id_required';end if;if lower(trim(p_currency))<>'dzd' then raise exception 'invalid_currency';end if;if p_amount is null or p_amount<=0 then raise exception 'invalid_amount';end if;
 select * into p from public.corporate_ad_payments where provider_event_id=p_event_id or provider_checkout_id=trim(p_checkout_id) order by case when provider_event_id=p_event_id then 0 else 1 end limit 1 for update;
 if not found then raise exception 'checkout_not_bound';end if;if p.payment_provider<>'chargily' then raise exception 'invalid_payment_provider';end if;if p.provider_checkout_id<>trim(p_checkout_id) then raise exception 'checkout_mismatch';end if;if p.request_id<>p_request_id then raise exception 'request_mismatch';end if;if p.currency<>upper(trim(p_currency)) then raise exception 'currency_mismatch';end if;if p.amount_dzd<>p_amount then raise exception 'amount_mismatch';end if;
 if p.status='paid' then return jsonb_build_object('status','already_paid','payment_id',p.id,'request_id',p.request_id);end if;if p.status<>'pending' then raise exception 'invalid_payment_state';end if;
 select * into r from public.corporate_ad_requests where id=p.request_id for update;if not found or r.status<>'approved' then raise exception 'request_not_approved';end if;if r.amount_dzd<>p.amount_dzd then raise exception 'request_amount_mismatch';end if;
 update public.corporate_ad_payments set status='paid',paid_at=now(),provider_transaction_id=coalesce(provider_transaction_id,trim(p_checkout_id)),provider_event_id=p_event_id,payment_method=coalesce(p_payment_method,payment_method) where id=p.id;
 insert into public.corporate_ad_campaigns(request_id,user_id,placement,starts_at,ends_at,status) values(r.id,r.user_id,r.placement,now(),now()+make_interval(days=>r.duration_days),'active') on conflict(request_id) do update set status='active',starts_at=excluded.starts_at,ends_at=excluded.ends_at,updated_at=now() returning * into c;
 update public.corporate_ad_requests set status='active',updated_at=now() where id=r.id;
 return jsonb_build_object('status','active','payment_id',p.id,'request_id',r.id,'campaign_id',c.id);
end; $$;
revoke all on function public.process_chargily_checkout_paid(text,text,uuid,numeric,text,text) from public,anon,authenticated;grant execute on function public.process_chargily_checkout_paid(text,text,uuid,numeric,text,text) to service_role;

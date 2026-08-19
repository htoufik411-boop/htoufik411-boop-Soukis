-- Corporate Ads: secure admin review and checkout creation.
create unique index if not exists corporate_ad_payments_one_live_per_request_idx
  on public.corporate_ad_payments(request_id)
  where status in ('pending','paid');

create or replace function public.admin_review_corporate_ad(p_request_id uuid,p_status text,p_review_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_request public.corporate_ad_requests%rowtype; v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'not_authenticated'; end if;
 if not public.is_admin() then raise exception 'not_authorized'; end if;
 if p_status not in ('approved','rejected','cancelled') then raise exception 'invalid_review_status'; end if;
 select * into v_request from public.corporate_ad_requests where id=p_request_id for update;
 if not found then raise exception 'request_not_found'; end if;
 if v_request.status not in ('pending','approved') then raise exception 'invalid_request_state'; end if;
 update public.corporate_ad_requests set status=p_status,review_note=nullif(trim(p_review_note),''),reviewed_by=v_user,reviewed_at=now(),updated_at=now() where id=p_request_id returning * into v_request;
 return jsonb_build_object('id',v_request.id,'status',v_request.status,'amount_dzd',v_request.amount_dzd,'reviewed_at',v_request.reviewed_at);
end; $$;
revoke all on function public.admin_review_corporate_ad(uuid,text,text) from public,anon,authenticated; grant execute on function public.admin_review_corporate_ad(uuid,text,text) to authenticated;

create or replace function public.create_corporate_ad_checkout(p_request_id uuid,p_payment_provider text,p_payment_method text default null)
returns public.corporate_ad_payments language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_request public.corporate_ad_requests%rowtype; v_payment public.corporate_ad_payments;
begin
 if v_user is null then raise exception 'not_authenticated'; end if;
 if p_payment_provider not in ('chargily','satim','manual') then raise exception 'invalid_payment_provider'; end if;
 if p_payment_method is not null and p_payment_method not in ('cib','edahabia','qr','cash','other') then raise exception 'invalid_payment_method'; end if;
 select * into v_request from public.corporate_ad_requests where id=p_request_id and user_id=v_user for update;
 if not found then raise exception 'request_not_found'; end if;
 if v_request.status<>'approved' then raise exception 'request_not_approved'; end if;
 if exists(select 1 from public.corporate_ad_payments where request_id=p_request_id and status in ('pending','paid')) then raise exception 'payment_already_exists'; end if;
 insert into public.corporate_ad_payments(request_id,user_id,amount_dzd,payment_provider,payment_method) values(v_request.id,v_user,v_request.amount_dzd,p_payment_provider,p_payment_method) returning * into v_payment;
 return v_payment;
exception when unique_violation then raise exception 'payment_already_exists';
end; $$;
revoke all on function public.create_corporate_ad_checkout(uuid,text,text) from public,anon; grant execute on function public.create_corporate_ad_checkout(uuid,text,text) to authenticated;

-- Server-side payment-method validation is authoritative; the client cannot bypass it.

create or replace function public.admin_list_corporate_ad_requests(p_status text default null)
returns setof public.corporate_ad_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
  select r.* from public.corporate_ad_requests r
  where p_status is null or r.status = p_status
  order by r.created_at desc;
end;
$$;

create or replace function public.admin_review_corporate_ad_request(
  p_request_id uuid,
  p_status text,
  p_review_note text default null
)
returns public.corporate_ad_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.corporate_ad_requests;
  v_admin uuid := auth.uid();
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_status not in ('approved','rejected','cancelled') then raise exception 'invalid_review_status'; end if;
  update public.corporate_ad_requests
  set status = p_status,
      review_note = nullif(trim(p_review_note), ''),
      reviewed_by = v_admin,
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id
    and status = 'pending'
  returning * into v_row;
  if not found then raise exception 'request_not_pending'; end if;
  return v_row;
end;
$$;

create or replace function public.admin_create_corporate_ad_payment(
  p_request_id uuid,
  p_provider text,
  p_method text default null
)
returns public.corporate_ad_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.corporate_ad_requests;
  v_payment public.corporate_ad_payments;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into v_request from public.corporate_ad_requests where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'approved' then raise exception 'request_not_approved'; end if;
  if p_provider not in ('chargily','satim','manual') then raise exception 'invalid_provider'; end if;
  if p_method is not null and p_method not in ('cib','edahabia','qr','cash','other') then raise exception 'invalid_payment_method'; end if;
  if exists (select 1 from public.corporate_ad_payments where request_id=p_request_id and status in ('pending','paid')) then raise exception 'payment_already_exists'; end if;
  insert into public.corporate_ad_payments(request_id,user_id,amount_dzd,payment_provider,payment_method)
  values (v_request.id,v_request.user_id,v_request.amount_dzd,p_provider,p_method)
  returning * into v_payment;
  return v_payment;
end;
$$;

create or replace function public.admin_confirm_corporate_ad_payment(
  p_payment_id uuid,
  p_provider_transaction_id text default null,
  p_provider_reference text default null
)
returns public.corporate_ad_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.corporate_ad_payments;
  v_request public.corporate_ad_requests;
  v_campaign public.corporate_ad_campaigns;
  v_now timestamptz := now();
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into v_payment from public.corporate_ad_payments where id=p_payment_id for update;
  if not found then raise exception 'payment_not_found'; end if;
  if v_payment.status = 'paid' then
    select * into v_campaign from public.corporate_ad_campaigns where request_id=v_payment.request_id;
    return v_campaign;
  end if;
  if v_payment.status <> 'pending' then raise exception 'payment_not_pending'; end if;
  select * into v_request from public.corporate_ad_requests where id=v_payment.request_id for update;
  if not found or v_request.status <> 'approved' then raise exception 'request_not_approved'; end if;
  update public.corporate_ad_payments
  set status='paid', paid_at=v_now,
      provider_transaction_id=nullif(trim(p_provider_transaction_id),''),
      provider_reference=nullif(trim(p_provider_reference),'')
  where id=v_payment.id;
  update public.corporate_ad_requests set status='paid', updated_at=v_now where id=v_request.id;
  insert into public.corporate_ad_campaigns(request_id,user_id,placement,starts_at,ends_at,status)
  values (v_request.id,v_request.user_id,v_request.placement,v_now,v_now + make_interval(days => v_request.duration_days),'active')
  on conflict (request_id) do update set status='active', starts_at=excluded.starts_at, ends_at=excluded.ends_at, updated_at=v_now
  returning * into v_campaign;
  update public.corporate_ad_requests set status='active', updated_at=v_now where id=v_request.id;
  return v_campaign;
end;
$$;

revoke all on function public.admin_list_corporate_ad_requests(text) from public, anon, authenticated;
revoke all on function public.admin_review_corporate_ad_request(uuid,text,text) from public, anon, authenticated;
revoke all on function public.admin_create_corporate_ad_payment(uuid,text,text) from public, anon, authenticated;
revoke all on function public.admin_confirm_corporate_ad_payment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_list_corporate_ad_requests(text) to authenticated;
grant execute on function public.admin_review_corporate_ad_request(uuid,text,text) to authenticated;
grant execute on function public.admin_create_corporate_ad_payment(uuid,text,text) to authenticated;
grant execute on function public.admin_confirm_corporate_ad_payment(uuid,text,text) to authenticated;

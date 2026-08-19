-- Chargily webhook verification layer.
-- This migration does not contact Chargily; the Edge Function verifies the HMAC
-- signature and passes only verified event data to process_chargily_checkout_paid().

alter table public.corporate_ad_payments
  add column if not exists provider_event_id text,
  add column if not exists provider_checkout_id text;

create unique index if not exists corporate_ad_payments_provider_event_id_uidx
  on public.corporate_ad_payments(provider_event_id)
  where provider_event_id is not null;

create unique index if not exists corporate_ad_payments_provider_checkout_id_uidx
  on public.corporate_ad_payments(provider_checkout_id)
  where provider_checkout_id is not null;

-- Manual confirmation must never be used to mark an automated provider payment paid.
create or replace function public.admin_confirm_corporate_ad_payment(
  p_payment_id uuid,
  p_provider_transaction_id text default null,
  p_provider_reference text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.corporate_ad_payments%rowtype;
  v_request public.corporate_ad_requests%rowtype;
  v_user uuid := auth.uid();
  v_campaign public.corporate_ad_campaigns%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not public.is_admin() then raise exception 'not_authorized'; end if;

  select * into v_payment
  from public.corporate_ad_payments
  where id = p_payment_id
  for update;
  if not found then raise exception 'payment_not_found'; end if;
  if v_payment.status <> 'pending' then raise exception 'invalid_payment_state'; end if;
  if v_payment.payment_provider <> 'manual' then
    raise exception 'provider_payment_requires_webhook_verification';
  end if;

  select * into v_request
  from public.corporate_ad_requests
  where id = v_payment.request_id
  for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'approved' then raise exception 'request_not_approved'; end if;

  update public.corporate_ad_payments
  set status='paid',
      paid_at=now(),
      provider_transaction_id=nullif(trim(p_provider_transaction_id),''),
      provider_reference=nullif(trim(p_provider_reference),'')
  where id=v_payment.id
  returning * into v_payment;

  update public.corporate_ad_requests
  set status='paid', updated_at=now()
  where id=v_request.id;

  insert into public.corporate_ad_campaigns(
    request_id, user_id, placement, starts_at, ends_at, status
  )
  values (
    v_request.id, v_request.user_id, v_request.placement,
    now(), now() + make_interval(days => v_request.duration_days), 'active'
  )
  on conflict (request_id) do update
    set starts_at=excluded.starts_at,
        ends_at=excluded.ends_at,
        status='active',
        updated_at=now()
  returning * into v_campaign;

  update public.corporate_ad_requests
  set status='active', updated_at=now()
  where id=v_request.id;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'request_id', v_request.id,
    'campaign_id', v_campaign.id,
    'status', 'active',
    'starts_at', v_campaign.starts_at,
    'ends_at', v_campaign.ends_at
  );
end;
$$;

revoke all on function public.admin_confirm_corporate_ad_payment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_confirm_corporate_ad_payment(uuid,text,text) to authenticated;

-- Called only by the verified Chargily webhook Edge Function.
create or replace function public.process_chargily_checkout_paid(
  p_event_id text,
  p_checkout_id text,
  p_request_id uuid,
  p_amount numeric,
  p_currency text,
  p_payment_method text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.corporate_ad_payments%rowtype;
  v_request public.corporate_ad_requests%rowtype;
  v_campaign public.corporate_ad_campaigns%rowtype;
  v_event_payment public.corporate_ad_payments%rowtype;
  v_checkout_payment public.corporate_ad_payments%rowtype;
begin
  if nullif(trim(p_event_id), '') is null then raise exception 'event_id_required'; end if;
  if nullif(trim(p_checkout_id), '') is null then raise exception 'checkout_id_required'; end if;
  if p_currency <> 'DZD' then raise exception 'invalid_currency'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;

  -- Never infer a payment from request_id alone. The provider checkout identifier
  -- is the authoritative binding for an automated Chargily payment.
  select * into v_event_payment
  from public.corporate_ad_payments
  where provider_event_id = p_event_id
  for update;

  select * into v_checkout_payment
  from public.corporate_ad_payments
  where provider_checkout_id = p_checkout_id
  for update;

  if found and v_event_payment.id is distinct from v_checkout_payment.id then
    raise exception 'provider_identifier_mismatch';
  end if;

  if v_event_payment.id is not null then
    v_payment := v_event_payment;
  elsif v_checkout_payment.id is not null then
    v_payment := v_checkout_payment;
  else
    raise exception 'checkout_payment_not_found';
  end if;

  -- A duplicate delivery is idempotent only when all provider-bound fields
  -- still identify the same payment.
  if v_payment.request_id <> p_request_id then raise exception 'request_mismatch'; end if;
  if v_payment.currency <> p_currency then raise exception 'currency_mismatch'; end if;
  if v_payment.amount_dzd <> p_amount then raise exception 'amount_mismatch'; end if;
  if v_payment.payment_provider <> 'chargily' then raise exception 'invalid_payment_provider'; end if;
  if v_payment.provider_checkout_id is not null and v_payment.provider_checkout_id <> p_checkout_id then
    raise exception 'checkout_id_mismatch';
  end if;

  if v_payment.status = 'paid' then
    return jsonb_build_object(
      'status','already_paid',
      'payment_id',v_payment.id,
      'request_id',v_payment.request_id
    );
  end if;

  if v_payment.status <> 'pending' then raise exception 'invalid_payment_state'; end if;

  select * into v_request
  from public.corporate_ad_requests
  where id = v_payment.request_id
  for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'approved' then raise exception 'request_not_approved'; end if;
  if v_request.amount_dzd <> v_payment.amount_dzd then raise exception 'request_amount_mismatch'; end if;

  update public.corporate_ad_payments
  set status='paid',
      paid_at=now(),
      provider_transaction_id=coalesce(provider_transaction_id, p_checkout_id),
      provider_checkout_id=p_checkout_id,
      provider_event_id=p_event_id,
      payment_method=coalesce(p_payment_method, payment_method)
  where id=v_payment.id
  returning * into v_payment;

  update public.corporate_ad_requests
  set status='paid', updated_at=now()
  where id=v_request.id;

  insert into public.corporate_ad_campaigns(
    request_id, user_id, placement, starts_at, ends_at, status
  )
  values (
    v_request.id, v_request.user_id, v_request.placement,
    now(), now() + make_interval(days => v_request.duration_days), 'active'
  )
  on conflict (request_id) do update
    set starts_at=excluded.starts_at,
        ends_at=excluded.ends_at,
        status='active',
        updated_at=now()
  returning * into v_campaign;

  update public.corporate_ad_requests
  set status='active', updated_at=now()
  where id=v_request.id;

  return jsonb_build_object(
    'status','active',
    'payment_id',v_payment.id,
    'request_id',v_request.id,
    'campaign_id',v_campaign.id
  );
end;
$$;

revoke all on function public.process_chargily_checkout_paid(text,text,uuid,numeric,text,text) from public, anon, authenticated;
-- The Edge Function uses the Supabase service role to call this function.
grant execute on function public.process_chargily_checkout_paid(text,text,uuid,numeric,text,text) to service_role;

-- Bind every Chargily checkout to the exact payment row that created it.
-- This closes the webhook correlation gap: webhook processing must never fall
-- back to an arbitrary pending payment for the same request.

alter table public.corporate_ad_payments
  add column if not exists checkout_creation_token uuid,
  add column if not exists checkout_creation_started_at timestamptz;

create unique index if not exists corporate_ad_payments_checkout_creation_token_uidx
  on public.corporate_ad_payments(checkout_creation_token)
  where checkout_creation_token is not null;

create or replace function public.prepare_chargily_checkout(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.corporate_ad_payments%rowtype;
  v_request public.corporate_ad_requests%rowtype;
  v_user uuid := auth.uid();
  v_token uuid;
  v_method text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_request
  from public.corporate_ad_requests
  where id = p_request_id and user_id = v_user
  for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'approved' then raise exception 'request_not_approved'; end if;

  select * into v_payment
  from public.corporate_ad_payments
  where request_id = v_request.id
    and user_id = v_user
    and payment_provider = 'chargily'
    and status = 'pending'
  order by created_at desc
  limit 1
  for update;
  if not found then raise exception 'pending_chargily_payment_not_found'; end if;

  if v_payment.provider_checkout_id is not null then
    return jsonb_build_object(
      'status','already_created',
      'payment_id',v_payment.id,
      'checkout_id',v_payment.provider_checkout_id
    );
  end if;

  if v_payment.checkout_creation_started_at is not null
     and v_payment.checkout_creation_started_at > now() - interval '10 minutes' then
    raise exception 'checkout_creation_in_progress';
  end if;

  v_token := gen_random_uuid();
  update public.corporate_ad_payments
  set checkout_creation_token = v_token,
      checkout_creation_started_at = now()
  where id = v_payment.id;

  v_method := case
    when v_payment.payment_method in ('edahabia','cib','chargily_app') then v_payment.payment_method
    else null
  end;

  return jsonb_build_object(
    'status','ready',
    'payment_id',v_payment.id,
    'request_id',v_request.id,
    'amount_dzd',v_payment.amount_dzd,
    'currency',lower(v_payment.currency),
    'payment_method',v_method,
    'creation_token',v_token
  );
end;
$$;

revoke all on function public.prepare_chargily_checkout(uuid) from public, anon;
grant execute on function public.prepare_chargily_checkout(uuid) to authenticated;

create or replace function public.bind_chargily_checkout(
  p_payment_id uuid,
  p_creation_token uuid,
  p_checkout_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.corporate_ad_payments%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if nullif(trim(p_checkout_id), '') is null then raise exception 'checkout_id_required'; end if;

  update public.corporate_ad_payments
  set provider_checkout_id = trim(p_checkout_id),
      checkout_creation_token = null,
      checkout_creation_started_at = null
  where id = p_payment_id
    and user_id = v_user
    and payment_provider = 'chargily'
    and status = 'pending'
    and checkout_creation_token = p_creation_token
  returning * into v_payment;

  if not found then raise exception 'checkout_binding_failed'; end if;

  return jsonb_build_object(
    'status','bound',
    'payment_id',v_payment.id,
    'checkout_id',v_payment.provider_checkout_id
  );
exception
  when unique_violation then
    raise exception 'checkout_id_already_bound';
end;
$$;

revoke all on function public.bind_chargily_checkout(uuid,uuid,text) from public, anon;
grant execute on function public.bind_chargily_checkout(uuid,uuid,text) to authenticated;

-- Reinstall the verified webhook RPC with strict checkout/payment correlation.
-- The checkout ID must already be stored on the exact payment row; request_id
-- alone is intentionally insufficient for provider-backed activation.
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
begin
  if nullif(trim(p_event_id), '') is null then raise exception 'event_id_required'; end if;
  if nullif(trim(p_checkout_id), '') is null then raise exception 'checkout_id_required'; end if;
  if p_currency is null or lower(trim(p_currency)) <> 'dzd' then raise exception 'invalid_currency'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;

  select * into v_payment
  from public.corporate_ad_payments
  where provider_event_id = p_event_id
     or provider_checkout_id = p_checkout_id
  order by case when provider_event_id = p_event_id then 0 else 1 end
  limit 1
  for update;

  if found and v_payment.status = 'paid' then
    if v_payment.provider_checkout_id <> trim(p_checkout_id)
       or v_payment.request_id <> p_request_id
       or v_payment.amount_dzd <> p_amount
       or lower(v_payment.currency) <> lower(trim(p_currency)) then
      raise exception 'paid_payment_mismatch';
    end if;
    return jsonb_build_object('status','already_paid','payment_id',v_payment.id,'request_id',v_payment.request_id);
  end if;

  if not found then raise exception 'checkout_not_bound'; end if;
  if v_payment.payment_provider <> 'chargily' then raise exception 'invalid_payment_provider'; end if;
  if v_payment.status <> 'pending' then raise exception 'invalid_payment_state'; end if;
  if v_payment.provider_checkout_id <> trim(p_checkout_id) then raise exception 'checkout_mismatch'; end if;
  if v_payment.request_id <> p_request_id then raise exception 'request_mismatch'; end if;
  if lower(v_payment.currency) <> lower(trim(p_currency)) then raise exception 'currency_mismatch'; end if;
  if v_payment.amount_dzd <> p_amount then raise exception 'amount_mismatch'; end if;

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
      provider_transaction_id=coalesce(provider_transaction_id, trim(p_checkout_id)),
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

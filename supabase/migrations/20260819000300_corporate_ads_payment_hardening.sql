-- Corporate Ads: follow-up hardening migration.
-- This migration intentionally has a unique timestamp so it runs after
-- the corporate-ad schema/admin workflow migrations.
-- It is safe to apply after the existing corporate-ad tables/functions exist.

create unique index if not exists corporate_ad_payments_one_live_per_request_idx
  on public.corporate_ad_payments(request_id)
  where status in ('pending','paid');

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
  select * into v_request
    from public.corporate_ad_requests
   where id = p_request_id;
  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'approved' then raise exception 'request_not_approved'; end if;
  if p_provider not in ('chargily','satim','manual') then raise exception 'invalid_provider'; end if;
  if p_method is not null and p_method not in ('cib','edahabia','qr','cash','other') then
    raise exception 'invalid_payment_method';
  end if;
  if exists (
    select 1 from public.corporate_ad_payments
     where request_id = p_request_id and status in ('pending','paid')
  ) then raise exception 'payment_already_exists'; end if;

  insert into public.corporate_ad_payments(
    request_id,user_id,amount_dzd,payment_provider,payment_method
  ) values (
    v_request.id,v_request.user_id,v_request.amount_dzd,p_provider,p_method
  )
  returning * into v_payment;

  return v_payment;
exception
  when unique_violation then
    raise exception 'payment_already_exists';
end;
$$;

revoke all on function public.admin_create_corporate_ad_payment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_create_corporate_ad_payment(uuid,text,text) to authenticated;

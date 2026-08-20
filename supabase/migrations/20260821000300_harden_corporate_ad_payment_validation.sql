-- Harden corporate-ad checkout validation without requiring a conflicted PR merge.
-- The payment provider and method are validated in the database, not only in the client.

create or replace function public.create_corporate_ad_checkout(
  p_request_id uuid,
  p_payment_provider text,
  p_payment_method text default null
) returns public.corporate_ad_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_request public.corporate_ad_requests%rowtype;
  v_payment public.corporate_ad_payments;
  v_provider text := lower(trim(coalesce(p_payment_provider, '')));
  v_method text := nullif(lower(trim(coalesce(p_payment_method, ''))), '');
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if v_provider not in ('chargily','satim','manual') then raise exception 'invalid_payment_provider'; end if;
  if v_method is not null and v_method not in ('cib','edahabia','qr','cash','other') then raise exception 'invalid_payment_method'; end if;

  select * into v_request
  from public.corporate_ad_requests
  where id = p_request_id and user_id = v_user
  for update;

  if not found then raise exception 'request_not_found'; end if;
  if v_request.status <> 'approved' then raise exception 'request_not_approved'; end if;

  if exists (
    select 1 from public.corporate_ad_payments
    where request_id = p_request_id and status in ('pending','paid')
  ) then raise exception 'payment_already_exists'; end if;

  insert into public.corporate_ad_payments(
    request_id, user_id, amount_dzd, payment_provider, payment_method
  ) values (
    v_request.id, v_user, v_request.amount_dzd, v_provider, v_method
  ) returning * into v_payment;

  return v_payment;
exception
  when unique_violation then raise exception 'payment_already_exists';
end;
$$;

revoke all on function public.create_corporate_ad_checkout(uuid,text,text) from public, anon;
grant execute on function public.create_corporate_ad_checkout(uuid,text,text) to authenticated;

create table if not exists public.corporate_ad_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null check (char_length(trim(company_name)) between 2 and 160),
  contact_name text not null check (char_length(trim(contact_name)) between 2 and 160),
  contact_email text not null,
  contact_phone text,
  ad_title text not null check (char_length(trim(ad_title)) between 2 and 160),
  ad_description text,
  destination_url text,
  placement text not null check (placement in ('listing_feed','homepage','top_banner','multi_placement')),
  plan text not null check (plan in ('starter','business','premium','enterprise')),
  duration_days integer not null check (duration_days in (7,15,21,30)),
  amount_dzd numeric(12,2) not null check (amount_dzd > 0),
  creative_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled','paid','active','completed')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.corporate_ad_campaigns (
  id uuid primary key default gen_random_uuid(), request_id uuid not null unique references public.corporate_ad_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  placement text not null check (placement in ('listing_feed','homepage','top_banner','multi_placement')),
  starts_at timestamptz, ends_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','active','paused','completed','cancelled')),
  impressions bigint not null default 0 check (impressions >= 0), clicks bigint not null default 0 check (clicks >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.corporate_ad_payments (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.corporate_ad_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_dzd numeric(12,2) not null check (amount_dzd > 0), currency text not null default 'DZD' check (currency = 'DZD'),
  payment_provider text not null check (payment_provider in ('chargily','satim','manual')),
  payment_method text check (payment_method in ('cib','edahabia','qr','cash','other')),
  provider_transaction_id text, provider_reference text,
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded')),
  paid_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.corporate_ad_plans (
  plan text primary key check (plan in ('starter','business','premium','enterprise')),
  duration_days integer not null check (duration_days in (7,15,21,30)), base_amount_dzd numeric(12,2) not null check (base_amount_dzd > 0),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.corporate_ad_plans(plan,duration_days,base_amount_dzd) values ('starter',7,5000),('business',15,9000),('premium',21,12000),('enterprise',30,15000)
on conflict (plan) do update set duration_days=excluded.duration_days, base_amount_dzd=excluded.base_amount_dzd, active=true, updated_at=now();
create index if not exists corporate_ad_requests_user_idx on public.corporate_ad_requests(user_id, created_at desc);
create index if not exists corporate_ad_requests_status_idx on public.corporate_ad_requests(status, created_at desc);
create index if not exists corporate_ad_campaigns_active_idx on public.corporate_ad_campaigns(status, starts_at, ends_at);
create index if not exists corporate_ad_payments_request_idx on public.corporate_ad_payments(request_id, created_at desc);
alter table public.corporate_ad_requests enable row level security;
alter table public.corporate_ad_campaigns enable row level security;
alter table public.corporate_ad_payments enable row level security;
alter table public.corporate_ad_plans enable row level security;
create policy corporate_ad_requests_select_own on public.corporate_ad_requests for select to authenticated using (user_id = auth.uid());
create policy corporate_ad_campaigns_select_own on public.corporate_ad_campaigns for select to authenticated using (user_id = auth.uid());
create policy corporate_ad_payments_select_own on public.corporate_ad_payments for select to authenticated using (user_id = auth.uid());
create policy corporate_ad_plans_read_active on public.corporate_ad_plans for select to authenticated using (active = true);
revoke all on public.corporate_ad_requests from anon, authenticated; grant select on public.corporate_ad_requests to authenticated;
revoke all on public.corporate_ad_campaigns from anon, authenticated; grant select on public.corporate_ad_campaigns to authenticated;
revoke all on public.corporate_ad_payments from anon, authenticated; grant select on public.corporate_ad_payments to authenticated;
revoke all on public.corporate_ad_plans from anon, authenticated; grant select on public.corporate_ad_plans to authenticated;
create or replace function public.create_corporate_ad_request(p_company_name text,p_contact_name text,p_contact_email text,p_contact_phone text,p_ad_title text,p_ad_description text,p_destination_url text,p_placement text,p_plan text,p_creative_url text)
returns public.corporate_ad_requests language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_plan public.corporate_ad_plans%rowtype; v_multiplier numeric:=case p_placement when 'homepage' then 2 when 'top_banner' then 1.5 when 'multi_placement' then 2.5 else 1 end; v_row public.corporate_ad_requests;
begin
 if v_user is null then raise exception 'not_authenticated'; end if;
 if p_placement not in ('listing_feed','homepage','top_banner','multi_placement') then raise exception 'invalid_placement'; end if;
 select * into v_plan from public.corporate_ad_plans where plan=p_plan and active=true; if not found then raise exception 'invalid_plan'; end if;
 insert into public.corporate_ad_requests(user_id,company_name,contact_name,contact_email,contact_phone,ad_title,ad_description,destination_url,placement,plan,duration_days,amount_dzd,creative_url)
 values(v_user,trim(p_company_name),trim(p_contact_name),lower(trim(p_contact_email)),nullif(trim(p_contact_phone),''),trim(p_ad_title),nullif(trim(p_ad_description),''),nullif(trim(p_destination_url),''),p_placement,p_plan,v_plan.duration_days,v_plan.base_amount_dzd*v_multiplier,nullif(trim(p_creative_url),'')) returning * into v_row;
 return v_row;
end; $$;
revoke all on function public.create_corporate_ad_request(text,text,text,text,text,text,text,text,text,text) from public,anon; grant execute on function public.create_corporate_ad_request(text,text,text,text,text,text,text,text,text,text) to authenticated;

create table build_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  budget numeric not null,
  currency text not null check (currency in ('PKR','USD','EUR','GBP','AED','INR')),
  usage_type text not null,
  ai_powered boolean not null default false,
  total numeric not null,
  client_region text,
  user_agent text
);

create table build_components (
  id uuid primary key default gen_random_uuid(),
  build_request_id uuid not null references build_requests(id) on delete cascade,
  category text not null,
  name text not null,
  price numeric not null,
  source text,
  reason text
);

create table pricing_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null,
  url text,
  enabled boolean not null default true,
  reliability_score numeric not null default 0.75,
  created_at timestamptz not null default now()
);

create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb
);

-- Budsjett: databaseoppsett for Supabase
-- Lim inn alt i Supabase → SQL Editor → Run. Kan kjøres flere ganger uten å ødelegge noe.

create table if not exists kategorier (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  navn text not null,
  budsjett numeric not null default 0,
  farge text not null default '#3B82F6',
  rekkefolge int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists utgifter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tittel text not null default '',
  belop numeric not null,
  kategori text not null,
  dato timestamptz not null default now()
);

create table if not exists faste_utgifter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tittel text not null,
  belop numeric not null,
  kategori text not null,
  er_bedrift boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists inntekter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tittel text not null,
  belop numeric not null,
  er_fast boolean not null default true,
  dato timestamptz not null default now()
);

create table if not exists mobiler (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  flipp_id int not null,
  navn text not null,
  kjopspris numeric not null,
  salgspris numeric,
  kjops_dato timestamptz not null default now(),
  salgs_dato timestamptz,
  profitt numeric,
  imei text,
  kjoper_navn text,
  selger_navn text,
  salgs_status text,
  kjops_status text,
  teleoutlet_ordre text,
  sendt_dato timestamptz,
  bilde text,
  unique (user_id, flipp_id)
);

create table if not exists bedrift_utgifter (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  navn text not null,
  pris numeric not null,
  dato timestamptz not null default now(),
  bilde text,
  med_mva boolean not null default true
);

create table if not exists kjoreturer (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dato timestamptz not null default now(),
  start_sted text not null default '',
  stopp_sted text not null default '',
  formal text not null default '',
  km numeric not null,
  imei_ref text
);

create table if not exists innstillinger (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  bedrift_kapital numeric not null default 30000,
  firmanavn text not null default 'Lamer Mobil',
  slagord text not null default 'Kjøp og salg av brukte iPhones',
  org_nr text not null default '',
  adresse text not null default '',
  postnr_sted text not null default '',
  telefon text not null default '',
  epost text
);

-- Sikkerhet: hver bruker ser og endrer bare sine egne rader
do $$
declare t text;
begin
  foreach t in array array['kategorier','utgifter','faste_utgifter','inntekter','mobiler','bedrift_utgifter','kjoreturer','innstillinger']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "egne rader" on %I', t);
    execute format('create index if not exists %I on %I (user_id)', t || '_user_idx', t);
    execute format('create policy "egne rader" on %I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

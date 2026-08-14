-- =========================================================
-- Mercato Digitale Comunale - schema database
-- Da eseguire nell'SQL Editor del progetto Supabase
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Tabella: operatori
-- ---------------------------------------------------------
create table if not exists public.operatori (
  id uuid primary key default gen_random_uuid(),
  codice_operatore text not null unique,
  nome text not null,
  cognome text not null,
  cf_piva text,
  telefono text,
  email text,
  settore text,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Tabella: mercati
-- Piazze/mercati fisici distinti gestiti dal Comune.
-- ---------------------------------------------------------
create table if not exists public.mercati (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  indirizzo text,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Tabella: bancarelle
-- ---------------------------------------------------------
create table if not exists public.bancarelle (
  id uuid primary key default gen_random_uuid(),
  id_posto text not null unique,
  stato text not null default 'libero' check (stato in ('libero', 'occupato', 'riservato')),
  tipologia text,
  superficie numeric,
  note text,
  geometry_geojson jsonb not null,
  mercato_id uuid references public.mercati(id),
  created_at timestamptz not null default now()
);

-- Da eseguire anche se la tabella bancarelle esiste già da prima di questa modifica:
alter table public.bancarelle add column if not exists mercato_id uuid references public.mercati(id);
create index if not exists idx_bancarelle_mercato on public.bancarelle(mercato_id);

-- ---------------------------------------------------------
-- Tabella: assegnazioni
-- ---------------------------------------------------------
create table if not exists public.assegnazioni (
  id uuid primary key default gen_random_uuid(),
  bancarella_id uuid not null references public.bancarelle(id) on delete cascade,
  operatore_id uuid not null references public.operatori(id) on delete cascade,
  data_mercato date not null,
  stato_pagamento text not null default 'non_pagato' check (stato_pagamento in ('pagato', 'non_pagato', 'in_attesa')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assegnazioni_bancarella on public.assegnazioni(bancarella_id);
create index if not exists idx_assegnazioni_operatore on public.assegnazioni(operatore_id);

-- ---------------------------------------------------------
-- Row Level Security
-- L'app richiede il login: solo gli utenti autenticati
-- (dipendenti comunali con account creato su Supabase Auth)
-- possono leggere e modificare i dati.
-- ---------------------------------------------------------
alter table public.operatori enable row level security;
alter table public.bancarelle enable row level security;
alter table public.assegnazioni enable row level security;
alter table public.mercati enable row level security;

create policy "Utenti autenticati - accesso completo operatori"
  on public.operatori for all
  to authenticated
  using (true)
  with check (true);

create policy "Utenti autenticati - accesso completo mercati"
  on public.mercati for all
  to authenticated
  using (true)
  with check (true);

create policy "Utenti autenticati - accesso completo bancarelle"
  on public.bancarelle for all
  to authenticated
  using (true)
  with check (true);

create policy "Utenti autenticati - accesso completo assegnazioni"
  on public.assegnazioni for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------
-- Dati di esempio (seed)
-- Coordinate di esempio su Piazza del Mercato fittizia:
-- SOSTITUIRE con le coordinate reali della piazza del proprio Comune.
-- ---------------------------------------------------------
insert into public.bancarelle (id_posto, stato, tipologia, superficie, note, geometry_geojson) values
  ('A-01', 'occupato',  'Alimentare',      12, 'Angolo nord della piazza', '{"type":"Point","coordinates":[12.4964,41.9028]}'),
  ('A-02', 'libero',    'Alimentare',      12, null,                       '{"type":"Point","coordinates":[12.4968,41.9028]}'),
  ('A-03', 'riservato', 'Abbigliamento',   15, 'Riservato per fiera speciale', '{"type":"Point","coordinates":[12.4972,41.9028]}'),
  ('B-01', 'occupato',  'Frutta e verdura',10, null,                       '{"type":"Point","coordinates":[12.4964,41.9024]}'),
  ('B-02', 'libero',    'Artigianato',     10, null,                       '{"type":"Point","coordinates":[12.4968,41.9024]}'),
  ('B-03', 'libero',    'Alimentare',      12, null,                       '{"type":"Point","coordinates":[12.4972,41.9024]}'),
  ('C-01', 'occupato',  'Fiori e piante',  8,  null,                       '{"type":"Point","coordinates":[12.4964,41.9020]}'),
  ('C-02', 'riservato', 'Abbigliamento',   14, null,                       '{"type":"Point","coordinates":[12.4968,41.9020]}')
on conflict (id_posto) do nothing;

insert into public.operatori (codice_operatore, nome, cognome, cf_piva, telefono, email, settore, note) values
  ('OP-0001', 'Mario',    'Rossi',   'RSSMRA80A01H501U', '333 1234567', 'mario.rossi@example.com',   'Alimentare',      null),
  ('OP-0002', 'Giulia',   'Bianchi', '01234567890',       '333 7654321', 'giulia.bianchi@example.com', 'Frutta e verdura', null),
  ('OP-0003', 'Luca',     'Verdi',   'VRDLCU75B15H501Z',  '333 1112223', 'luca.verdi@example.com',     'Fiori e piante',  null)
on conflict (codice_operatore) do nothing;

insert into public.assegnazioni (bancarella_id, operatore_id, data_mercato, stato_pagamento, note)
select b.id, o.id, current_date, 'pagato', null
from public.bancarelle b, public.operatori o
where b.id_posto = 'A-01' and o.codice_operatore = 'OP-0001'
on conflict do nothing;

insert into public.assegnazioni (bancarella_id, operatore_id, data_mercato, stato_pagamento, note)
select b.id, o.id, current_date, 'in_attesa', null
from public.bancarelle b, public.operatori o
where b.id_posto = 'B-01' and o.codice_operatore = 'OP-0002'
on conflict do nothing;

insert into public.assegnazioni (bancarella_id, operatore_id, data_mercato, stato_pagamento, note)
select b.id, o.id, current_date, 'pagato', null
from public.bancarelle b, public.operatori o
where b.id_posto = 'C-01' and o.codice_operatore = 'OP-0003'
on conflict do nothing;

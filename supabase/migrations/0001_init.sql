-- Hind demo schema. English identifiers, Swedish data values.
-- Permissive RLS (anon read/write) — DEMO ONLY, not production.

create table if not exists objekt (
  id text primary key,
  adress text not null,
  omrade text not null,
  rum int not null,
  boarea numeric not null,
  pris bigint not null,
  status text not null,
  hue int not null default 243,
  -- Outcome labels: null until the deal closes. Captured comms can later be
  -- joined to these to train prospect-fit prediction (the data/feedback loop).
  sald boolean not null default false,
  slutpris bigint,
  dagar_pa_marknaden int,
  created_at timestamptz not null default now()
);

create table if not exists speculant (
  id text primary key,
  objekt_id text references objekt(id) on delete cascade,
  namn text not null,
  telefon text,
  epost text,
  budget_min bigint,
  budget_max bigint,
  onskemal jsonb not null default '[]',
  invandningar jsonb not null default '[]',
  intresseniva text not null default 'medel',
  finansiering text not null default 'oklart',
  sammanfattning text,
  created_at timestamptz not null default now()
);

create table if not exists timeline_event (
  id text primary key,
  objekt_id text not null,
  speculant_id text,
  typ text not null,
  titel text not null,
  beskrivning text,
  occurred_at timestamptz not null default now(),
  synced boolean not null default false
);

create table if not exists next_step (
  id text primary key,
  objekt_id text,
  speculant_id text,
  beskrivning text not null,
  deadline timestamptz,
  prioritet text not null default 'medel',
  klar boolean not null default false
);

-- The capture record = tomorrow's training data.
create table if not exists debrief (
  id text primary key,
  objekt_id text,
  speculant_id text,
  transcript text,
  structured jsonb,
  audio_path text,
  created_at timestamptz not null default now()
);

-- Demo RLS: allow the anon role to do everything. DO NOT ship to production.
do $$
declare t text;
begin
  foreach t in array array['objekt','speculant','timeline_event','next_step','debrief']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists demo_all on %I;', t);
    execute format(
      'create policy demo_all on %I for all to anon using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ── Seed data (mirrors src/lib/seed.ts ids so live writes link cleanly) ──
insert into objekt (id, adress, omrade, rum, boarea, pris, status, hue) values
  ('obj_gotgatan',  'Götgatan 12',           'Södermalm, Stockholm',  2, 58,  4950000, 'budgivning', 250),
  ('obj_bergsund',  'Bergsunds strand 31',   'Hornstull, Stockholm',  3, 74,  6250000, 'till_salu',  205),
  ('obj_sigtuna',   'Sigtunagatan 6',        'Vasastan, Stockholm',   1, 38,  3295000, 'till_salu',  150),
  ('obj_kungsholm', 'Kungsholms strand 145', 'Kungsholmen, Stockholm',4, 102, 8900000, 'kommande',    32)
on conflict (id) do nothing;

insert into speculant (id, objekt_id, namn, telefon, epost, budget_min, budget_max, onskemal, invandningar, intresseniva, finansiering, sammanfattning) values
  ('spk_anna',  'obj_gotgatan', 'Anna Lindqvist', '070-412 88 19', 'anna.lindqvist@gmail.com', 4800000, 5200000,
    '["Balkong","Nära tunnelbana","Högt i tak"]', '["Köket behöver renoveras"]', 'hög', 'lånelöfte',
    'Mycket intresserad efter visningen. Lånelöfte klart upp till 5,2 mkr.'),
  ('spk_johan', 'obj_gotgatan', 'Johan Berg', '073-905 21 47', 'johan.berg@outlook.com', 4500000, 4950000,
    '["Lugnt läge","Hiss"]', '["Gatuplan – orolig för insyn","Vill se föreningens ekonomi"]', 'medel', 'kontant',
    'Kontantköpare, tveksam till läget på gatuplan. Har lagt ett första bud.'),
  ('spk_holm',  'obj_gotgatan', 'Sara Holm', '076-338 04 92', 'sara.holm@hotmail.com', null, 5100000,
    '["Nära förskola","Balkong","Två sovrum"]', '[]', 'hög', 'lånelöfte',
    'Barnfamilj som söker i området. Kommer på nästa visning.'),
  ('spk_erik',  'obj_bergsund', 'Erik Sandberg', '070-771 56 03', 'erik.sandberg@gmail.com', 5900000, 6400000,
    '["Vattennära","Öppen planlösning"]', '["Vill ha besiktning innan bud"]', 'medel', 'lånelöfte',
    'Gillar läget vid vattnet. Avvaktar besiktningsprotokoll.'),
  ('spk_petra', 'obj_bergsund', 'Petra Nyström', '072-118 77 40', 'petra.nystrom@gmail.com', null, null,
    '["Balkong i söderläge"]', '["Tveksam till månadsavgiften"]', 'låg', 'oklart',
    'Tidig i processen, vill se fler objekt först.'),
  ('spk_mikael','obj_sigtuna', 'Mikael Ek', '070-655 12 88', 'mikael.ek@gmail.com', 3000000, 3400000,
    '["Förstagångsköp","Låg insats"]', '[]', 'hög', 'lånelöfte',
    'Förstagångsköpare, redo att lägga bud vid rätt objekt.')
on conflict (id) do nothing;

insert into timeline_event (id, objekt_id, speculant_id, typ, titel, beskrivning, occurred_at, synced) values
  ('tl_g1','obj_gotgatan', null,       'visning','Visning – 9 besökare','Bra tryck. Tre tydligt intresserade.', now() - interval '2 day', true),
  ('tl_g2','obj_gotgatan','spk_anna',  'samtal', 'Samtal med Anna Lindqvist','Ringde efter visningen. Mycket intresserad.', now() - interval '2 day' + interval '1 hour', true),
  ('tl_g3','obj_gotgatan','spk_johan', 'mejl',   'Mejl från Johan Berg','Frågor om föreningens ekonomi.', now() - interval '1 day', true),
  ('tl_g4','obj_gotgatan','spk_johan', 'bud',    'Bud 4 850 000 kr','Första bud, 100 000 kr under utgångspris.', now() - interval '1 day' + interval '8 hour', true),
  ('tl_b1','obj_bergsund', null,       'visning','Visning – 6 besökare','Erik Sandberg stannade länge.', now() - interval '3 day', true),
  ('tl_s1','obj_sigtuna', 'spk_mikael','sms',    'SMS från Mikael Ek','Vill boka privatvisning på torsdag.', now() - interval '1 day', true)
on conflict (id) do nothing;

insert into next_step (id, objekt_id, speculant_id, beskrivning, deadline, prioritet, klar) values
  ('ns_anna',  'obj_gotgatan','spk_anna',  'Ring Anna Lindqvist – hon är nära bud', now() + interval '6 hour', 'hög', false),
  ('ns_johan', 'obj_gotgatan','spk_johan', 'Skicka föreningens årsredovisning till Johan Berg', now() + interval '3 hour', 'medel', false),
  ('ns_erik',  'obj_bergsund','spk_erik',  'Mejla besiktningsprotokoll till Erik Sandberg', now() + interval '1 day', 'hög', false),
  ('ns_mikael','obj_sigtuna', 'spk_mikael','Bekräfta privatvisning torsdag – Sigtunagatan 6', now() + interval '1 day', 'medel', false)
on conflict (id) do nothing;

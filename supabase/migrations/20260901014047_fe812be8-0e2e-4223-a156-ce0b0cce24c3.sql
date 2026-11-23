create table public.performances (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  exercicio text not null,
  carga_kg numeric,
  repeticoes integer,
  tempo text,
  distancia text,
  resultado text,
  data date not null default current_date,
  observacao text,
  created_at timestamptz not null default now()
);

create index performances_aluno_idx on public.performances (aluno_id, exercicio, data);

grant select, insert, update, delete on public.performances to authenticated;
grant all on public.performances to service_role;

alter table public.performances enable row level security;

create policy "performances_aluno_all"
on public.performances
for all
to authenticated
using (aluno_id in (select id from public.alunos where user_id = auth.uid()))
with check (aluno_id in (select id from public.alunos where user_id = auth.uid()));

create policy "performances_admin_read"
on public.performances
for select
to authenticated
using (private.is_admin());
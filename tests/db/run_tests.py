"""Testes das regras de reserva do Wine Barbell Club num Postgres local.

Usa o banco criado por fresh_db.sh (stub do Supabase + todas as migrations).
Cada ação de aluno roda como o papel `authenticated`, com auth.uid() do aluno,
igual ao app em produção.
"""
import sys
import threading
import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import psycopg2

DSN = "host=/tmp port=54329 user=postgres dbname=wbc"
BR = ZoneInfo("America/Sao_Paulo")
HOJE = datetime.now(BR).date()
resultados = []


def conn():
    c = psycopg2.connect(DSN)
    c.autocommit = True
    return c


ADMIN = conn()
with ADMIN.cursor() as cur:
    # Fixtures entram como service_role (passa pelas proteções de campos).
    cur.execute("select set_config('request.jwt.claim.role','service_role',false)")


def q(sql, args=()):
    with ADMIN.cursor() as cur:
        # Sem parâmetros, o SQL vai cru (permite rodar arquivos com '%').
        cur.execute(sql, args or None)
        try:
            return cur.fetchall()
        except psycopg2.ProgrammingError:
            return None


def novo_usuario(admin=False):
    uid = str(uuid.uuid4())
    q("insert into auth.users (id,email,raw_user_meta_data) values (%s,%s,%s)",
      (uid, f"{uid[:8]}@teste.local", '{"nome":"Teste"}'))
    if admin:
        q("insert into public.user_roles (user_id, role) values (%s,'admin') on conflict do nothing", (uid,))
    aluno = q("select id from public.alunos where user_id=%s", (uid,))
    return uid, (aluno[0][0] if aluno else None)


def plano(semana=None, mes=None, ilimitado=False):
    return q("""insert into public.planos (nome, limite_semanal, limite_mensal, ilimitado, ativo)
                values ('Plano teste', %s, %s, %s, true) returning id""", (semana, mes, ilimitado))[0][0]


def contrato(aluno, plano_id, vence, inicio=None):
    inicio = inicio or HOJE - timedelta(days=10)
    q("""insert into public.aluno_planos (aluno_id, plano_id, status, data_inicio, data_fim, proximo_vencimento)
         values (%s,%s,'ativo',%s,%s,%s)""", (aluno, plano_id, inicio, vence, vence))
    q("update public.alunos set plano_id=%s where id=%s", (plano_id, aluno))


MOD = q("insert into public.modalidades (nome) values ('LPO') returning id")[0][0]
MOD2 = q("insert into public.modalidades (nome) values ('Híbrido') returning id")[0][0]


def aula(dia, hora="18:00", vagas=10, modalidade=None):
    return q("""insert into public.horarios (modalidade_id, instrutor, data, horario, limite_vagas)
                values (%s,'Prof',%s,%s,%s) returning id""", (modalidade or MOD, dia, hora, vagas))[0][0]


def como_usuario(uid, sql, args=()):
    """Executa como o aluno (papel authenticated). Retorna (ok, mensagem, linhas afetadas)."""
    c = psycopg2.connect(DSN)
    try:
        with c.cursor() as cur:
            cur.execute("set role authenticated")
            cur.execute("select set_config('request.jwt.claim.sub',%s,false), "
                        "set_config('request.jwt.claim.role','authenticated',false)", (uid,))
            cur.execute(sql, args)
            n = cur.rowcount
        c.commit()
        return True, "", n
    except psycopg2.Error as e:
        c.rollback()
        return False, (e.pgerror or str(e)).strip().splitlines()[0], 0
    finally:
        c.close()


def reservar(uid, aluno, horario, extra=""):
    return como_usuario(uid, f"insert into public.reservas (aluno_id, horario_id{extra and ',' + extra.split('=')[0]}) "
                             f"values (%s,%s{extra and ',' + extra.split('=')[1]})", (aluno, horario))


def checar(nome, cond, detalhe=""):
    resultados.append((nome, cond, detalhe))
    print(("✔ " if cond else "✘ ") + nome + (f"  [{detalhe}]" if detalhe and not cond else ""))


# ── 1. Day Use em reserva nova ───────────────────────────────────────────
uid, al = novo_usuario()
q("insert into public.day_uses (aluno_id, status, validade) values (%s,'disponivel',%s)", (al, HOJE + timedelta(days=30)))
h = aula(HOJE + timedelta(days=3))
ok, msg, _ = reservar(uid, al, h)
du = q("select status, reserva_id is not null from public.day_uses where aluno_id=%s", (al,))
checar("1. Day Use libera reserva nova (sem plano)", ok and du[0] == ("reservado", True), msg)

# ── 2. Validade comparada com a data da aula ─────────────────────────────
uid, al = novo_usuario()
p = plano(semana=5)
contrato(al, p, vence=HOJE + timedelta(days=2))
ok, msg, _ = reservar(uid, al, aula(HOJE + timedelta(days=12)))
checar("2a. Plano que vence antes da aula é bloqueado", (not ok) and "PLAN_EXPIRED" in msg, msg)
ok, msg, _ = reservar(uid, al, aula(HOJE + timedelta(days=1)))
checar("2b. Aula antes do vencimento é liberada", ok, msg)
uid2, al2 = novo_usuario()
contrato(al2, p, vence=HOJE + timedelta(days=1))
ok, msg, _ = reservar(uid2, al2, aula(HOJE + timedelta(days=1)))
checar("2c. Aula no próprio dia do vencimento é liberada", ok, msg)

# ── 3. Limite mensal com reservas simultâneas ────────────────────────────
prox_mes = (HOJE.replace(day=1) + timedelta(days=32)).replace(day=1)
d1, d2 = prox_mes + timedelta(days=2), prox_mes + timedelta(days=16)
furos = 0
for _ in range(5):
    uid, al = novo_usuario()
    p = plano(mes=1)
    contrato(al, p, vence=prox_mes + timedelta(days=40))
    h1, h2 = aula(d1), aula(d2)
    res = []
    barreira = threading.Barrier(2)

    def tentar(hh):
        barreira.wait()
        res.append(reservar(uid, al, hh)[0])

    ts = [threading.Thread(target=tentar, args=(x,)) for x in (h1, h2)]
    [t.start() for t in ts]
    [t.join() for t in ts]
    total = q("select count(*) from public.reservas where aluno_id=%s and status='confirmada'", (al,))[0][0]
    if total > 1:
        furos += 1
checar("3. Limite mensal resiste a reservas simultâneas (5 tentativas)", furos == 0, f"{furos} furos")

# ── 4. Cancelamento ──────────────────────────────────────────────────────
uid, al = novo_usuario()
p = plano(ilimitado=True)
contrato(al, p, vence=HOJE + timedelta(days=60), inicio=HOJE - timedelta(days=30))
passada = aula(HOJE - timedelta(days=1))
r_passada = q("insert into public.reservas (aluno_id, horario_id) values (%s,%s) returning id", (al, passada))[0][0]
ok, msg, _ = como_usuario(uid, "update public.reservas set status='cancelada' where id=%s", (r_passada,))
checar("4a. Aluno não cancela aula que já passou", (not ok) and "CANCEL_NOT_ALLOWED" in msg, msg)
futura = aula(HOJE + timedelta(days=4))
r_fut = q("insert into public.reservas (aluno_id, horario_id) values (%s,%s) returning id", (al, futura))[0][0]
q("update public.reservas set presenca='presente' where id=%s", (r_fut,))
ok, msg, _ = como_usuario(uid, "update public.reservas set status='cancelada' where id=%s", (r_fut,))
checar("4b. Aluno não cancela reserva com presença marcada", (not ok) and "CANCEL_NOT_ALLOWED" in msg, msg)
futura2 = aula(HOJE + timedelta(days=5))
ok, _, _ = reservar(uid, al, futura2)
ok, msg, _ = como_usuario(uid, "update public.reservas set status='cancelada' where aluno_id=%s and horario_id=%s", (al, futura2))
checar("4c. Aluno cancela aula futura normalmente", ok, msg)
ok, msg, _ = como_usuario(uid, "update public.reservas set status='confirmada' where aluno_id=%s and horario_id=%s", (al, futura2))
checar("4d. Aluno reativa reserva cancelada de aula futura", ok, msg)

# ── 5. Reservar aula passada ─────────────────────────────────────────────
ok, msg, _ = reservar(uid, al, aula(HOJE - timedelta(days=2)))
checar("5. Aluno não reserva aula passada", (not ok) and "CLASS_ALREADY_STARTED" in msg, msg)

# ── 6. Apagar reserva ────────────────────────────────────────────────────
uid, al = novo_usuario()
q("insert into public.day_uses (aluno_id, status, validade) values (%s,'disponivel',%s)", (al, HOJE + timedelta(days=30)))
h = aula(HOJE + timedelta(days=6))
reservar(uid, al, h)
ok, msg, n = como_usuario(uid, "delete from public.reservas where aluno_id=%s", (al,))
existe = q("select count(*) from public.reservas where aluno_id=%s", (al,))[0][0]
checar("6a. Aluno não consegue apagar a própria reserva", existe == 1 and n == 0, msg)
q("delete from public.reservas where aluno_id=%s", (al,))
du = q("select status, reserva_id from public.day_uses where aluno_id=%s", (al,))[0]
checar("6b. Reserva apagada pela administração devolve o Day Use", du == ("disponivel", None), str(du))

# ── 7. Reserva já marcada como presente ──────────────────────────────────
uid, al = novo_usuario()
contrato(al, plano(ilimitado=True), vence=HOJE + timedelta(days=60))
h = aula(HOJE + timedelta(days=2))
ok, msg, _ = como_usuario(uid, """insert into public.reservas (aluno_id, horario_id, presenca, checkin_em)
                                  values (%s,%s,'presente', now())""", (al, h))
linha = q("select presenca, checkin_em from public.reservas where aluno_id=%s", (al,))
checar("7. Reserva criada pelo aluno nasce sem presença e sem check-in",
       ok and linha and linha[0] == ("pendente", None), f"{msg} {linha}")

# ── 9. Mesmo dia e horário ───────────────────────────────────────────────
dia = HOJE + timedelta(days=8)
reservar(uid, al, aula(dia, "07:00"))
ok, msg, _ = reservar(uid, al, aula(dia, "07:00", modalidade=MOD2))
checar("9. Duas aulas no mesmo dia e horário são bloqueadas no banco", (not ok) and "DUPLICATE_TIME_SLOT" in msg, msg)

# ── Regressão: o que já funcionava continua ──────────────────────────────
uid, al = novo_usuario()
contrato(al, plano(semana=2), vence=HOJE + timedelta(days=60))
seg = HOJE + timedelta(days=7 - HOJE.weekday() + 7)  # segunda da semana seguinte à próxima
reservar(uid, al, aula(seg, "06:00"))
reservar(uid, al, aula(seg + timedelta(days=1), "06:00"))
ok, msg, _ = reservar(uid, al, aula(seg + timedelta(days=2), "06:00"))
checar("R1. Limite semanal bloqueia a 3ª aula", (not ok) and "WEEKLY_PLAN_LIMIT_REACHED" in msg, msg)
cheia = aula(HOJE + timedelta(days=9), vagas=1)
u1, a1 = novo_usuario(); contrato(a1, plano(ilimitado=True), vence=HOJE + timedelta(days=60))
u2, a2 = novo_usuario(); contrato(a2, plano(ilimitado=True), vence=HOJE + timedelta(days=60))
reservar(u1, a1, cheia)
ok, msg, _ = reservar(u2, a2, cheia)
checar("R2. Turma lotada é bloqueada", (not ok) and "lotada" in msg, msg)
u3, a3 = novo_usuario()
ok, msg, _ = reservar(u3, a3, aula(HOJE + timedelta(days=3)))
checar("R3. Aluno sem plano e sem Day Use é bloqueado", (not ok) and "NO_ACTIVE_PLAN" in msg, msg)
agora = datetime.now(BR) + timedelta(hours=1)
h_ci = aula(agora.date(), agora.strftime("%H:%M"))
u4, a4 = novo_usuario(); contrato(a4, plano(ilimitado=True), vence=HOJE + timedelta(days=60))
reservar(u4, a4, h_ci)
ok, msg, _ = como_usuario(u4, "update public.reservas set checkin_em=now() where aluno_id=%s", (a4,))
checar("R4. Check-in dentro da janela continua funcionando", ok, msg)
ok, msg, _ = como_usuario(u4, "update public.reservas set presenca='presente' where aluno_id=%s", (a4,))
checar("R5. Aluno não marca a própria presença", not ok, msg)

# ── Renovação antecipada e troca de plano (regressão da v1.11.0) ─────────
adm_uid, _ = novo_usuario(admin=True)


def pendente(aluno, plano_id):
    return q("""insert into public.aluno_planos (aluno_id, plano_id, status, valor_centavos)
                values (%s,%s,'aguardando_pagamento', 10000) returning id""", (aluno, plano_id))[0][0]


def pagar(contrato_id):
    return como_usuario(adm_uid, "select public.registrar_pagamento_presencial(%s)", (contrato_id,))


uid, al = novo_usuario()
p_ren = plano(semana=5)
q("update public.planos set duracao_meses=1 where id=%s", (p_ren,))
venc_antigo = HOJE + timedelta(days=30)
contrato(al, p_ren, vence=venc_antigo, inicio=HOJE)
ok, msg, _ = reservar(uid, al, aula(HOJE + timedelta(days=4)))
checar("N1. Reserva antes da renovação", ok, msg)
ok, msg, _ = pagar(pendente(al, p_ren))
antigo = q("select status from public.aluno_planos where aluno_id=%s and data_inicio=%s", (al, HOJE))[0][0]
novo = q("select data_inicio from public.aluno_planos where aluno_id=%s and status='ativo' order by data_inicio desc limit 1", (al,))[0][0]
checar("N2. Renovação antecipada mantém o contrato atual ativo e começa no vencimento dele",
       ok and antigo == "ativo" and novo == venc_antigo, f"{msg} antigo={antigo} novo_inicio={novo}")
ok, msg, _ = reservar(uid, al, aula(HOJE + timedelta(days=5), "19:00"))
checar("N3. Depois de pagar a renovação, reserva no período atual continua liberada", ok, msg)
ok, msg, _ = reservar(uid, al, aula(venc_antigo + timedelta(days=3), "19:00"))
checar("N4. Reserva no período da renovação é liberada", ok, msg)

uid, al = novo_usuario()
p_a, p_b = plano(semana=5), plano(ilimitado=True)
contrato(al, p_a, vence=HOJE + timedelta(days=20), inicio=HOJE - timedelta(days=5))
ok, msg, _ = pagar(pendente(al, p_b))
st_a = q("select status from public.aluno_planos where aluno_id=%s and plano_id=%s", (al, p_a))[0][0]
ok2, msg2, _ = reservar(uid, al, aula(HOJE + timedelta(days=6), "20:00"))
checar("N5. Troca de plano encerra o antigo e o novo já vale hoje", ok and st_a == "cancelado" and ok2, f"{msg} {st_a} {msg2}")

# Reparo de quem já foi afetado: estado quebrado da v1.11.0 + rodar a migration de novo.
uid, al = novo_usuario()
p_r = plano(semana=5)
q("""insert into public.aluno_planos (aluno_id, plano_id, status, data_inicio, data_fim, proximo_vencimento)
     values (%s,%s,'cancelado',%s,%s,%s)""", (al, p_r, HOJE - timedelta(days=3), HOJE, HOJE + timedelta(days=27)))
q("""insert into public.aluno_planos (aluno_id, plano_id, status, data_inicio, data_fim, proximo_vencimento)
     values (%s,%s,'ativo',%s,%s,%s)""", (al, p_r, HOJE + timedelta(days=27), HOJE + timedelta(days=57), HOJE + timedelta(days=57)))
q("update public.alunos set plano_id=%s where id=%s", (p_r, al))
ok_antes, _, _ = reservar(uid, al, aula(HOJE + timedelta(days=2), "21:00"))
import pathlib
mig = pathlib.Path(__file__).resolve().parents[2] / "supabase/migrations/20261127000200_renovacao_antecipada.sql"
q(mig.read_text(encoding="utf-8"))
ok, msg, _ = reservar(uid, al, aula(HOJE + timedelta(days=2), "21:00"))
checar("N6. Migration repara aluno afetado (estava bloqueado e volta a reservar)", (not ok_antes) and ok, msg)

falhas = [r for r in resultados if not r[1]]
print(f"\n{len(resultados) - len(falhas)} de {len(resultados)} passaram")
sys.exit(1 if falhas else 0)

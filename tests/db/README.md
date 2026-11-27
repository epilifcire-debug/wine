# Testes das regras de reserva (banco)

Sobem um Postgres local que imita o Supabase, aplicam **todas** as migrations do zero
e testam as regras de reserva como um aluno real (papel `authenticated`).

```bash
# Postgres 16 local na porta 54329, socket em /tmp
tests/db/fresh_db.sh        # recria o banco "wbc" e aplica as migrations
python3 tests/db/run_tests.py   # precisa de: pip install psycopg2-binary
```

Cobre: Day Use em reserva nova, validade pela data da aula, limite mensal com reservas
simultâneas, cancelamento de aula passada/com presença, reserva de aula passada,
exclusão pelo aluno, reserva já com presença, mesmo dia e horário, e regressões
(limite semanal, lotação, sem plano, check-in, presença).

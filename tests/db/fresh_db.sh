#!/bin/bash
# Recria um banco limpo e aplica o stub + todas as migrations do repositório, em ordem.
set -e
P="psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -q"
psql -h /tmp -p 54329 -U postgres -q -c "DROP DATABASE IF EXISTS wbc" -c "CREATE DATABASE wbc"
$P -d wbc -f "$(dirname "$0")/supabase_stub.sql" >/dev/null
for f in $(ls "$(dirname "$0")"/../../supabase/migrations/*.sql | sort); do
  if ! $P -d wbc -f "$f" >/tmp/mig.out 2>&1; then
    echo "FALHOU: $(basename $f)"; tail -5 /tmp/mig.out; exit 1
  fi
done
echo "OK: $(ls "$(dirname "$0")/../../supabase/migrations"/*.sql | wc -l) migrations aplicadas"

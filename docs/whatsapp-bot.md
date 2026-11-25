# Bot de WhatsApp — troca para o app novo

O bot roda numa VM no Oracle e guarda lá a sessão do WhatsApp. Ele **não acessa o
banco**: conversa com o app pelas rotas abaixo, sempre com o header
`x-bot-token: <WHATSAPP_BOT_TOKEN>`.

| Rota | Uso |
|---|---|
| `GET /api/public/whatsapp/health` | teste de conexão (responde `{"ok":true}`) |
| `GET /api/public/whatsapp/reservas?from=AAAA-MM-DD&to=AAAA-MM-DD` | reservas confirmadas do período |
| `POST /api/public/whatsapp/notificacoes` | registra o envio `{reserva_id, tipo: "confirmacao" \| "lembrete", telefone?}` |
| `GET /api/public/whatsapp/notificacoes/:reserva_id` | envios já feitos de uma reserva |
| `GET /api/public/whatsapp/oportunidades` | vagas da lista de espera |

**Enviar só uma vez:** `whatsapp_notifications` tem `UNIQUE (reserva_id, tipo)`.
O bot registra o envio; se já existir, recebe `409 {"duplicate": true}` e não reenvia.

## Passo a passo da troca (sem reconectar o WhatsApp)

1. Publicar o app novo (Shard) com a variável `WHATSAPP_BOT_TOKEN`
   (pode ser o mesmo valor usado hoje no Lovable).
2. Testar de qualquer terminal:
   ```bash
   curl -H "x-bot-token: SEU_TOKEN" https://SEU-DOMINIO/api/public/whatsapp/health
   ```
   Esperado: `{"ok":true}`.
3. Na VM do Oracle, trocar no `.env` do bot só o endereço do app
   (a variável que guarda a URL base do Wine) para o domínio novo.
   Não apagar a pasta da sessão do WhatsApp.
4. Reiniciar só o processo do bot (ex.: `pm2 restart <nome>` ou `docker restart <nome>`).
5. Fazer uma reserva de teste e conferir a mensagem de confirmação.

## Voltar atrás

Recolocar a URL antiga no `.env` do bot e reiniciar. A sessão do WhatsApp não muda.

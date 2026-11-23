export const BOT_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-bot-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function botJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...BOT_CORS },
  })
}

export function botPreflight() {
  return new Response(null, { status: 204, headers: BOT_CORS })
}

/** Valida o header x-bot-token contra o segredo server-side WHATSAPP_BOT_TOKEN. */
export function botAuthorized(request: Request) {
  const expected = process.env['WHATSAPP_BOT_TOKEN']
  if (!expected) return false
  const got = request.headers.get('x-bot-token') ?? ''
  if (got.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

export const botUnauthorized = () => botJson({ error: 'unauthorized' }, 401)

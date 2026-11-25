import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { botAuthorized, botJson, botPreflight, botUnauthorized } from '@/lib/whatsapp-bot'

const bodySchema = z.object({
  estado: z.enum(['conectado', 'desconectado', 'aguardando_qr']),
  qr: z.string().max(4000).optional().nullable(),
  numero: z.string().max(40).optional().nullable(),
})

/** O bot informa se está conectado e, quando precisa, o QR Code para reconectar. */
export const Route = createFileRoute('/api/public/whatsapp/status')({
  server: {
    handlers: {
      OPTIONS: async () => botPreflight(),
      POST: async ({ request }) => {
        if (!botAuthorized(request)) return botUnauthorized()
        let raw: unknown
        try {
          raw = await request.json()
        } catch {
          return botJson({ error: 'invalid json' }, 400)
        }
        const parsed = bodySchema.safeParse(raw)
        if (!parsed.success) return botJson({ error: 'invalid body' }, 400)

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { estado, qr, numero } = parsed.data
        const { error } = await supabaseAdmin.from('whatsapp_bot_status' as never).upsert({
          id: 1,
          estado,
          qr: estado === 'aguardando_qr' ? (qr ?? null) : null,
          ...(numero !== undefined ? { numero } : {}),
          atualizado_em: new Date().toISOString(),
        } as never)
        if (error) return botJson({ error: error.message }, 500)
        return botJson({ ok: true })
      },
    },
  },
})

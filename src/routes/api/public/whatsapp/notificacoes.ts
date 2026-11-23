import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { botAuthorized, botJson, botPreflight, botUnauthorized } from '@/lib/whatsapp-bot'

const bodySchema = z.object({
  reserva_id: z.string().uuid(),
  tipo: z.enum(['confirmacao', 'lembrete']),
  telefone: z.string().min(5).max(30).optional(),
})

export const Route = createFileRoute('/api/public/whatsapp/notificacoes')({
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

        const { data, error } = await supabaseAdmin
          .from('whatsapp_notifications')
          .insert({
            reserva_id: parsed.data.reserva_id,
            tipo: parsed.data.tipo,
            telefone: parsed.data.telefone ?? null,
          })
          .select('tipo, enviado_em, telefone')
          .single()

        if (error) {
          if (error.code === '23505') {
            const { data: existing } = await supabaseAdmin
              .from('whatsapp_notifications')
              .select('tipo, enviado_em, telefone')
              .eq('reserva_id', parsed.data.reserva_id)
              .eq('tipo', parsed.data.tipo)
              .maybeSingle()
            return botJson({ duplicate: true, notificacao: existing ?? null }, 409)
          }
          return botJson({ error: error.message }, 500)
        }

        return botJson({ duplicate: false, notificacao: data }, 201)
      },
    },
  },
})

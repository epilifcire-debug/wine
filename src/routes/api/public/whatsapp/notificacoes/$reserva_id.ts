import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { botAuthorized, botJson, botPreflight, botUnauthorized } from '@/lib/whatsapp-bot'

export const Route = createFileRoute('/api/public/whatsapp/notificacoes/$reserva_id')({
  server: {
    handlers: {
      OPTIONS: async () => botPreflight(),
      GET: async ({ request, params }) => {
        if (!botAuthorized(request)) return botUnauthorized()

        const id = z.string().uuid().safeParse(params.reserva_id)
        if (!id.success) return botJson({ error: 'invalid reserva_id' }, 400)

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await supabaseAdmin
          .from('whatsapp_notifications')
          .select('tipo, enviado_em, telefone')
          .eq('reserva_id', id.data)

        if (error) return botJson({ error: error.message }, 500)
        return botJson({ notificacoes: data ?? [] })
      },
    },
  },
})

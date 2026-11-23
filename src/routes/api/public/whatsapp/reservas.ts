import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { botAuthorized, botJson, botPreflight, botUnauthorized } from '@/lib/whatsapp-bot'

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
})

export const Route = createFileRoute('/api/public/whatsapp/reservas')({
  server: {
    handlers: {
      OPTIONS: async () => botPreflight(),
      GET: async ({ request }) => {
        if (!botAuthorized(request)) return botUnauthorized()

        const url = new URL(request.url)
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
        if (!parsed.success) return botJson({ error: 'invalid query' }, 400)

        const today = new Date().toISOString().slice(0, 10)
        const from = parsed.data.from ?? today
        const to = parsed.data.to ?? from

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        const { data: horarios, error: hErr } = await supabaseAdmin
          .from('horarios')
          .select('id, data, horario, instrutor, cancelada, modalidades(nome)')
          .gte('data', from)
          .lte('data', to)
          .or('cancelada.is.null,cancelada.eq.false')
        if (hErr) return botJson({ error: hErr.message }, 500)

        const ids = (horarios ?? []).map((h) => h.id)
        if (ids.length === 0) return botJson({ reservas: [] })

        const { data: reservas, error: rErr } = await supabaseAdmin
          .from('reservas')
          .select('id, aluno_id, horario_id, status, created_at, updated_at, alunos(nome, telefone, whatsapp_optin)')
          .in('horario_id', ids)
          .eq('status', 'confirmada')
          .limit(parsed.data.limit)
        if (rErr) return botJson({ error: rErr.message }, 500)

        const byHorario = new Map((horarios ?? []).map((h) => [h.id, h]))

        return botJson({
          reservas: (reservas ?? []).map((r) => {
            const h = byHorario.get(r.horario_id)
            const aluno = r.alunos as { nome?: string; telefone?: string | null; whatsapp_optin?: boolean | null } | null
            const mod = h?.modalidades as { nome?: string } | null
            return {
              reserva_id: r.id,
              aluno_id: r.aluno_id,
              nome: aluno?.nome ?? null,
              telefone: aluno?.telefone ?? null,
              whatsapp_optin: aluno?.whatsapp_optin ?? null,
              data: h?.data ?? null,
              horario: h?.horario ?? null,
              modalidade: mod?.nome ?? null,
              instrutor: h?.instrutor ?? null,
              status: r.status,
              created_at: r.created_at,
              updated_at: r.updated_at,
            }
          }),
        })
      },
    },
  },
})

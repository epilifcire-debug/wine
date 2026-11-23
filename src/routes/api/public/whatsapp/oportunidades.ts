import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { botAuthorized, botJson, botPreflight, botUnauthorized } from '@/lib/whatsapp-bot'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
})

export const Route = createFileRoute('/api/public/whatsapp/oportunidades')({
  server: {
    handlers: {
      OPTIONS: async () => botPreflight(),
      GET: async ({ request }) => {
        if (!botAuthorized(request)) return botUnauthorized()

        const url = new URL(request.url)
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
        if (!parsed.success) return botJson({ error: 'invalid query' }, 400)

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data, error } = await supabaseAdmin
          .from('whatsapp_notifications')
          .select(
            'id, lista_espera_id, tipo, telefone, enviado_em, lista_espera!inner(status, oportunidade_em, oportunidade_expira_em, alunos(nome, whatsapp_optin), horarios(data, horario, instrutor, modalidades(nome)))',
          )
          .eq('tipo', 'oportunidade')
          .eq('lista_espera.status', 'oportunidade_disponivel')
          .gt('lista_espera.oportunidade_expira_em', new Date().toISOString())
          .order('enviado_em', { ascending: true })
          .limit(parsed.data.limit)

        if (error) return botJson({ error: error.message }, 500)

        return botJson({
          oportunidades: (data ?? []).map((registro) => {
            const espera = registro.lista_espera as {
              status?: string
              oportunidade_em?: string | null
              oportunidade_expira_em?: string | null
              alunos?: { nome?: string; whatsapp_optin?: boolean | null } | null
              horarios?: {
                data?: string
                horario?: string
                instrutor?: string
                modalidades?: { nome?: string } | null
              } | null
            } | null
            return {
              notificacao_id: registro.id,
              lista_espera_id: registro.lista_espera_id,
              telefone: registro.telefone,
              nome: espera?.alunos?.nome ?? null,
              whatsapp_optin: espera?.alunos?.whatsapp_optin ?? null,
              data: espera?.horarios?.data ?? null,
              horario: espera?.horarios?.horario ?? null,
              modalidade: espera?.horarios?.modalidades?.nome ?? null,
              instrutor: espera?.horarios?.instrutor ?? null,
              oportunidade_em: espera?.oportunidade_em ?? null,
              oportunidade_expira_em: espera?.oportunidade_expira_em ?? null,
            }
          }),
        })
      },
    },
  },
})
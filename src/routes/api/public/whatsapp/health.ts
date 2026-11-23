import { createFileRoute } from '@tanstack/react-router'
import { botAuthorized, botJson, botPreflight, botUnauthorized } from '@/lib/whatsapp-bot'

export const Route = createFileRoute('/api/public/whatsapp/health')({
  server: {
    handlers: {
      OPTIONS: async () => botPreflight(),
      GET: async ({ request }) => {
        if (!botAuthorized(request)) return botUnauthorized()
        return botJson({ ok: true })
      },
    },
  },
})

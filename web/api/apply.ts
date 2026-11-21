/**
 * Builder application form. Forwards one application to a Telegram chat through a bot, so applications land
 * where Orphic already talks to builders. Nothing is stored here.
 *
 * Env (Vercel project settings): APPLY_TG_TOKEN (bot token from BotFather), APPLY_TG_CHAT (chat id the bot
 * may message). Without them the route answers 503 and the page shows the Telegram fallback.
 */
export const config = { runtime: 'edge' }

type Body = { project?: string; contact?: string; kind?: string; size?: string; domain?: string; notes?: string }

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('method', { status: 405 })
  const token = process.env.APPLY_TG_TOKEN
  const chat = process.env.APPLY_TG_CHAT
  if (!token || !chat) return new Response('not configured', { status: 503 })

  let b: Body
  try {
    b = (await req.json()) as Body
  } catch {
    return new Response('bad json', { status: 400 })
  }
  const project = clean(b.project, 120)
  const contact = clean(b.contact, 120)
  if (project.length < 2 || contact.length < 3) return new Response('project and contact required', { status: 400 })

  const lines = [
    'Builder application',
    `Project: ${project}`,
    `Contact: ${contact}`,
    `Way in: ${clean(b.kind, 40) || '-'}`,
    `Size: ${clean(b.size, 40) || '-'}`,
    `Domain: ${clean(b.domain, 160) || '-'}`,
    `Notes: ${clean(b.notes, 1200) || '-'}`,
    `From: ${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '-'} at ${new Date().toISOString()}`,
  ]
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: lines.join('\n'), disable_web_page_preview: true }),
  })
  if (!r.ok) return new Response('relay failed', { status: 502 })
  return new Response('ok', { status: 200 })
}

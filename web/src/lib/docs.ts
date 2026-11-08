import { marked, type Tokens } from 'marked'

export interface DocPage {
  slug: string
  title: string
  order: number
  html: string
}

const files = import.meta.glob('../../docs-content/*.md', { query: '?raw', eager: true, import: 'default' }) as Record<string, string>

/** Minimal frontmatter: a leading `---` block of `key: value` lines. */
function parseFrontmatter(src: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src)
  if (!m) return { meta: {}, body: src }
  const meta: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return { meta, body: src.slice(m[0].length) }
}

marked.use({
  gfm: true,
  renderer: {
    link({ href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens)
      const external = /^https?:\/\//i.test(href)
      const t = title ? ` title="${title}"` : ''
      return external ? `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>` : `<a href="${href}"${t}>${text}</a>`
    },
  },
})

export const docPages: DocPage[] = Object.entries(files)
  .map(([path, raw]) => {
    const file = path.split('/').pop() ?? path
    const slug = file.replace(/^\d+-/, '').replace(/\.md$/, '')
    const { meta, body } = parseFrontmatter(raw)
    return {
      slug,
      title: meta.title ?? slug,
      order: Number(meta.order ?? 999),
      html: marked.parse(body, { async: false }) as string,
    }
  })
  .sort((a, b) => a.order - b.order)

export function findDoc(slug: string | undefined): DocPage | undefined {
  return docPages.find((d) => d.slug === slug)
}

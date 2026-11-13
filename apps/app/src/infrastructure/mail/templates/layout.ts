export type RenderedMail = Readonly<{
  subject: string
  html: string
  text: string
}>

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "code"; text: string }
  | { kind: "button"; label: string; href: string }
  | { kind: "muted"; text: string }

/**
 * Minimal, client-safe HTML layout plus a matching plain-text version.
 * All dynamic values are escaped here.
 */
export function renderMail(
  lang: string,
  subject: string,
  blocks: Block[]
): RenderedMail {
  const htmlBlocks = blocks
    .map((block) => {
      switch (block.kind) {
        case "p":
          return `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(block.text)}</p>`
        case "muted":
          return `<p style="margin:0 0 16px;line-height:1.5;color:#6b7280;font-size:13px">${escapeHtml(block.text)}</p>`
        case "code":
          return `<p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;font-family:monospace">${escapeHtml(block.text)}</p>`
        case "button":
          return `<p style="margin:0 0 16px"><a href="${escapeHtml(block.href)}" style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;border-radius:6px;text-decoration:none">${escapeHtml(block.label)}</a></p><p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all">${escapeHtml(block.href)}</p>`
      }
    })
    .join("\n")

  const html = `<!doctype html><html lang="${escapeHtml(lang)}"><body style="margin:0;padding:24px;background:#f9fafb;font-family:system-ui,sans-serif;color:#111827"><div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px"><h1 style="margin:0 0 24px;font-size:20px">${escapeHtml(subject)}</h1>${htmlBlocks}</div></body></html>`

  const text = blocks
    .map((block) =>
      block.kind === "button" ? `${block.label}: ${block.href}` : block.text
    )
    .join("\n\n")

  return { subject, html, text }
}

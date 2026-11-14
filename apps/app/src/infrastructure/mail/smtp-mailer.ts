import { createTransport, type Transporter } from "nodemailer"

import type {
  Mailer,
  MailMessage,
} from "@/core/notifications/application/ports/mailer"

/** Local development: plain SMTP into Mailpit (UI on http://localhost:8026). */
export class SmtpMailer implements Mailer {
  readonly #transport: Transporter

  constructor(
    private readonly options: { host: string; port: number; from: string }
  ) {
    this.#transport = createTransport({
      host: options.host,
      port: options.port,
      secure: false,
    })
  }

  async send(message: MailMessage): Promise<void> {
    await this.#transport.sendMail({ from: this.options.from, ...message })
  }
}

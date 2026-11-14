import { Resend } from "resend"

import type {
  Mailer,
  MailMessage,
} from "@/core/notifications/application/ports/mailer"

/** Production: Resend API. The SDK does not throw, so errors are rethrown here. */
export class ResendMailer implements Mailer {
  readonly #client: Resend

  constructor(
    apiKey: string,
    private readonly from: string
  ) {
    this.#client = new Resend(apiKey)
  }

  async send(message: MailMessage): Promise<void> {
    const { error } = await this.#client.emails.send({
      from: this.from,
      ...message,
    })
    if (error) {
      throw new Error(`Resend: ${error.name}: ${error.message}`)
    }
  }
}

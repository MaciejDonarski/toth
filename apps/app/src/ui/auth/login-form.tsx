import Link from "next/link"

import { Button } from "@toth/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@toth/ui/components/field"
import { Input } from "@toth/ui/components/input"
import { cn } from "@toth/ui/lib/utils"

function LoginForm({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-heading text-2xl font-bold">Zaloguj się</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Podaj email i hasło, aby zalogować się do panelu
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="jan@firma.pl"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Hasło</FieldLabel>
            {/* TODO: the /forgot-password route arrives in the password-reset stage. */}
            <Link
              href="/forgot-password"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Nie pamiętasz hasła?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field>
          <Button type="submit">Zaloguj</Button>
        </Field>
        <p className="text-center text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <Link href="/register" className="underline underline-offset-4">
            Zarejestruj firmę
          </Link>
        </p>
      </FieldGroup>
    </form>
  )
}

export { LoginForm }

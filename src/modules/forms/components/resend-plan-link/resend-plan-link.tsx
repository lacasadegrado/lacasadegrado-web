"use client";

import { Link2 } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

import { resendPlanLinkAction } from "../../lib/actions/plan.action";

/**
 * For whoever already made a first payment and lost the link: a new one
 * goes to their email. The answer is the same whether or not the address
 * has a plan, so the page reveals nothing.
 */
export function ResendPlanLink({ slug }: { slug: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, startSending] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startSending(async () => {
      const result = await resendPlanLinkAction({ slug, email });
      setMessage(
        result.ok
          ? {
              ok: true,
              text: "Si ese correo tiene pagos registrados en este evento, te enviamos tu enlace. Revisa también la carpeta de spam.",
            }
          : { ok: false, text: result.message },
      );
    });
  }

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Link2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <h2 id={`${id}-title`} className="font-semibold">
            ¿Ya hiciste tu primer abono?
          </h2>
          <p className="text-sm text-muted-foreground">
            Usa el enlace que te enviamos por correo para pagar lo que falta. Si no lo encuentras, te
            mandamos uno nuevo.
          </p>
        </div>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor={`${id}-email`}>Tu correo</Label>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@correo.com"
          />
        </div>
        <Button type="submit" variant="outline" disabled={sending || email.trim() === ""}>
          {sending ? "Enviando…" : "Enviarme mi enlace"}
        </Button>
      </form>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm" : "text-sm font-medium text-destructive"}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}

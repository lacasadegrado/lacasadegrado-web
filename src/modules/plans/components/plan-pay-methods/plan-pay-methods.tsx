"use client";

import { MessageCircle } from "lucide-react";
import { useId } from "react";

import { CopyButton } from "@/common/components/copy-button/copy-button";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";
import type { PaymentMethod, PlanPaymentMethod } from "@/common/lib/db/schema";
import { PaymentDetails } from "@/modules/checkout/components/payment-details";
import type { PaymentAccounts } from "@/modules/checkout/lib/schemas/payment-account.schema";

import type { PlanContactMethodId } from "../../lib/constants/plans.constants";

type MethodOption<T extends string> = { id: T; label: string; description: string };

/** What to put in the report form after paying by contact; matches the flyer sent to customers. */
const CONTACT_REPORT_HINTS: Record<PlanContactMethodId, string> = {
  binance:
    "Cuando pagues, repórtalo abajo con el ID de la orden de Binance como referencia y la captura como comprobante.",
  cash: 'Cuando entregues el efectivo, repórtalo abajo: escribe "Efectivo" como referencia y sube una foto de los billetes como comprobante.',
};

type PlanPayMethodsProps = {
  /** Pago Móvil, transferencia: details here, reported with the form below. */
  methods: MethodOption<PaymentMethod>[];
  accounts: PaymentAccounts;
  /** Binance, efectivo: arranged by message, recorded by the admin. */
  contactMethods: readonly MethodOption<PlanContactMethodId>[];
  contact: { phone: string; whatsapp: string };
  /** End of the prefilled WhatsApp text: which package, who, which email. */
  contactAbout: string;
  /** Controlled: the report form below sends the same choice. */
  selected: PlanPaymentMethod | null;
  onSelect: (method: PlanPaymentMethod) => void;
};

/**
 * "Cómo pagar" on a package: the person picks a method and sees only what
 * that method needs. Bank methods show the receiving details; Binance and
 * efectivo show the number to ask for them. Every method is then reported
 * with the form below (cash: a photo of the bills), which stores the choice.
 */
export function PlanPayMethods({
  methods,
  accounts,
  contactMethods,
  contact,
  contactAbout,
  selected,
  onSelect,
}: PlanPayMethodsProps) {
  const id = useId();
  const manual = methods.find((method) => method.id === selected) ?? null;
  const byContact = contactMethods.find((method) => method.id === selected) ?? null;
  const options: MethodOption<string>[] = [...methods, ...contactMethods];

  return (
    <div className="space-y-4">
      <RadioGroup
        aria-label="Método de pago"
        value={selected ?? ""}
        onValueChange={(value) => onSelect(value as PlanPaymentMethod)}
        className="grid gap-2 sm:grid-cols-2"
      >
        {options.map((method) => {
          const itemId = `${id}-${method.id}`;
          return (
            <Label
              key={method.id}
              htmlFor={itemId}
              className="flex cursor-pointer items-center gap-3 rounded-md border p-3 font-normal has-data-[state=checked]:border-amber has-data-[state=checked]:ring-1 has-data-[state=checked]:ring-amber"
            >
              <RadioGroupItem id={itemId} value={method.id} />
              <span className="flex-1">
                <span className="block font-medium">{method.label}</span>
                <span className="block text-xs text-muted-foreground">{method.description}</span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>
      <div aria-live="polite">
        {manual ? (
          <div className="space-y-2">
            <h3 className="font-semibold">Datos para {manual.label}</h3>
            <PaymentDetails method={manual.id} accounts={accounts} amountVes={null} />
          </div>
        ) : byContact ? (
          <div className="space-y-3 rounded-md border p-4">
            <h3 className="font-semibold">Pagar con {byContact.label}</h3>
            <p className="text-sm">
              Solicita los datos al <strong className="tabular-nums">{contact.phone}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">{CONTACT_REPORT_HINTS[byContact.id]}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a
                  href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(`Hola, quiero pagar con ${byContact.label} ${contactAbout}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden="true" />
                  Escribir por WhatsApp
                </a>
              </Button>
              <CopyButton
                text={contact.phone.replace(/\D/g, "")}
                label="Copiar número"
                copiedLabel="Número copiado"
                variant="outline"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Elige cómo vas a pagar para ver los datos.</p>
        )}
      </div>
    </div>
  );
}

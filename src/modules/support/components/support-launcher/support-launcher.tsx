"use client";

import { useState } from "react";

import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";

import { logWhatsappContactAction } from "../../lib/actions/support.action";
import { SUPPORT_MESSAGES } from "../../lib/constants/support.constants";
import { useCurrentOrderId } from "../../lib/hooks/use-current-order-id.hook";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp.util";
import { SupportForm } from "./support-form";

/**
 * Persistent help entry point on signed-in pages (brief 5.6). Two paths,
 * both recorded as support_messages so nothing is lost. The order id is
 * attached automatically when the current page is about one order.
 */
export function SupportLauncher({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const orderId = useCurrentOrderId();
  const whatsappText = orderId
    ? SUPPORT_MESSAGES.order(email, orderId)
    : SUPPORT_MESSAGES.general(email);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="lg"
          className="fixed right-4 bottom-4 z-40 h-11 rounded-full px-5 shadow-[0_2px_12px_rgba(0,0,0,0.25)] sm:right-6 sm:bottom-6"
          aria-label="Ayuda y soporte"
        >
          Ayuda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Necesitas ayuda?</DialogTitle>
          <DialogDescription>
            {orderId
              ? `Estamos viendo tu pedido ${orderId.slice(0, 8).toUpperCase()}. Escríbenos por donde prefieras.`
              : "Escríbenos por donde prefieras. Respondemos en horario de oficina."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Button asChild variant="outline" className="h-11 w-full">
              <a
                href={buildWhatsAppUrl(whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void logWhatsappContactAction({ orderId });
                }}
              >
                Chatear por WhatsApp
              </a>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Se abre WhatsApp con un mensaje listo. Solo pulsa enviar.
            </p>
          </div>

          <div className="relative text-center text-xs text-muted-foreground">
            <span className="absolute inset-x-0 top-1/2 border-t" aria-hidden="true" />
            <span className="relative bg-background px-2">o envíanos un mensaje</span>
          </div>

          <SupportForm email={email} orderId={orderId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

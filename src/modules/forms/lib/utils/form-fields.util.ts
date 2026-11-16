import type { FormKind } from "@/common/lib/db/schema";

import { FORM_LIMITS } from "../constants/forms.constants";
import type { FormField } from "../types/form.types";

/** Id for a field the admin adds: "f_" plus 8 random hex characters. */
export function newFieldId(): string {
  return `f_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/**
 * What a new form starts with. A package form (sign-up): the person's
 * name, their email and the package; they pay it later from "Pagos". A
 * general form: the email and the person's name; the admin adds the rest.
 * Every field starts required.
 */
export function createDefaultFormFields(kind: FormKind = "package_payment"): FormField[] {
  if (kind === "general") {
    return [
      {
        id: "email",
        system: "email",
        type: "email",
        label: "Correo electrónico",
        helpText: "Usa el mismo correo con el que entrarás a ver tus fotos.",
        required: true,
      },
      {
        id: newFieldId(),
        type: "short_text",
        label: "Nombre y apellido",
        required: true,
        minLength: 3,
        maxLength: 120,
        personName: true,
      },
    ];
  }
  return [
    {
      id: newFieldId(),
      type: "short_text",
      label: "Nombre y apellido del graduando",
      required: true,
      minLength: 3,
      maxLength: 120,
      personName: true,
    },
    {
      id: "email",
      system: "email",
      type: "email",
      label: "Correo electrónico",
      helpText: "Te enviaremos un código a este correo para entrar a tus pagos y, después, a tus fotos.",
      required: true,
    },
    {
      id: "package",
      system: "package",
      type: "package",
      label: "Paquete",
      required: true,
    },
  ];
}

/**
 * The default questions of every installment in "Pagos": the reference and
 * the proof. The admin can reword them and add more in Configuración ›
 * Formulario de pagos (`getPlanPaymentFields`); these apply until then.
 * Files go under the plan's form prefix like any form upload.
 */
export const PLAN_PAYMENT_FIELDS: FormField[] = [
    {
      id: "reference",
      system: "reference",
      type: "short_text",
      label: "Número de referencia del pago",
      helpText: "La referencia del Pago Móvil o la transferencia, el ID de la orden de Binance, o \"Efectivo\".",
      required: true,
      minLength: 4,
      maxLength: 60,
    },
    {
      id: "proof",
      system: "proof",
      type: "file",
      label: "Comprobante de pago",
      helpText: "Captura o PDF del pago. En efectivo, una foto de los billetes.",
      required: true,
      accept: "image_or_pdf",
      maxFiles: 1,
      maxSizeMb: FORM_LIMITS.maxFileMb,
    },
];

/** Types the admin can add; `package` exists only as the system field. */
export type AddableFieldType = Exclude<FormField["type"], "package">;

/** A new, optional field of the given type with sensible limits. */
export function createField(type: AddableFieldType): FormField {
  const base = { id: newFieldId(), label: "", required: false };
  switch (type) {
    case "short_text":
      return { ...base, type, maxLength: 200 };
    case "long_text":
      return { ...base, type, maxLength: 2000 };
    case "number":
      return { ...base, type };
    case "select":
    case "radio":
    case "checkboxes":
      return { ...base, type, options: ["Opción 1", "Opción 2"] };
    case "file":
      return { ...base, type, accept: "image_or_pdf", maxFiles: 1, maxSizeMb: FORM_LIMITS.maxFileMb };
    default:
      return { ...base, type };
  }
}

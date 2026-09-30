import { FORM_LIMITS } from "../constants/forms.constants";
import type { FormField } from "../types/form.types";

/** Id for a field the admin adds: "f_" plus 8 random hex characters. */
export function newFieldId(): string {
  return `f_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/**
 * What a new form starts with: the four system fields plus the person's
 * name, in the order someone reporting a payment would fill them.
 */
export function createDefaultFormFields(): FormField[] {
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
    },
    {
      id: "package",
      system: "package",
      type: "package",
      label: "Paquete que pagaste",
      required: true,
    },
    {
      id: "reference",
      system: "reference",
      type: "short_text",
      label: "Número de referencia del pago",
      helpText: "El número de confirmación del Pago Móvil o de la transferencia.",
      required: true,
      minLength: 4,
      maxLength: 60,
    },
    {
      id: "proof",
      system: "proof",
      type: "file",
      label: "Comprobante de pago",
      helpText: "Captura de pantalla o PDF del pago.",
      required: true,
      accept: "image_or_pdf",
      maxFiles: 1,
      maxSizeMb: FORM_LIMITS.maxFileMb,
    },
  ];
}

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

import type { FormStatus } from "@/common/lib/db/schema";

/** Every field type the builder offers. `package` is system-only. */
export const FORM_FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "id_number",
  "number",
  "date",
  "select",
  "radio",
  "checkboxes",
  "file",
  "package",
] as const;

export const FORM_FIELD_TYPE_LABELS: Record<(typeof FORM_FIELD_TYPES)[number], string> = {
  short_text: "Texto corto",
  long_text: "Texto largo",
  email: "Correo",
  phone: "Teléfono",
  id_number: "Cédula",
  number: "Número",
  date: "Fecha",
  select: "Lista desplegable",
  radio: "Opción única",
  checkboxes: "Casillas",
  file: "Archivo",
  package: "Paquete",
};

/**
 * Fields every form has, which the payment flow depends on. The admin can
 * reword and move them, never remove them or make them optional. Their id
 * is their role, so `answers.email` is always the email.
 */
export const FORM_SYSTEM_FIELDS = {
  email: "email",
  package: "package",
  reference: "short_text",
  proof: "file",
} as const;

export const FORM_LIMITS = {
  maxFields: 40,
  labelMax: 200,
  helpTextMax: 500,
  maxOptions: 50,
  optionMax: 200,
  shortTextMax: 500,
  longTextMax: 5000,
  /** Per file. Proofs are screenshots or PDFs. */
  maxFileMb: 10,
  maxFilesPerField: 5,
  titleMax: 150,
  descriptionMax: 2000,
} as const;

export const FORM_FILE_ACCEPT = {
  image: ["image/jpeg", "image/png", "image/webp"],
  pdf: ["application/pdf"],
  image_or_pdf: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
} as const;

export const FORM_FILE_ACCEPT_LABELS: Record<keyof typeof FORM_FILE_ACCEPT, string> = {
  image: "Imagen (JPG, PNG o WebP)",
  pdf: "PDF",
  image_or_pdf: "Imagen o PDF",
};

export const FORM_MESSAGES = {
  required: "Este campo es obligatorio.",
  invalid_option: "Elige una de las opciones.",
  invalid_package: "Elige un paquete de la lista.",
  invalid_phone: "Escribe un teléfono venezolano, por ejemplo 0414 1234567.",
  invalid_id_number: "Escribe la cédula con su letra, por ejemplo V-12345678.",
  invalid_number: "Escribe un número.",
  invalid_integer: "Escribe un número entero.",
  invalid_date: "Escribe una fecha válida.",
} as const;

export const FORMS_PATHS = {
  /** Public page, no login. */
  public: (slug: string) => `/f/${slug}`,
} as const;

export const FORM_STATUS_LABELS = {
  draft: "Borrador",
  open: "Abierto",
  closed: "Cerrado",
} as const satisfies Record<FormStatus, string>;

/** R2 prefix of every file sent through a public form. Server-only keys. */
export const FORM_UPLOAD_PREFIX = "forms";

export const FORM_UPLOAD = {
  /** A presigned PUT stays valid long enough for a 10 MB file on a slow line. */
  uploadUrlTtlSeconds: 10 * 60,
  /** Parallel uploads from one browser. */
  concurrency: 2,
} as const;

/** File extension used in the stored key, by accepted content type. */
export const FORM_FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Limits for anonymous visitors. Generous for a real person fixing a
 * mistake, tight enough that nobody fills the bucket or someone else's
 * inbox (every submission emails the address it was sent with).
 */
export const FORM_RATE_LIMITS = {
  uploadsPerIp: { max: 40, windowSeconds: 60 * 60 },
  submitsPerIp: { max: 10, windowSeconds: 60 * 60 },
  submitsPerEmailPerForm: { max: 5, windowSeconds: 60 * 60 },
  retentionSeconds: 24 * 60 * 60,
} as const;

/** Name of the hidden field that only bots fill in. */
export const FORM_HONEYPOT_FIELD = "website";

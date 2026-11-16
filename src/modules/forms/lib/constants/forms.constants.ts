import type { FormKind, FormStatus } from "@/common/lib/db/schema";

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
 * Fields the app itself reads (the email for receipts and tagging, the
 * package, reference and proof for Pagos › Paquetes). The admin can
 * reword, move and make them optional, never remove them. Their id is
 * their role, so `answers.email` is always the email. Which ones a form
 * has depends on its kind: FORM_KIND_SYSTEM_ROLES.
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
  /** Long enough for a whole graduating class pasted from a spreadsheet. */
  maxOptions: 1000,
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

export const PLAN_LIMITS = {
  /** Most parts a package price can be split into. */
  maxInstallments: 6,
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
 * Limits for anonymous visitors (signed-in admins have none). Per IP they
 * are generous on purpose: a whole class answers from the venue's Wi-Fi,
 * and Venezuelan mobile carriers share one IP among many phones (10 per
 * hour blocked a real event on 2026-11-10). The per-email limit is what
 * keeps anyone from filling someone else's inbox.
 */
export const FORM_RATE_LIMITS = {
  uploadsPerIp: { max: 200, windowSeconds: 60 * 60 },
  submitsPerIp: { max: 60, windowSeconds: 60 * 60 },
  submitsPerEmailPerForm: { max: 5, windowSeconds: 60 * 60 },
  retentionSeconds: 24 * 60 * 60,
} as const;

/** Name of the hidden field that only bots fill in. */
export const FORM_HONEYPOT_FIELD = "website";

/** System fields each kind of form has, every one exactly once. */
export const FORM_KIND_SYSTEM_ROLES = {
  package_payment: ["email", "package"],
  general: ["email"],
} as const satisfies Record<FormKind, readonly (keyof typeof FORM_SYSTEM_FIELDS)[]>;

export const FORM_KIND_LABELS = {
  package_payment: "Paquete",
  general: "General",
} as const satisfies Record<FormKind, string>;

export const FORM_KIND_DESCRIPTIONS = {
  package_payment:
    "Para inscribirse en un paquete: nombre, correo y paquete. Al enviarlo, la persona recibe un código, entra a su cuenta y paga sus cuotas desde Pagos.",
  general:
    "Para todo lo demás (tallas, asistencia, datos de contacto). Solo trae el correo; las respuestas se ven en el mismo formulario.",
} as const satisfies Record<FormKind, string>;

/** Field types that can hold the person's name, for the tagging suggestions. */
export const PERSON_NAME_FIELD_TYPES = ["short_text", "select", "radio"] as const;

/** Questions whose answer can show or hide later questions. */
export const CONDITION_SOURCE_TYPES = ["select", "radio", "checkboxes"] as const;

/** Above this many options the public page shows a searchable list. */
export const SEARCHABLE_SELECT_THRESHOLD = 12;

/**
 * Texts of the public form the admin can reword (each audience wants its
 * own tone: "Busca tu nombre" vs "Busque su nombre"). Empty = the default.
 * `kindDefaults` overrides `default` for a form kind; a null default means
 * the page builds the text itself (the success message names the email).
 */
export const FORM_TEXTS = {
  rosterTitle: { group: "roster", label: "Título de la búsqueda", max: 120, default: "Busca tu nombre" },
  rosterDescription: {
    group: "roster",
    label: "Texto bajo el título",
    max: 400,
    multiline: true,
    default: "Te mostramos los datos que ya tenemos tuyos para que los confirmes, corrijas lo que esté mal y completes lo que falte.",
  },
  rosterPlaceholder: { group: "roster", label: "Texto dentro del buscador", max: 120, default: "Escribe tu nombre y apellido…" },
  rosterNotListed: { group: "roster", label: "Botón para quien no está en la lista", max: 120, default: "No estoy en la lista" },
  rosterNoMatch: {
    group: "roster",
    label: "Cuando la búsqueda no encuentra el nombre",
    max: 200,
    default: "No aparece. Revisa cómo lo escribiste o usa «No estoy en la lista».",
  },
  rosterSelected: { group: "roster", label: "Antes del nombre elegido", max: 120, default: "Respondes como" },
  rosterNotListedSelected: {
    group: "roster",
    label: "Aviso al elegir que no está en la lista",
    max: 200,
    default: "No estás en la lista: llena tus datos abajo.",
  },
  noteFromList: {
    group: "notes",
    label: "Bajo un dato que vino del listado",
    max: 200,
    default: "Dato que tenemos de ti: revísalo y corrígelo si está mal.",
  },
  noteCorrected: { group: "notes", label: "Cuando la persona lo corrige", max: 200, default: "Lo corregiste. Gracias." },
  noteMissing: {
    group: "notes",
    label: "Cuando el listado no tiene el dato",
    max: 200,
    default: "No tenemos este dato: complétalo, por favor.",
  },
  submitLabel: {
    group: "submit",
    label: "Botón de envío",
    max: 60,
    default: "Enviar respuesta",
    kindDefaults: { package_payment: "Inscribirme" },
  },
  successTitle: {
    group: "submit",
    label: "Título después de enviar",
    max: 120,
    default: "Recibimos tu respuesta",
    kindDefaults: { package_payment: "¡Listo, te inscribiste!" },
  },
  successMessage: {
    group: "submit",
    label: "Mensaje después de enviar",
    max: 400,
    multiline: true,
    default: null,
    placeholder: "Si falta algún dato te escribimos al correo que dejaste.",
  },
} as const satisfies Record<
  string,
  {
    group: "roster" | "notes" | "submit";
    label: string;
    max: number;
    multiline?: boolean;
    default: string | null;
    kindDefaults?: Partial<Record<FormKind, string>>;
    placeholder?: string;
  }
>;

export type FormTextKey = keyof typeof FORM_TEXTS;

export const FORM_TEXT_GROUPS = {
  roster: { title: "Búsqueda del nombre", hint: "Solo se ven si el formulario usa un listado de personas." },
  notes: { title: "Avisos bajo cada dato del listado", hint: "Aparecen debajo de las preguntas que se llenan desde el listado." },
  submit: { title: "Envío", hint: "El botón y la pantalla que ve la persona al enviar." },
} as const;

/**
 * Key a question uses to prefill with the person's name from the list;
 * the other columns use their own keys, which can never be this one.
 */
export const ROSTER_NAME_COLUMN = "name";

/** Field types a list column can prefill; files and the package cannot. */
export const ROSTER_PREFILL_FIELD_TYPES = [
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
] as const;

export const ROSTER_LIMITS = {
  /** People per list. */
  maxEntries: 3000,
  /** Rows per import call, so each one stays under the 1 MB action body. */
  batchSize: 300,
  maxColumns: 40,
  labelMax: 120,
  nameMax: 200,
  cellMax: 500,
  rosterNameMax: 120,
} as const;

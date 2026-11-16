import type { FormKind, FormStatus } from "@/common/lib/db/schema";

import type { FormTexts } from "../schemas/form-texts.schema";
import type { FormField, FormPackageOption } from "./form.types";

/**
 * Everything the public page receives. No ids beyond the slug and the
 * package ids the select needs; nothing about other submissions.
 */
export type PublicForm = {
  slug: string;
  title: string;
  description: string | null;
  status: FormStatus;
  kind: FormKind;
  eventName: string;
  institution: string;
  /** YYYY-MM-DD, or null when the event has no date yet. */
  eventDate: string | null;
  fields: FormField[];
  packages: (FormPackageOption & { description: string | null })[];
  /** Latest EUR to VES rate, to show amounts in bolívares; null when none is stored. */
  eurToVes: number | null;
  /** People list to pick a name from, when the form prefills from one. */
  roster: { people: RosterPerson[] } | null;
  /** The admin's reworded texts; `formText` fills in the defaults. */
  texts: FormTexts;
};

/** A name to pick; `hint` tells two people with the same name apart. */
export type RosterPerson = { id: string; name: string; hint: string | null };

/** Starting answers for the person picked, by field id, and the linked questions the list leaves empty. */
export type RosterPrefill = { values: Record<string, unknown>; missing: string[] };

export type RosterPrefillResult = { ok: true; prefill: RosterPrefill } | { ok: false; message: string };

export type PrepareFormUploadResult =
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; message: string };

/**
 * After a package sign-up, how the page continues: already signed in with
 * that email (go to Pagos), a login code sent (show the code step), or the
 * code could not be sent (link to the login page).
 */
export type SignupContinuation =
  | { status: "signed_in" }
  | { status: "code_sent"; email: string; sentAt: number }
  | { status: "code_failed"; email: string; message: string }
  | { status: "none" };

export type SubmitFormResult =
  | { ok: true; receipt: SubmitReceipt; continuation: SignupContinuation }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** What the success screen shows; each part is null when that field was left empty. */
export type SubmitReceipt = {
  kind: FormKind;
  packageName: string | null;
  priceCents: number | null;
  reference: string | null;
  email: string | null;
  /** An installment paid from "Pagos". */
  plan: PlanReceipt | null;
  /** A package form: they signed up and pay from "Pagos". */
  signup: { installments: number; url: string } | null;
};

export type PlanReceipt = {
  /** Absolute link to "Pagos". */
  url: string;
  amountCents: number;
  eurToVes: number | null;
  installmentsCovered: number;
  installments: number;
  priceCents: number;
  /** Confirmed so far; this payment is still under review. */
  confirmedCents: number;
  /** Under review, including this payment. */
  pendingCents: number;
};

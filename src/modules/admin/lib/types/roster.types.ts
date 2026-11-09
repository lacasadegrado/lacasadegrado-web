import type { RosterColumn, RosterValues } from "@/modules/forms/lib/schemas/roster.schema";

export type AdminRosterSummary = {
  id: string;
  name: string;
  columns: RosterColumn[];
  entryCount: number;
  /** Forms that prefill from it. */
  formCount: number;
  sourceName: string | null;
  updatedAt: Date;
};

export type AdminRosterEntry = {
  id: string;
  name: string;
  values: RosterValues;
  /** Latest answer to a form linked to the list, if any. */
  answeredAt: Date | null;
};

export type AdminRosterDetail = Omit<AdminRosterSummary, "entryCount" | "formCount"> & {
  eventId: string;
  eventName: string;
  entries: AdminRosterEntry[];
  forms: { id: string; title: string }[];
};

/** What the builder needs to offer a list and its columns. */
export type RosterOption = { id: string; name: string; columns: RosterColumn[] };

export type RosterImportResult =
  | { ok: true; created: number; updated: number }
  | { ok: false; message: string };

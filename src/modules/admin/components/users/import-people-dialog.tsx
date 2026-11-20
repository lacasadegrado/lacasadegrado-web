"use client";

import { FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Checkbox } from "@/common/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { Textarea } from "@/common/components/ui/textarea";
import type { PlanPaymentMethod } from "@/common/lib/db/schema";
import { formatEur } from "@/common/lib/utils/money.util";
import { PLAN_PAYMENT_METHOD_IDS, PLAN_PAYMENT_METHOD_LABELS } from "@/modules/plans/lib/constants/plans.constants";
import { findHeaderRow, guessNameColumn, parseDelimited } from "@/modules/forms/lib/utils/roster.util";

import { importPeopleAction } from "../../lib/actions/people-import.action";
import { PEOPLE_IMPORT_BATCH } from "../../lib/schemas/people-import.schema";
import type { ImportPersonResult } from "../../lib/services/people-import.service";
import { readSheets, type Sheet } from "../../lib/utils/spreadsheet-file.util";

type EventOption = {
  id: string;
  name: string;
  packages: { id: string; name: string; priceCents: number; installments: number }[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_COLUMN = -1;

/** The column titled like an email, else the one whose cells look like emails. */
function guessEmailColumn(headers: string[], body: string[][]): number {
  const titled = headers.findIndex((header) => /correo|e-?mail|mail/i.test(header));
  if (titled >= 0) return titled;
  let best = 0;
  let bestCount = -1;
  headers.forEach((_, index) => {
    const hits = body.filter((row) => EMAIL_PATTERN.test((row[index] ?? "").trim())).length;
    if (hits > bestCount) {
      best = index;
      bestCount = hits;
    }
  });
  return best;
}

type PreviewPerson = { email: string; name: string; paid: number };

type Preview = {
  headers: string[];
  emailColumn: number;
  nameColumn: number;
  paidColumn: number;
  people: PreviewPerson[];
  invalid: string[];
  repeated: number;
  /** Rows whose "cuotas pagadas" is not a whole number the package allows. */
  badPaid: string[];
};

/** A column titled like "cuotas pagadas" / "abonos", else none. */
function guessPaidColumn(headers: string[], taken: number[]): number {
  const index = headers.findIndex((header, position) => !taken.includes(position) && /cuota|pagad|abono/i.test(header));
  return index >= 0 ? index : NO_COLUMN;
}

/** "2", "2 cuotas", "" (= 0). Null when it is not a count the package allows. */
function parsePaid(raw: string, maxInstallments: number): number | null {
  const text = raw.trim();
  if (!text) return 0;
  const match = /^(\d+)(\s*cuotas?)?$/i.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return value <= maxInstallments ? value : null;
}

function buildPreview(
  rows: string[][],
  columns: { email: number | null; name: number | null; paid: number | null },
  maxInstallments: number,
): Preview | null {
  const nonEmpty = rows.filter((row) => row.some((cell) => cell !== ""));
  if (nonEmpty.length < 2) return null;
  const headerIndex = findHeaderRow(nonEmpty);
  const body = nonEmpty.slice(headerIndex + 1);
  const width = Math.max(...nonEmpty.map((row) => row.length));
  const headers = Array.from({ length: width }, (_, index) => nonEmpty[headerIndex][index] || `Columna ${index + 1}`);
  const email = columns.email ?? guessEmailColumn(headers, body);
  const guessedName = guessNameColumn(headers);
  const name = columns.name ?? (guessedName === email ? NO_COLUMN : guessedName);
  const paidColumn = columns.paid ?? guessPaidColumn(headers, [email, name]);

  const byEmail = new Map<string, PreviewPerson>();
  const invalid: string[] = [];
  const badPaid: string[] = [];
  let repeated = 0;
  for (const row of body) {
    const raw = (row[email] ?? "").trim().toLowerCase();
    const personName = name === NO_COLUMN ? "" : (row[name] ?? "").trim();
    if (!EMAIL_PATTERN.test(raw)) {
      invalid.push(raw || personName || "(fila sin correo)");
      continue;
    }
    let paid = 0;
    if (paidColumn !== NO_COLUMN) {
      const parsed = parsePaid(row[paidColumn] ?? "", maxInstallments);
      if (parsed === null) badPaid.push(`${raw} («${row[paidColumn]}»)`);
      paid = parsed ?? 0;
    }
    const existing = byEmail.get(raw);
    if (existing) {
      repeated++;
      if (!existing.name) existing.name = personName;
      existing.paid = Math.max(existing.paid, paid);
    } else byEmail.set(raw, { email: raw, name: personName, paid });
  }
  return {
    headers,
    emailColumn: email,
    nameColumn: name,
    paidColumn,
    people: [...byEmail.values()],
    invalid,
    repeated,
    badPaid,
  };
}

/**
 * Personas › "Importar desde Excel": creates the accounts and signs each
 * person up for one package, no form needed. They log in with their email
 * and find the package in "Pagos". Read in the browser, sent in batches.
 */
export function ImportPeopleDialog({ events }: { events: EventOption[] }) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eventId, setEventId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [pasted, setPasted] = useState("");
  const [emailColumn, setEmailColumn] = useState<number | null>(null);
  const [nameColumn, setNameColumn] = useState<number | null>(null);
  const [paidColumn, setPaidColumn] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PlanPaymentMethod>("cash");
  const [notify, setNotify] = useState(true);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<ImportPersonResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const event = events.find((item) => item.id === eventId) ?? null;
  const pkg = event?.packages.find((item) => item.id === packageId) ?? null;
  const maxInstallments = Math.max(1, pkg?.installments ?? 1);
  const preview = useMemo(
    () =>
      sheets[sheetIndex]
        ? buildPreview(
            sheets[sheetIndex].rows,
            { email: emailColumn, name: nameColumn, paid: paidColumn },
            maxInstallments,
          )
        : null,
    [sheets, sheetIndex, emailColumn, nameColumn, paidColumn, maxInstallments],
  );
  const busy = reading || progress !== null;

  function reset() {
    setEventId("");
    setPackageId("");
    setSheets([]);
    setSheetIndex(0);
    setPasted("");
    setEmailColumn(null);
    setNameColumn(null);
    setPaidColumn(null);
    setNotify(true);
    setPaymentMethod("cash");
    setProgress(null);
    setResults(null);
    setMessage(null);
  }

  function loadRows(next: Sheet[]) {
    setSheets(next);
    setSheetIndex(0);
    setEmailColumn(null);
    setNameColumn(null);
    setPaidColumn(null);
    setResults(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setMessage(null);
    try {
      loadRows(await readSheets(file));
      setPasted("");
    } catch {
      setMessage("No pudimos leer el archivo. Usa un Excel (.xlsx) o un CSV.");
    } finally {
      setReading(false);
    }
  }

  async function runImport() {
    if (!preview || !pkg || !event) return;
    setMessage(null);
    const done: ImportPersonResult[] = [];
    for (let start = 0; start < preview.people.length; start += PEOPLE_IMPORT_BATCH) {
      const batch = preview.people.slice(start, start + PEOPLE_IMPORT_BATCH);
      setProgress(`Importando ${Math.min(start + batch.length, preview.people.length)} de ${preview.people.length}…`);
      const result = await importPeopleAction({
        eventId: event.id,
        packageId: pkg.id,
        notify,
        paymentMethod,
        people: batch.map((person) => ({
          email: person.email,
          name: person.name.slice(0, 160),
          paidInstallments: person.paid,
        })),
      });
      if (!result.ok) {
        setMessage(`${result.message} Se importaron ${done.length} antes del error.`);
        break;
      }
      done.push(...result.results);
      setResults([...done]);
    }
    setProgress(null);
    setResults(done);
    router.refresh();
  }

  const enrolled = results?.filter((row) => row.status === "enrolled").length ?? 0;
  const already = results?.filter((row) => row.status === "already").length ?? 0;
  const failed = results?.filter((row) => row.status === "failed") ?? [];
  const emailed = results?.filter((row) => row.emailed).length ?? 0;
  const recorded = results?.reduce((sum, row) => sum + row.recordedInstallments, 0) ?? 0;
  const fullyPaid = results?.filter((row) => row.paid).length ?? 0;
  const finished = results !== null && progress === null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <FileSpreadsheet aria-hidden="true" /> Importar desde Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar personas a un paquete</DialogTitle>
          <DialogDescription>
            Sube un Excel con el correo de cada persona (y si quieres su nombre y cuántas cuotas ya pagó). Se crean sus
            cuentas y quedan inscritas en el paquete con sus pagos: solo tienen que entrar con su correo y pagar lo que
            falte desde «Pagos». No hace falta formulario.
          </DialogDescription>
        </DialogHeader>

        {finished ? (
          <div className="space-y-4">
            <Alert role="status">
              <AlertDescription>
                Listo: {enrolled} persona{enrolled === 1 ? "" : "s"} inscrita{enrolled === 1 ? "" : "s"}
                {already > 0
                  ? `, ${already} ya estaba${already === 1 ? "" : "n"} inscrita${already === 1 ? "" : "s"}`
                  : ""}
                {notify ? ` · ${emailed} correo${emailed === 1 ? "" : "s"} enviado${emailed === 1 ? "" : "s"}` : ""}.
                {recorded > 0 ? (
                  <span className="mt-1 block">
                    Se {recorded === 1 ? "registró" : "registraron"} {recorded} cuota{recorded === 1 ? "" : "s"} ya
                    pagada{recorded === 1 ? "" : "s"}
                    {fullyPaid > 0
                      ? `; ${fullyPaid} paquete${fullyPaid === 1 ? " quedó pagado" : "s quedaron pagados"} completo${fullyPaid === 1 ? "" : "s"} y ya tiene${fullyPaid === 1 ? "" : "n"} su recibo`
                      : ""}
                    .
                  </span>
                ) : null}
              </AlertDescription>
            </Alert>
            {failed.length > 0 ? (
              <Alert role="alert">
                <AlertDescription>
                  <p className="font-medium">No se pudieron importar {failed.length}:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {failed.map((row) => (
                      <li key={row.email}>
                        {row.email}
                        {row.message ? ` (${row.message})` : ""}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            {message ? (
              <Alert role="alert">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-event`}>Evento</Label>
                <NativeSelect
                  id={`${id}-event`}
                  value={eventId}
                  disabled={busy}
                  onChange={(change) => {
                    setEventId(change.target.value);
                    const next = events.find((item) => item.id === change.target.value);
                    setPackageId(next?.packages.length === 1 ? next.packages[0].id : "");
                  }}
                >
                  <NativeSelectOption value="">Elige el evento</NativeSelectOption>
                  {events.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-package`}>Paquete</Label>
                <NativeSelect
                  id={`${id}-package`}
                  value={packageId}
                  disabled={busy || !event}
                  onChange={(change) => setPackageId(change.target.value)}
                >
                  <NativeSelectOption value="">Elige el paquete</NativeSelectOption>
                  {event?.packages.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.name} · {formatEur(item.priceCents)}
                      {item.installments > 1 ? ` en ${item.installments} cuotas` : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay paquetes activos. Crea el paquete en Eventos › Formularios primero.
              </p>
            ) : null}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-file`}>Archivo Excel o CSV</Label>
                <Input
                  id={`${id}-file`}
                  type="file"
                  accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  disabled={busy}
                  onChange={(change) => void onFile(change.target.files?.[0])}
                />
                {reading ? (
                  <p role="status" className="text-xs text-muted-foreground">
                    Leyendo el archivo…
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-paste`}>O pega las celdas</Label>
                <Textarea
                  id={`${id}-paste`}
                  rows={3}
                  value={pasted}
                  disabled={busy}
                  placeholder="Copia la tabla en Excel o Google Sheets (con los títulos) y pégala aquí"
                  onChange={(change) => {
                    setPasted(change.target.value);
                    loadRows(
                      change.target.value.trim() ? [{ name: "Pegado", rows: parseDelimited(change.target.value) }] : [],
                    );
                  }}
                />
              </div>
            </div>

            {sheets.length > 1 ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${id}-sheet`}>Hoja</Label>
                <NativeSelect
                  id={`${id}-sheet`}
                  value={String(sheetIndex)}
                  disabled={busy}
                  onChange={(change) => {
                    setSheetIndex(Number(change.target.value));
                    setEmailColumn(null);
                    setNameColumn(null);
                    setPaidColumn(null);
                  }}
                >
                  {sheets.map((sheet, index) => (
                    <NativeSelectOption key={sheet.name} value={String(index)}>
                      {sheet.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            ) : null}

            {sheets.length > 0 && !preview ? (
              <Alert role="alert">
                <AlertDescription>Esta hoja no tiene una tabla con títulos y al menos una persona.</AlertDescription>
              </Alert>
            ) : null}

            {preview ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-email-column`}>Columna con el correo</Label>
                    <NativeSelect
                      id={`${id}-email-column`}
                      value={String(preview.emailColumn)}
                      disabled={busy}
                      onChange={(change) => setEmailColumn(Number(change.target.value))}
                    >
                      {preview.headers.map((header, index) => (
                        <NativeSelectOption key={index} value={String(index)}>
                          {header}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-name-column`}>Columna con el nombre</Label>
                    <NativeSelect
                      id={`${id}-name-column`}
                      value={String(preview.nameColumn)}
                      disabled={busy}
                      onChange={(change) => setNameColumn(Number(change.target.value))}
                    >
                      <NativeSelectOption value={String(NO_COLUMN)}>Sin nombre</NativeSelectOption>
                      {preview.headers.map((header, index) => (
                        <NativeSelectOption key={index} value={String(index)}>
                          {header}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-paid-column`}>Columna con las cuotas ya pagadas</Label>
                    <NativeSelect
                      id={`${id}-paid-column`}
                      value={String(preview.paidColumn)}
                      disabled={busy}
                      onChange={(change) => setPaidColumn(Number(change.target.value))}
                    >
                      <NativeSelectOption value={String(NO_COLUMN)}>Ninguna (nadie ha pagado)</NativeSelectOption>
                      {preview.headers.map((header, index) => (
                        <NativeSelectOption key={index} value={String(index)}>
                          {header}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <p className="text-xs text-muted-foreground">
                      Un número por persona: cuántas cuotas pagó antes (0, 1, 2…). Se registran como pagos aprobados.
                    </p>
                  </div>
                  {preview.paidColumn !== NO_COLUMN ? (
                    <div className="space-y-1.5">
                      <Label htmlFor={`${id}-paid-method`}>Cómo pagaron esas cuotas</Label>
                      <NativeSelect
                        id={`${id}-paid-method`}
                        value={paymentMethod}
                        disabled={busy}
                        onChange={(change) => setPaymentMethod(change.target.value as PlanPaymentMethod)}
                      >
                        {PLAN_PAYMENT_METHOD_IDS.map((method) => (
                          <NativeSelectOption key={method} value={method}>
                            {PLAN_PAYMENT_METHOD_LABELS[method]}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>{preview.people.length}</strong> persona{preview.people.length === 1 ? "" : "s"} con correo
                    válido
                    {preview.repeated > 0
                      ? ` · ${preview.repeated} correo${preview.repeated === 1 ? "" : "s"} repetido${preview.repeated === 1 ? "" : "s"} se unieron`
                      : ""}
                  </p>
                  {preview.invalid.length > 0 ? (
                    <p className="text-sm text-destructive">
                      Se omiten {preview.invalid.length} fila{preview.invalid.length === 1 ? "" : "s"} sin un correo
                      válido: {preview.invalid.slice(0, 5).join(", ")}
                      {preview.invalid.length > 5 ? "…" : ""}
                    </p>
                  ) : null}
                  {preview.badPaid.length > 0 ? (
                    <p className="text-sm text-destructive">
                      {preview.badPaid.length} fila{preview.badPaid.length === 1 ? "" : "s"} con cuotas que no se
                      entienden se importan sin pagos: {preview.badPaid.slice(0, 3).join(", ")}
                      {preview.badPaid.length > 3 ? "…" : ""}. Usa un número del 0 al {pkg?.installments ?? 1}.
                    </p>
                  ) : null}
                  <div className="max-w-full overflow-x-auto rounded-md border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">Correo</th>
                          <th className="px-3 py-2 font-medium">Nombre</th>
                          {preview.paidColumn !== NO_COLUMN ? (
                            <th className="px-3 py-2 font-medium whitespace-nowrap">Cuotas pagadas</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.people.slice(0, 5).map((person) => (
                          <tr key={person.email} className="border-t">
                            <td className="px-3 py-2 whitespace-nowrap">{person.email}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{person.name || "—"}</td>
                            {preview.paidColumn !== NO_COLUMN ? (
                              <td className="px-3 py-2 tabular-nums">
                                {person.paid} de {pkg?.installments ?? 1}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.people.length > 5 ? (
                    <p className="text-xs text-muted-foreground">Mostrando 5 de {preview.people.length}.</p>
                  ) : null}
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`${id}-notify`}
                    checked={notify}
                    disabled={busy}
                    onCheckedChange={(checked) => setNotify(checked === true)}
                  />
                  <Label htmlFor={`${id}-notify`} className="leading-snug font-normal">
                    Enviar un correo a cada persona nueva avisando que ya puede entrar a pagar su paquete
                  </Label>
                </div>
              </>
            ) : null}

            {message ? (
              <Alert role="alert">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
            {finished ? "Cerrar" : "Cancelar"}
          </Button>
          {finished ? null : (
            <Button
              type="button"
              disabled={!preview || preview.people.length === 0 || !pkg || busy}
              onClick={() => void runImport()}
            >
              {progress ??
                (!pkg
                  ? "Elige el paquete"
                  : preview
                    ? `Importar ${preview.people.length} persona${preview.people.length === 1 ? "" : "s"}`
                    : "Importar")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

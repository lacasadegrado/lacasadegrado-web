"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
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
import { ROSTER_LIMITS } from "@/modules/forms/lib/constants/forms.constants";
import {
  findHeaderRow,
  guessNameColumn,
  isRowNumberHeader,
  parseDelimited,
  rosterNameKey,
} from "@/modules/forms/lib/utils/roster.util";

import { importRosterRowsAction, prepareRosterImportAction } from "../../lib/actions/roster.action";
import { readSheets, type Sheet } from "../../lib/utils/spreadsheet-file.util";

type RosterImportDialogProps = {
  eventId: string;
  /** Set to update an existing list; otherwise a new one is created. */
  roster?: { id: string; name: string };
};

type Preview = {
  headers: string[];
  nameColumn: number;
  candidateColumns: number[];
  /** Columns with at least one value; empty ones start unchecked. */
  filledColumns: Set<number>;
  people: { name: string; cells: string[] }[];
  merged: number;
  skipped: number;
};

/**
 * Header row, the columns (titled ones even if empty, so people can fill
 * them), and one person per name (repeats merged).
 */
function buildPreview(rows: string[][], nameColumn: number | null): Preview | null {
  const nonEmpty = rows.filter((row) => row.some((cell) => cell !== ""));
  if (nonEmpty.length < 2) return null;
  const headerIndex = findHeaderRow(nonEmpty);
  const body = nonEmpty.slice(headerIndex + 1);
  const width = Math.max(...nonEmpty.map((row) => row.length));
  const headers = Array.from({ length: width }, (_, index) => nonEmpty[headerIndex][index] || `Columna ${index + 1}`);
  const name = nameColumn ?? guessNameColumn(headers);

  const filledColumns = new Set(
    headers.map((_, index) => index).filter((index) => body.some((row) => (row[index] ?? "") !== "")),
  );
  const candidateColumns = headers
    .map((_, index) => index)
    .filter((index) => index !== name && (filledColumns.has(index) || Boolean(nonEmpty[headerIndex][index])));

  const byKey = new Map<string, { name: string; cells: string[] }>();
  let merged = 0;
  let skipped = 0;
  for (const row of body) {
    const person = (row[name] ?? "").trim();
    if (!person) {
      skipped++;
      continue;
    }
    const key = rosterNameKey(person);
    const cells = Array.from({ length: width }, (_, index) => row[index] ?? "");
    const existing = byKey.get(key);
    if (existing) {
      merged++;
      // Later rows fill what earlier ones left empty, like the import does.
      existing.cells = existing.cells.map((cell, index) => cells[index] || cell);
    } else byKey.set(key, { name: person, cells });
  }
  return { headers, nameColumn: name, candidateColumns, filledColumns, people: [...byKey.values()], merged, skipped };
}

/**
 * Imports a people list from an Excel or CSV file, or cells pasted from a
 * spreadsheet. Everything is read in the browser; only the chosen columns
 * go to the server, in batches. Existing people (same name) are updated.
 */
export function RosterImportDialog({ eventId, roster }: RosterImportDialogProps) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [nameColumn, setNameColumn] = useState<number | null>(null);
  // null = the default choice: every column with data except row numbers.
  const [chosen, setChosen] = useState<Set<number> | null>(null);
  const [listName, setListName] = useState(roster?.name ?? "");
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const preview = useMemo(
    () => (sheets[sheetIndex] ? buildPreview(sheets[sheetIndex].rows, nameColumn) : null),
    [sheets, sheetIndex, nameColumn],
  );
  const columns = preview
    ? preview.candidateColumns.filter((index) =>
        chosen ? chosen.has(index) : preview.filledColumns.has(index) && !isRowNumberHeader(preview.headers[index]),
      )
    : [];
  const busy = reading || progress !== null;

  function reset() {
    setSheets([]);
    setSheetIndex(0);
    setSourceName(null);
    setPasted("");
    setNameColumn(null);
    setChosen(null);
    setListName(roster?.name ?? "");
    setProgress(null);
    setMessage(null);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setMessage(null);
    try {
      const read = await readSheets(file);
      // Start on the sheet with the most filled rows (a summary sheet over an empty one).
      const best = read.reduce(
        (bestIndex, sheet, index, all) =>
          sheet.rows.filter((row) => row.some(Boolean)).length >
          all[bestIndex].rows.filter((row) => row.some(Boolean)).length
            ? index
            : bestIndex,
        0,
      );
      setSheets(read);
      setSheetIndex(best);
      setSourceName(file.name);
      setNameColumn(null);
      setChosen(null);
      if (!roster) setListName(file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setMessage({ ok: false, text: "No pudimos leer el archivo. Usa un Excel (.xlsx) o un CSV." });
    } finally {
      setReading(false);
    }
  }

  function onPaste(text: string) {
    setPasted(text);
    setSheets(text.trim() ? [{ name: "Pegado", rows: parseDelimited(text) }] : []);
    setSheetIndex(0);
    setSourceName(null);
    setNameColumn(null);
    setChosen(null);
  }

  function toggleColumn(index: number, include: boolean) {
    setChosen(new Set(include ? [...columns, index] : columns.filter((column) => column !== index)));
  }

  async function runImport() {
    if (!preview) return;
    setMessage(null);
    if (!roster && listName.trim().length < 2) {
      setMessage({ ok: false, text: "Ponle un nombre al listado." });
      return;
    }
    setProgress("Preparando el listado…");
    const prepared = await prepareRosterImportAction({
      eventId,
      rosterId: roster?.id,
      name: roster?.name ?? listName,
      labels: columns.map((index) => preview.headers[index]),
      sourceName,
    });
    if (!prepared.ok) {
      setProgress(null);
      setMessage({ ok: false, text: prepared.message });
      return;
    }

    let created = 0;
    let updated = 0;
    for (let start = 0; start < preview.people.length; start += ROSTER_LIMITS.batchSize) {
      const batch = preview.people.slice(start, start + ROSTER_LIMITS.batchSize);
      setProgress(`Guardando ${Math.min(start + batch.length, preview.people.length)} de ${preview.people.length}…`);
      const result = await importRosterRowsAction({
        rosterId: prepared.rosterId,
        rows: batch.map((person) => ({
          name: person.name.slice(0, ROSTER_LIMITS.nameMax),
          values: Object.fromEntries(
            columns.map((index, position) => [prepared.keys[position], person.cells[index].slice(0, ROSTER_LIMITS.cellMax)]),
          ),
        })),
      });
      if (!result.ok) {
        setProgress(null);
        setMessage({ ok: false, text: `${result.message} Se guardaron ${created + updated} antes del error.` });
        router.refresh();
        return;
      }
      created += result.created;
      updated += result.updated;
    }
    setProgress(null);
    setMessage({
      ok: true,
      text: `Listo: ${created} persona${created === 1 ? "" : "s"} nueva${created === 1 ? "" : "s"}${
        updated > 0 ? ` y ${updated} actualizada${updated === 1 ? "" : "s"}` : ""
      }.`,
    });
    router.refresh();
  }

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
        {roster ? (
          <Button type="button" variant="outline">
            <Upload aria-hidden="true" /> Actualizar desde archivo
          </Button>
        ) : (
          <Button type="button" size="sm">
            <FileSpreadsheet aria-hidden="true" /> Importar listado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{roster ? `Actualizar ${roster.name}` : "Importar listado de personas"}</DialogTitle>
          <DialogDescription>
            {roster
              ? "Las personas con el mismo nombre se actualizan con los datos nuevos (las celdas vacías no borran nada) y las demás se agregan."
              : "Sube el Excel o CSV de graduandos, tutores o coordinadores, o pega las celdas copiadas de la hoja. Cada persona podrá buscar su nombre en el formulario y verá sus datos ya llenos."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-file`}>Archivo Excel o CSV</Label>
              <Input
                id={`${id}-file`}
                type="file"
                accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={busy}
                onChange={(event) => void onFile(event.target.files?.[0])}
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
                onChange={(event) => onPaste(event.target.value)}
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
                onChange={(event) => {
                  setSheetIndex(Number(event.target.value));
                  setNameColumn(null);
                  setChosen(null);
                }}
              >
                {sheets.map((sheet, index) => (
                  <NativeSelectOption key={sheet.name} value={String(index)}>
                    {sheet.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Elige la hoja con una fila por persona (por ejemplo el resumen, no la de pagos).
              </p>
            </div>
          ) : null}

          {sheets.length > 0 && !preview ? (
            <Alert role="alert">
              <AlertDescription>Esta hoja no tiene una tabla con títulos y al menos una persona.</AlertDescription>
            </Alert>
          ) : null}

          {preview ? (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-name-column`}>Columna con el nombre</Label>
                  <NativeSelect
                    id={`${id}-name-column`}
                    value={String(preview.nameColumn)}
                    disabled={busy}
                    onChange={(event) => {
                      setNameColumn(Number(event.target.value));
                      setChosen(null);
                    }}
                  >
                    {preview.headers.map((header, index) => (
                      <NativeSelectOption key={index} value={String(index)}>
                        {header}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">Es lo que cada persona busca en el formulario.</p>
                </div>
                {roster ? null : (
                  <div className="space-y-1.5">
                    <Label htmlFor={`${id}-list-name`}>Nombre del listado</Label>
                    <Input
                      id={`${id}-list-name`}
                      value={listName}
                      maxLength={ROSTER_LIMITS.rosterNameMax}
                      disabled={busy}
                      placeholder="Graduandos UBA 2026-1"
                      onChange={(event) => setListName(event.target.value)}
                    />
                  </div>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Columnas a importar</legend>
                <p className="text-xs text-muted-foreground">
                  Marca también las vacías que quieras que cada persona complete (por ejemplo el teléfono).
                </p>
                {preview.candidateColumns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Solo hay nombres; no hay otras columnas con datos.</p>
                ) : (
                  <ul className="flex flex-wrap gap-x-5 gap-y-2">
                    {preview.candidateColumns.map((index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Checkbox
                          id={`${id}-col-${index}`}
                          checked={columns.includes(index)}
                          disabled={busy}
                          onCheckedChange={(checked) => toggleColumn(index, checked === true)}
                        />
                        <Label htmlFor={`${id}-col-${index}`} className="font-normal">
                          {preview.headers[index]}
                          {preview.filledColumns.has(index) ? null : (
                            <span className="text-muted-foreground"> (vacía)</span>
                          )}
                        </Label>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              <div className="space-y-2">
                <p className="text-sm">
                  <strong>{preview.people.length}</strong> persona{preview.people.length === 1 ? "" : "s"}
                  {preview.merged > 0
                    ? ` · ${preview.merged} fila${preview.merged === 1 ? "" : "s"} con un nombre repetido se unieron`
                    : ""}
                  {preview.skipped > 0
                    ? ` · ${preview.skipped} fila${preview.skipped === 1 ? "" : "s"} sin nombre se omiten`
                    : ""}
                </p>
                <div className="max-w-full overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">{preview.headers[preview.nameColumn]}</th>
                        {columns.map((index) => (
                          <th key={index} className="px-3 py-2 font-medium whitespace-nowrap">
                            {preview.headers[index]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.people.slice(0, 5).map((person) => (
                        <tr key={person.name} className="border-t">
                          <td className="px-3 py-2 whitespace-nowrap">{person.name}</td>
                          {columns.map((index) => (
                            <td key={index} className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                              {person.cells[index] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.people.length > 5 ? (
                  <p className="text-xs text-muted-foreground">Mostrando 5 de {preview.people.length}.</p>
                ) : null}
              </div>
            </>
          ) : null}

          {message ? (
            <Alert role={message.ok ? "status" : "alert"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
            {message?.ok ? "Cerrar" : "Cancelar"}
          </Button>
          {message?.ok ? null : (
            <Button type="button" disabled={!preview || preview.people.length === 0 || busy} onClick={() => void runImport()}>
              {progress ?? (preview ? `Importar ${preview.people.length} persona${preview.people.length === 1 ? "" : "s"}` : "Importar")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

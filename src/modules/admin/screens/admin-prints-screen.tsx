import { Badge } from "@/common/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { BUSINESS } from "@/common/lib/config/business.config";
import { formatDateTime } from "@/common/lib/utils/date.util";

import { MarkDeliveredButton } from "../components/prints/mark-delivered-button";
import { listPrintJobs } from "../lib/services/print.service";
import type { PrintJob } from "../lib/types/print.types";

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function JobsTable({ jobs, pending }: { jobs: PrintJob[]; pending: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Persona</TableHead>
            <TableHead>Institución</TableHead>
            <TableHead className="text-right">Impresas</TableHead>
            <TableHead>{pending ? "Pagado" : "Entregado"}</TableHead>
            <TableHead>{pending ? "Espera" : "Responsabilidad"}</TableHead>
            {pending ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const waited = daysSince(job.paidAt);
            const sinceDelivery = daysSince(job.printDeliveredAt);
            const late = pending && waited !== null && waited > BUSINESS.print.deliveryDays;
            const closed =
              !pending && sinceDelivery !== null && sinceDelivery > BUSINESS.print.responsibilityDays;
            return (
              <TableRow key={job.orderId}>
                <TableCell className="font-mono text-xs">{job.orderId.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell>
                  <p className="text-sm">{job.customerName ?? job.customerEmail}</p>
                  {job.customerName ? (
                    <p className="text-xs text-muted-foreground">{job.customerEmail}</p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <p className="text-sm">{job.institution}</p>
                  <p className="text-xs text-muted-foreground">{job.eventName}</p>
                </TableCell>
                <TableCell className="text-right tabular-nums">{job.printCount}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {pending
                    ? job.paidAt
                      ? formatDateTime(job.paidAt)
                      : "—"
                    : job.printDeliveredAt
                      ? formatDateTime(job.printDeliveredAt)
                      : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {pending ? (
                    <Badge variant={late ? "default" : "outline"}>
                      {waited === null ? "—" : `${waited} día${waited === 1 ? "" : "s"}`}
                    </Badge>
                  ) : (
                    <Badge variant={closed ? "outline" : "secondary"}>
                      {closed
                        ? "Cerrada"
                        : `${Math.max(0, BUSINESS.print.responsibilityDays - (sinceDelivery ?? 0))} días`}
                    </Badge>
                  )}
                </TableCell>
                {pending ? (
                  <TableCell className="text-right">
                    <MarkDeliveredButton
                      orderId={job.orderId}
                      institution={job.institution}
                      printCount={job.printCount}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export async function AdminPrintsScreen() {
  const jobs = await listPrintJobs();
  const pending = jobs.filter((job) => job.printStatus === "pending");
  const delivered = jobs.filter((job) => job.printStatus === "delivered");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Impresiones</h1>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Pedidos pagados con fotos impresas. Se entregan en la institución en unos{" "}
          {BUSINESS.print.deliveryDays} días; al marcar la entrega, la persona recibe un correo y
          empiezan a correr los {BUSINESS.print.responsibilityDays} días de responsabilidad.
        </p>
      </div>

      <section aria-labelledby="pending-heading" className="space-y-4">
        <h2 id="pending-heading" className="text-lg font-semibold">
          {pending.length === 0
            ? "Nada por entregar"
            : `${pending.length} por entregar`}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No hay impresiones pendientes. Aparecen aquí en cuanto apruebas un pago con fotos
            impresas.
          </p>
        ) : (
          <JobsTable jobs={pending} pending />
        )}
      </section>

      <section aria-labelledby="delivered-heading" className="space-y-4">
        <h2 id="delivered-heading" className="text-lg font-semibold">
          Entregadas
        </h2>
        {delivered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no has registrado entregas.</p>
        ) : (
          <JobsTable jobs={delivered} pending={false} />
        )}
      </section>
    </div>
  );
}

import { Badge } from "@/common/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { formatDateTime } from "@/common/lib/utils/date.util";
import { formatUsd } from "@/common/lib/utils/money.util";
import { ORDER_STATUS_LABELS } from "@/modules/orders/lib/constants/orders.constants";

import type { ReviewedPaymentItem } from "../../lib/types/payment-review.types";

export function RecentReviewsTable({ items }: { items: ReviewedPaymentItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Todavía no has revisado ningún pago.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cuándo</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Decisión</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.orderId}-${item.decidedAt.getTime()}`}>
              <TableCell className="whitespace-nowrap">{formatDateTime(item.decidedAt)}</TableCell>
              <TableCell className="font-mono text-xs">
                {item.orderId.slice(0, 8).toUpperCase()} · ref. {item.reference}
              </TableCell>
              <TableCell>{item.customerEmail}</TableCell>
              <TableCell className="text-right tabular-nums">{formatUsd(item.totalCents)}</TableCell>
              <TableCell>
                <Badge variant={item.rejectionReason ? "outline" : "default"}>
                  {item.rejectionReason ? "Rechazado" : ORDER_STATUS_LABELS.paid}
                </Badge>
                {item.rejectionReason ? (
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">{item.rejectionReason}</p>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

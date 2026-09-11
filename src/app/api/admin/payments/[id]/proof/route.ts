import { paymentProofHandler } from "@/modules/admin/lib/handlers/payment-proof.handler";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/payments/[id]/proof">,
) {
  const { id } = await context.params;
  return paymentProofHandler(id);
}

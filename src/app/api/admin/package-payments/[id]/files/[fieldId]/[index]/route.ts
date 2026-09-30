import { packagePaymentFileHandler } from "@/modules/admin/lib/handlers/package-payment-file.handler";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/admin/package-payments/[id]/files/[fieldId]/[index]">,
) {
  return packagePaymentFileHandler(await context.params);
}

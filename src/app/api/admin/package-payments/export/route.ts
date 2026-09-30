import { packagePaymentExportHandler } from "@/modules/admin/lib/handlers/package-payment-export.handler";

export async function GET(request: Request) {
  return packagePaymentExportHandler(request);
}

import { downloadAllHandler } from "@/modules/purchases/lib/handlers/download-all.handler";

export async function GET(request: Request) {
  return downloadAllHandler(request);
}

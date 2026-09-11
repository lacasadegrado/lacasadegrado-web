import { photoDownloadHandler } from "@/modules/purchases/lib/handlers/photo-download.handler";

export async function GET(request: Request, context: RouteContext<"/api/photos/[id]/download">) {
  const { id } = await context.params;
  return photoDownloadHandler(request, id);
}

import { photoPreviewHandler } from "@/modules/gallery/lib/handlers/photo-preview.handler";

export async function GET(_request: Request, context: RouteContext<"/api/photos/[id]/preview">) {
  const { id } = await context.params;
  return photoPreviewHandler(id);
}

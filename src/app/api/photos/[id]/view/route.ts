import { photoViewHandler } from "@/modules/purchases/lib/handlers/photo-view.handler";

export async function GET(_request: Request, context: RouteContext<"/api/photos/[id]/view">) {
  const { id } = await context.params;
  return photoViewHandler(id);
}

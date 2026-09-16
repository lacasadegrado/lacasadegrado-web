import { completeUploadHandler } from "@/modules/admin/lib/handlers/upload-photo.handler";

/** Step 2: the browser reports the PUT finished; previews and the row are created. */
export async function POST(request: Request) {
  return completeUploadHandler(request);
}

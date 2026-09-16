import { prepareUploadHandler } from "@/modules/admin/lib/handlers/upload-photo.handler";

/** Step 1: returns a presigned PUT URL. The file itself goes to R2. */
export async function POST(request: Request) {
  return prepareUploadHandler(request);
}

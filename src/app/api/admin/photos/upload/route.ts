import { uploadPhotoHandler } from "@/modules/admin/lib/handlers/upload-photo.handler";

export async function POST(request: Request) {
  return uploadPhotoHandler(request);
}

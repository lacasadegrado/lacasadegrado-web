export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export type AdminEvent = {
  id: string;
  name: string;
  institution: string;
  /** YYYY-MM-DD */
  eventDate: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  photoCount: number;
};

export type AdminPhotoTag = {
  id: string;
  email: string;
};

/**
 * What the admin UI sees for a photo. Deliberately has no storage keys:
 * previews are fetched through the gated preview route.
 */
export type AdminPhoto = {
  id: string;
  originalFilename: string;
  width: number;
  height: number;
  priceCents: number;
  createdAt: Date;
  tags: AdminPhotoTag[];
};

export type BulkTagResult = {
  added: number;
  alreadyTagged: number;
  unmatchedFilenames: string[];
  invalidLines: { line: number; reason: string }[];
};

export type BulkTagState =
  | { status: "idle" }
  | { status: "success"; result: BulkTagResult }
  | { status: "error"; message: string };

export type UploadResponse =
  | { ok: true; id: string; filename: string }
  | { ok: false; error: string };

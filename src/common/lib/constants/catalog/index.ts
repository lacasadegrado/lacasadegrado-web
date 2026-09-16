import type { PhotoFormat } from "@/common/lib/db/schema/enums.table";

/**
 * The two things a person can buy for one photo. Ordered as they are
 * offered: the digital file first, the print (which includes the file)
 * second. Prices for both live on the photo row.
 */
export const PHOTO_FORMATS: readonly PhotoFormat[] = ["digital", "print"];

export const PHOTO_FORMAT_LABELS: Record<PhotoFormat, string> = {
  digital: "Digital",
  print: "Impresa + digital",
};

export const PHOTO_FORMAT_SHORT_LABELS: Record<PhotoFormat, string> = {
  digital: "Digital",
  print: "Impresa",
};

export const PHOTO_FORMAT_DESCRIPTIONS: Record<PhotoFormat, string> = {
  digital: "Descarga en alta resolución, sin marca de agua.",
  print: "Foto impresa entregada en tu institución. Incluye la digital sin costo adicional.",
};

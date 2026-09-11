"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { cn } from "@/common/lib/utils/cn.util";

type PhotoLightboxProps = {
  /** Gated route URL; the caller decides which derivative the viewer may see. */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Accessible name for the trigger. */
  label?: string;
  className?: string;
};

/**
 * Eye button that opens the photo large, on black, fitted to the viewport.
 * The big image is only requested once the dialog opens. Place inside a
 * `relative` container; the trigger sits in its top-right corner.
 */
export function PhotoLightbox({
  src,
  alt,
  width,
  height,
  label = "Ver más grande",
  className,
}: PhotoLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "absolute top-2 right-2 z-10 inline-flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground ring-1 ring-border hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            className,
          )}
        >
          <Eye className="size-4" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[94vh] w-[min(96vw,1400px)] max-w-none overflow-hidden border-0 bg-black p-0 sm:max-w-none [&>button]:top-3 [&>button]:right-3 [&>button]:size-9 [&>button]:rounded-full [&>button]:bg-black/70 [&>button]:text-white [&>button]:opacity-100"
      >
        <DialogTitle className="sr-only">{alt || label}</DialogTitle>
        <div
          className="flex max-h-[94vh] items-center justify-center bg-black"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          {open ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              width={width}
              height={height}
              decoding="async"
              className="max-h-[94vh] w-auto max-w-full object-contain"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

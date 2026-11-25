import { Folder, FolderOpen, Images } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/common/lib/utils/cn.util";
import { PURCHASES_PATHS } from "@/modules/purchases/lib/constants/purchases.constants";

type FolderCardProps = {
  href: string;
  title: string;
  /** Second line, e.g. the email or the institution. */
  subtitle?: string;
  /** Third line, e.g. "12 fotos". */
  detail: string;
  /** Photo shown as the cover; null shows a folder icon. */
  coverPhotoId: string | null;
  /** Small labels under the text (badges). */
  children?: ReactNode;
  /** "attention" outlines the card in amber (e.g. photos still without a person). */
  tone?: "default" | "attention";
  icon?: "folder" | "all";
};

/**
 * A Drive-like folder: a cover photo and a name, the whole card is the
 * link. Server component; the cover goes through the admin view route.
 */
export function FolderCard({
  href,
  title,
  subtitle,
  detail,
  coverPhotoId,
  children,
  tone = "default",
  icon = "folder",
}: FolderCardProps) {
  const Icon = icon === "all" ? Images : coverPhotoId ? FolderOpen : Folder;

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-amber focus-visible:outline-none",
        tone === "attention" && "border-amber",
      )}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {coverPhotoId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={PURCHASES_PATHS.viewApi(coverPhotoId)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Icon aria-hidden="true" className="size-12" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="flex items-center gap-2 font-medium">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{title}</span>
        </p>
        {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
        <p className="text-sm text-muted-foreground">{detail}</p>
        {children ? <div className="mt-1 flex flex-wrap gap-1">{children}</div> : null}
      </div>
    </Link>
  );
}

export function photoCountLabel(count: number): string {
  return `${count} foto${count === 1 ? "" : "s"}`;
}

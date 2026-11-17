"use client";

import { Button } from "@/common/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/common/components/ui/sheet";

/** "Qué incluye": the package description the admin wrote, in a panel from the bottom. */
export function PackageDetailsSheet({ packageName, description }: { packageName: string; description: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="link" size="sm" className="h-auto p-0 font-semibold underline">
          Ver qué incluye
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <div className="mx-auto w-full max-w-lg space-y-3 p-5 pb-8">
          <SheetHeader className="p-0">
            <SheetTitle className="text-xl">{packageName}</SheetTitle>
            <SheetDescription>Esto es lo que incluye tu paquete.</SheetDescription>
          </SheetHeader>
          <p className="text-sm leading-relaxed whitespace-pre-line">{description}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

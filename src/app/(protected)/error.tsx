"use client";

import { ErrorScreen } from "@/common/components/error-screen";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen reset={reset} />;
}

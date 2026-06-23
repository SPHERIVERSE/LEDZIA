"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  // Fire up the background listener
  useOfflineSync();

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";
import { db } from "@/lib/db";
import { api } from "@/services/api";

export function useOfflineSync() {
  useEffect(() => {
    const syncData = async () => {
      // 1. Grab all pending records from local IndexedDB
      const pendingRecords = await db.syncQueue
        .where("status")
        .equals("pending")
        .toArray();

      if (pendingRecords.length === 0) return;

      console.log(`Attempting to sync ${pendingRecords.length} records...`);

      try {
        // 2. Push to the NestJS backend
        await api.post("/attendance/sync", { records: pendingRecords });

        // 3. If successful, clear them from the local sync queue 
        // (or mark them as 'synced' if you prefer to keep a local history)
        const recordIds = pendingRecords.map((r) => r.id!);
        await db.syncQueue.bulkDelete(recordIds);
        
        console.log("Background sync complete!");
      } catch (error) {
        console.error("Background sync failed. Will retry later.", error);
      }
    };

    // Listen for the browser firing the "online" event
    window.addEventListener("online", syncData);

    // Also attempt a sync immediately when the app loads, just in case
    // they reconnected while the app was closed.
    if (typeof window !== "undefined" && window.navigator.onLine) {
      syncData();
    }

    return () => {
      window.removeEventListener("online", syncData);
    };
  }, []);
}

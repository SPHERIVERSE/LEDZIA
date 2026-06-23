import Dexie, { Table } from 'dexie';

// Define the TypeScript interfaces for our local tables
export interface LocalStudent {
  id: string;
  name: string;
  email: string;
  subjectId: string; 
}

export interface SyncRecord {
  id?: number; // Auto-incremented by IndexedDB
  method: string;
  status: "pending" | "synced" | "failed";
  deviceTimestamp: string;

  // Make Teacher fields optional
  studentId?: string;
  subjectId?: string;
  isPresent?: boolean;

  // Make Student fields optional
  qrToken?: string;
}

export class AttendanceDatabase extends Dexie {
  roster!: Table<LocalStudent, string>; // string = primary key (student.id)
  syncQueue!: Table<SyncRecord, number>; // number = primary key (auto-increment)

  constructor() {
    super('AttendanceDB');
    
    // Define the schema. Only index the fields you plan to search/filter by.
    this.version(1).stores({
      roster: 'id, subjectId', 
      syncQueue: '++id, studentId, subjectId, status' 
    });
  }
}

export const db = new AttendanceDatabase();

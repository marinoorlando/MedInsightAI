
import Dexie, { type Table } from 'dexie';

export interface HistoryEvent {
  id?: number;
  timestamp: Date;
  module: string;
  action: string;
  inputSummary?: string;
  outputSummary?: string;
  details?: any;
}

export class AppDB extends Dexie {
  historyEvents!: Table<HistoryEvent>;

  constructor() {
    super('medinsight-history-db');
    this.version(1).stores({
      historyEvents: '++id, timestamp, module, action', // Define los índices
    });
  }
}

export const db = new AppDB();

export async function addHistoryEvent(event: Omit<HistoryEvent, 'id' | 'timestamp'>) {
  try {
    await db.historyEvents.add({
      ...event,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to add history event:", error);
  }
}

export async function getAllHistoryEvents(): Promise<HistoryEvent[]> {
  try {
    return await db.historyEvents.orderBy('timestamp').reverse().toArray();
  } catch (error) {
    console.error("Failed to get history events:", error);
    return [];
  }
}

export async function clearHistory() {
  try {
    await db.historyEvents.clear();
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

export async function importHistory(events: Partial<HistoryEvent>[], mode: 'replace' | 'append'): Promise<void> {
  try {
    const eventsToImport = events.map(event => ({
      ...event,
      id: undefined, // Ensure Dexie auto-generates IDs
      timestamp: new Date(event.timestamp || Date.now()), // Convert string timestamp to Date
    }));

    if (mode === 'replace') {
      await clearHistory();
    }
    await db.historyEvents.bulkAdd(eventsToImport as HistoryEvent[]);
  } catch (error) {
    console.error("Failed to import history events:", error);
    throw error; // Re-throw to be caught by the calling function for user notification
  }
}

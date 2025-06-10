
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
    // Podrías considerar notificar al usuario aquí si es crítico
  }
}

export async function getAllHistoryEvents() {
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

export type EventType = 'USER_ACTION' | 'SYSTEM_EVENT' | 'ERROR' | 'API_CALL';

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: EventType;
  action: string;
  details?: string;
}

const STORAGE_KEY = 'foundlab_audit_logs';
const MAX_LOGS = 1000;
const SERVER_URL = 'http://localhost:8000';

const sendToVeritas = async (logEntry: AuditEvent) => {
  try {
    // Generate a simple hash of the details for the data_hash field if not provided
    // In a real implementation, this would be a hash of the artifact/document
    const payload = {
        action: logEntry.action,
        data_hash: logEntry.id, 
        metadata: {
            type: logEntry.type,
            details: logEntry.details,
            client_timestamp: logEntry.timestamp
        }
    };

    await fetch(`${SERVER_URL}/veritas/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("Veritas Observer unreachable (Offline Mode active)", error);
  }
};

export const log = (type: EventType, action: string, details?: any) => {
  try {
    const existingLogs = getLogs();
    const newLog: AuditEvent = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      action,
      details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : undefined
    };
    
    // Prepend new log and limit size
    const updatedLogs = [newLog, ...existingLogs].slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));

    // Stream to Veritas Protocol
    sendToVeritas(newLog);
  } catch (e) {
    console.error("Failed to write audit log", e);
  }
};

export const getLogs = (): AuditEvent[] => {
  try {
    const logs = localStorage.getItem(STORAGE_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (e) {
    return [];
  }
};

export const clearLogs = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const exportLogs = () => {
  const logs = getLogs();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `foundlab_audit_trail_${Date.now()}.json`);
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
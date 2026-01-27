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
import React, { useEffect, useState } from 'react';
import { Activity, Download, Trash2, Clock, Terminal, AlertCircle, User } from 'lucide-react';
import * as auditService from '../services/auditService';
import { AuditEvent } from '../services/auditService';

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);

  const loadLogs = () => {
    setLogs(auditService.getLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the audit history? This cannot be undone.')) {
      auditService.clearLogs();
      loadLogs();
    }
  };

  const handleExport = () => {
    auditService.exportLogs();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'USER_ACTION': return <User size={14} className="text-blue-400" />;
      case 'ERROR': return <AlertCircle size={14} className="text-red-400" />;
      case 'SYSTEM_EVENT': return <Terminal size={14} className="text-purple-400" />;
      default: return <Activity size={14} className="text-slate-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'USER_ACTION': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ERROR': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'SYSTEM_EVENT': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3">
            <Activity className="text-brand-500" />
            System Audit Trail
          </h1>
          <p className="text-slate-400">Chronological record of user actions and system events for compliance review.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg border border-slate-700 transition-colors text-sm font-medium"
          >
            <Download size={16} />
            Export JSON
          </button>
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 px-4 py-2 rounded-lg border border-red-900/50 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Clear Log
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Event Type</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-2 w-fit ${getTypeColor(log.type)}`}>
                        {getTypeIcon(log.type)}
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 max-w-md truncate" title={log.details}>
                      {log.details || <span className="text-slate-600 italic">No details provided</span>}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Activity size={32} className="text-slate-700" />
                      <p>No audit records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
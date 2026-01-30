import React, { useEffect, useState } from 'react';
import { Activity, Download, Trash2, Clock, Terminal, AlertCircle, User, ShieldCheck } from 'lucide-react';
import * as auditService from '../services/auditService';
import { AuditEvent } from '../services/auditService';

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);

  const loadLogs = () => {
    setLogs(auditService.getLogs());
  };

  useEffect(() => {
    loadLogs();
    
    // Listen for updates from auditService
    const handleStorageChange = () => loadLogs();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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
      case 'USER_ACTION': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ERROR': return 'bg-red-50 text-red-700 border-red-200';
      case 'SYSTEM_EVENT': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-3">
            <Activity className="text-cyan-600" />
            System Audit Trail
          </h1>
          <p className="text-slate-500">Chronological record of user actions and system events for compliance review.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors text-sm font-medium shadow-sm"
          >
            <Download size={16} />
            Export JSON
          </button>
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg border border-red-200 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Clear Log
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Event Type</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">Veritas Hash</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 max-w-md truncate" title={log.details}>
                      {log.details || <span className="text-slate-400 italic">No details provided</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                        {log.veritas_hash ? (
                            <div className="flex items-center gap-1 text-emerald-600" title={log.veritas_hash}>
                                <ShieldCheck size={12} />
                                {log.veritas_hash.slice(0, 10)}...
                            </div>
                        ) : (
                            <span className="text-slate-400">-</span>
                        )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Activity size={32} className="text-slate-300" />
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
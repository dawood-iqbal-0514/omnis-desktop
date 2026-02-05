import React from 'react';

const ExecutionLogs = ({ logs }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-text-secondary';
    }
  };

  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-lg p-4 my-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h3 className="text-md font-semibold text-text-primary">Execution Logs</h3>
      </div>

      <div className="space-y-2">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 p-2 rounded ${
              log.status === 'error' ? 'bg-red-500/10' : log.status === 'success' ? 'bg-green-500/10' : 'bg-blue-500/10'
            }`}
          >
            <span className={`text-lg ${getStatusColor(log.status)}`}>
              {getStatusIcon(log.status)}
            </span>
            <div className="flex-1">
              <p className={`text-sm ${getStatusColor(log.status)}`}>
                {log.message}
              </p>
              {log.details && (
                <div className="mt-1 text-xs text-text-secondary">
                  {log.details.mock && (
                    <div className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded mb-1">
                      ⚠️ Mock Execution - APIs not integrated
                    </div>
                  )}
                  {Object.entries(log.details).map(([key, value]) => {
                    if (key === 'mock') return null; // Skip showing mock flag
                    return (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    );
                  })}
                </div>
              )}
              {log.timestamp && (
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExecutionLogs;


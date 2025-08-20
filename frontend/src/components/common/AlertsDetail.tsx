import React, { useState } from 'react';
import type { Alert } from '../../types/alertsdashboard.types';

interface AlertsDetailProps {
  alert: Alert;
  onConvertToCase?: (alert: Alert) => void;
  onCloseAlert?: (alert: Alert) => void;
}

const AlertsDetail: React.FC<AlertsDetailProps> = ({ alert, onConvertToCase, onCloseAlert }) => {
  const [open, setOpen] = useState(false);

  const handleConvert = () => {
    if (onConvertToCase) onConvertToCase(alert);
    else console.log('Convert to case clicked for', alert.id);
    setOpen(false);
  };

  const handleCloseAlert = () => {
    if (onCloseAlert) onCloseAlert(alert);
    else console.log('Close alert clicked for', alert.id);
    setOpen(false);
  };

  const [showRules, setShowRules] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-bold mb-0">Alert Details </h3>
          {/* Actions dropdown moved to the left */}
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="inline-flex items-center px-3 py-1.5 border border-gray-200 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-200 focus:outline-none"
            >
              Actions
              <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 111.12 1.0l-4.25 4.65a.75.75 0 01-1.12 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-40">
                <div className="py-1">
                  <button
                    onClick={handleConvert}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Convert to case
                  </button>
                  <button
                    onClick={handleCloseAlert}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Close Alert
                  </button>
                </div>
              </div>
            )}
          </div>


        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {/* Card 1 - Alert Summary */}
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Alert Summary</h4>
          <p className="text-sm"><strong>ID:</strong> {alert.id}</p>
          <p className="text-sm"><strong>Date/Time:</strong> {new Date(alert.createdAt).toLocaleString()}</p>
          <p className="text-sm"><strong>Risk Score:</strong> {alert.riskScore}/100</p>
          <p className="text-sm"><strong>Entry:</strong> {alert.assignee ?? '-'}</p>
        </div>

        {/* Card 2 - Transaction Data */}
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Transaction Data</h4>

        </div>

        {/* Card 3 - Related Items */}
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Items</h4>
        </div>

        {/* Card 4 - Action History */}
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Action History</h4>
          <p className="text-sm"><strong>Created:</strong> {new Date(alert.createdAt).toLocaleString()}</p>
          <p className="text-sm"><strong>Updated:</strong> {new Date(alert.updatedAt).toLocaleString()}</p>
          <p className="text-sm"><strong>Last Updated:</strong> {alert.lastUpdated ? new Date(alert.lastUpdated).toLocaleString() : '-'}</p>
          <p className="text-sm"><strong>Amount:</strong> {alert.amount ?? '-'} {alert.currency ?? ''}</p>
        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mt-4">
        {/* Card 5 - Rules & Typologies */}
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Rules & Typologies</h4>
            <button
              onClick={() => setShowRules(s => !s)}
              className="text-sm px-3 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              {showRules ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* Collapsible 2-column table */}
          <div className={`overflow-hidden transition-max-h duration-200 ${showRules ? 'max-h-96 mt-3' : 'max-h-0'}`}>
            {showRules && (
              <div className="mt-2">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="px-3 py-2">False promotions, phishing, or social engineering scams</th>
                      <th className="px-3 py-2">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {
                      // derive a couple of example rows from alert
                      (() => {
                        const rows: { rule: string; score: string }[] = [];
                        rows.push({ rule: `${alert.type}`, score: 'Score' });
                        rows.push({ rule: `${alert.source}`, score: 'Score' });
                        rows.push({ rule: ``, score: `Total Score ${alert.riskScore}` });
                        return rows.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 align-top text-gray-800">{r.rule}</td>
                            <td className="px-3 py-2 align-top text-gray-600">{r.score}</td>
                          </tr>
                        ));
                      })()
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsDetail;

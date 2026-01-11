import { useState } from 'react';
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AlertsSidebar() {
  const { data, isLoading, error } = useEmergencyAlerts();
  const alerts = data?.features || [];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute top-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-r-lg shadow-lg transition-all ${
          collapsed ? 'left-0' : 'left-80'
        }`}
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div
        className={`absolute top-4 left-4 w-80 max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-lg overflow-hidden z-40 transition-transform duration-300 ${
          collapsed ? '-translate-x-[calc(100%+1rem)]' : 'translate-x-0'
        }`}
      >
        <div className="p-4 bg-gray-800 text-white font-semibold flex justify-between items-center">
          <span>Emergency Alerts ({alerts.length})</span>
        </div>
        <div className="overflow-y-auto max-h-96">
          {isLoading && <div className="p-4 text-gray-500">Loading...</div>}
          {error && <div className="p-4 text-red-600">Error loading alerts</div>}
          {!isLoading && alerts.length === 0 && <div className="p-4 text-gray-500">No active alerts</div>}
          {alerts.map((a: any, i: number) => (
            <div key={a.properties?.id || i} className="p-4 border-b border-gray-200 hover:bg-gray-50">
              <div className="font-medium text-gray-900">{a.properties?.title || 'Alert'}</div>
              <div className="text-sm text-gray-600">{a.properties?.category}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

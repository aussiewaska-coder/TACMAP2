import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts';

export function AlertsSidebar() {
  const { data, isLoading, error } = useEmergencyAlerts();
  const alerts = data?.features || [];

  return (
    <div className="absolute top-4 right-4 w-80 max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-lg overflow-hidden z-40">
      <div className="p-4 bg-gray-800 text-white font-semibold">Emergency Alerts ({alerts.length})</div>
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
  );
}

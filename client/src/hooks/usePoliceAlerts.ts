import { useState, useEffect } from 'react';

interface PoliceAlert {
  alertId: string;
  type: string | null;
  subtype: string | null;
  latitude: number | null;
  longitude: number | null;
  street: string | null;
  city: string | null;
}

export function usePoliceAlerts(refreshInterval = 30000) {
  const [alerts, setAlerts] = useState<PoliceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/police/alerts');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setAlerts(data.alerts || []);
      } catch (e) { console.error('[usePoliceAlerts] Error:', e); }
      finally { setLoading(false); }
    };
    fetchAlerts();
    const i = setInterval(fetchAlerts, refreshInterval);
    return () => clearInterval(i);
  }, [refreshInterval]);

  return { alerts, loading };
}

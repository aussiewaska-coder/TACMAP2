import { useEffect, useRef } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import { useMapStore } from '@/stores/mapStore';
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts';

export function AlertMarkers() {
  const map = useMapStore((state) => state.map);
  const isLoaded = useMapStore((state) => state.isLoaded);
  const { data } = useEmergencyAlerts();
  const markersRef = useRef<maptilersdk.Marker[]>([]);

  useEffect(() => {
    if (!map || !isLoaded || !data?.features) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for each alert
    data.features.forEach((feature: any) => {
      if (!feature.geometry?.coordinates) return;

      const [lng, lat] = feature.geometry.coordinates;

      // Validate coordinates
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        console.warn('[AlertMarkers] Invalid coordinates:', { lng, lat }, feature);
        return;
      }

      // Validate lng/lat are within valid ranges
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        console.warn('[AlertMarkers] Out of bounds:', { lng, lat }, feature);
        return;
      }

      const props = feature.properties || {};
      const severity = props.severity?.toLowerCase() || 'information';

      // Color based on severity
      const colors: Record<string, string> = {
        emergency: '#dc2626',
        warning: '#f59e0b',
        watch: '#eab308',
        advice: '#3b82f6',
        information: '#6b7280',
      };
      const color = colors[severity] || colors.information;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'alert-marker';
      el.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">!</text>
        </svg>
      `;
      el.style.cursor = 'pointer';

      const marker = new maptilersdk.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .setPopup(
          new maptilersdk.Popup({ offset: 15, maxWidth: '300px' }).setHTML(`
            <div style="font-family: system-ui; padding: 4px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${props.title || 'Alert'}</div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${props.category || ''} ${props.subcategory ? `- ${props.subcategory}` : ''}</div>
              <div style="font-size: 12px; color: #888;">${props.description?.slice(0, 200) || ''}${props.description?.length > 200 ? '...' : ''}</div>
            </div>
          `)
        )
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [map, isLoaded, data]);

  return null;
}

import { useState, useEffect } from 'react';
import { MapContainer } from '@/core';
import { AlertsSidebar } from './AlertsSidebar';
import { FlightControlCenter } from './FlightControlCenter';
import { UserLocationLayer } from '@/layers/live/UserLocationLayer';

export function ReconLayout() {
  const [collapsed, setCollapsed] = useState(true); // Start collapsed
  const [initialized, setInitialized] = useState(false);

  // On desktop, auto-expand after mount
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) {
      // Small delay for smooth entrance animation on desktop
      const timer = setTimeout(() => {
        setCollapsed(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    setInitialized(true);
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950 text-white">
      <MapContainer className="absolute inset-0" />

      {/* Atmospheric overlay */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(16,185,129,0.15),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_rgba(56,189,248,0.15),_transparent_50%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      <AlertsSidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <FlightControlCenter />
      <UserLocationLayer />
    </div>
  );
}

export default ReconLayout;

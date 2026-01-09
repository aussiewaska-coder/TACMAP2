// FlightDashboard - Tactical flight command HUD overlay
// Full-screen overlay with glassmorphic tactical aesthetic

import { useEffect } from 'react';
import { Z_INDEX } from '@/core/constants';
import { useFlightStore, useFlightTelemetry, useFlightDestination, DESTINATIONS, useDesktopUIStore } from '@/stores';
import { useFlight } from '@/hooks';
import { useBreakpoint } from '@/hooks';
import { formatDistance, formatETA } from '@/utils/geodesic';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { X, Navigation, Plane, Target, Gauge } from 'lucide-react';
import type { Destination } from '@/stores/flightStore';

// Panel wrapper with tactical styling
function TacticalPanel({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`
                pointer-events-auto
                bg-black/60 backdrop-blur-md
                border border-cyan-500/30
                rounded-lg
                text-cyan-400
                font-mono text-sm
                shadow-lg shadow-cyan-500/10
                ${className}
            `}
        >
            {children}
        </div>
    );
}

// SVG Compass component
function Compass({ heading }: { heading: number }) {
    const size = 100;
    const center = size / 2;
    const radius = 40;

    return (
        <div className="relative">
            <svg width={size} height={size} className="drop-shadow-lg">
                {/* Outer ring */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="rgba(0, 255, 255, 0.3)"
                    strokeWidth="2"
                />

                {/* Degree marks */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                    const isMajor = deg % 90 === 0;
                    const rad = (deg - 90) * (Math.PI / 180);
                    const innerR = isMajor ? radius - 12 : radius - 8;
                    return (
                        <line
                            key={deg}
                            x1={center + innerR * Math.cos(rad)}
                            y1={center + innerR * Math.sin(rad)}
                            x2={center + radius * Math.cos(rad)}
                            y2={center + radius * Math.sin(rad)}
                            stroke={isMajor ? '#00ffff' : 'rgba(0, 255, 255, 0.5)'}
                            strokeWidth={isMajor ? 2 : 1}
                        />
                    );
                })}

                {/* Cardinal directions - rotate opposite to heading */}
                <g transform={`rotate(${-heading}, ${center}, ${center})`}>
                    {[
                        { dir: 'N', deg: 0, color: '#ff4444' },
                        { dir: 'E', deg: 90, color: '#00ffff' },
                        { dir: 'S', deg: 180, color: '#00ffff' },
                        { dir: 'W', deg: 270, color: '#00ffff' },
                    ].map(({ dir, deg, color }) => {
                        const rad = (deg - 90) * (Math.PI / 180);
                        const textR = radius - 22;
                        return (
                            <text
                                key={dir}
                                x={center + textR * Math.cos(rad)}
                                y={center + textR * Math.sin(rad)}
                                fill={color}
                                fontSize="12"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${heading}, ${center + textR * Math.cos(rad)}, ${center + textR * Math.sin(rad)})`}
                            >
                                {dir}
                            </text>
                        );
                    })}
                </g>

                {/* Aircraft indicator (fixed, pointing up) */}
                <polygon
                    points={`${center},${center - 15} ${center - 8},${center + 8} ${center},${center + 2} ${center + 8},${center + 8}`}
                    fill="#00ffff"
                    stroke="#00ffff"
                    strokeWidth="1"
                />
            </svg>

            {/* Digital heading display */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-0.5 rounded text-xs text-cyan-400 font-bold">
                {Math.round(heading).toString().padStart(3, '0')}°
            </div>
        </div>
    );
}

// Artificial Horizon component
function ArtificialHorizon({ pitch = 0, roll = 0 }: { pitch?: number; roll?: number }) {
    const size = 100;
    const center = size / 2;

    // Clamp pitch to reasonable values
    const clampedPitch = Math.max(-45, Math.min(45, pitch));
    const pitchOffset = (clampedPitch / 45) * 30; // Scale to visual offset

    return (
        <svg width={size} height={size} className="drop-shadow-lg">
            {/* Background circle */}
            <defs>
                <clipPath id="horizon-clip">
                    <circle cx={center} cy={center} r={42} />
                </clipPath>
            </defs>

            {/* Sky/Ground split */}
            <g clipPath="url(#horizon-clip)" transform={`rotate(${roll}, ${center}, ${center})`}>
                {/* Sky */}
                <rect x="0" y={center - 50 + pitchOffset} width={size} height="50" fill="#1e3a5f" />
                {/* Ground */}
                <rect x="0" y={center + pitchOffset} width={size} height="50" fill="#4a3728" />
                {/* Horizon line */}
                <line
                    x1="0"
                    y1={center + pitchOffset}
                    x2={size}
                    y2={center + pitchOffset}
                    stroke="#00ffff"
                    strokeWidth="2"
                />
                {/* Pitch ladder */}
                {[-20, -10, 10, 20].map((p) => {
                    const y = center + pitchOffset - (p / 45) * 30;
                    return (
                        <g key={p}>
                            <line
                                x1={center - 15}
                                y1={y}
                                x2={center + 15}
                                y2={y}
                                stroke="rgba(0, 255, 255, 0.5)"
                                strokeWidth="1"
                            />
                        </g>
                    );
                })}
            </g>

            {/* Outer ring */}
            <circle
                cx={center}
                cy={center}
                r={42}
                fill="none"
                stroke="rgba(0, 255, 255, 0.3)"
                strokeWidth="2"
            />

            {/* Fixed aircraft reference */}
            <path
                d={`M${center - 25} ${center} L${center - 10} ${center} L${center} ${center + 8} L${center + 10} ${center} L${center + 25} ${center}`}
                fill="none"
                stroke="#ffff00"
                strokeWidth="3"
            />
            <circle cx={center} cy={center} r="3" fill="#ffff00" />
        </svg>
    );
}

// Speed indicator
function SpeedIndicator({ speed }: { speed: number }) {
    return (
        <TacticalPanel className="p-3">
            <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-cyan-500/70 uppercase">Speed</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">
                {Math.round(speed)}
                <span className="text-sm text-cyan-500/70 ml-1">km/h</span>
            </div>
        </TacticalPanel>
    );
}

// Altitude indicator
function AltitudeIndicator({ altitude }: { altitude: number }) {
    return (
        <TacticalPanel className="p-3">
            <div className="flex items-center gap-2 mb-1">
                <Plane className="w-4 h-4 text-cyan-500 rotate-45" />
                <span className="text-xs text-cyan-500/70 uppercase">Altitude</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">
                {Math.round(altitude / 1000).toLocaleString()}
                <span className="text-sm text-cyan-500/70 ml-1">km</span>
            </div>
        </TacticalPanel>
    );
}

// Telemetry panel
function TelemetryPanel() {
    const telemetry = useFlightTelemetry();
    const { destination, distanceRemaining, etaSeconds } = useFlightDestination();

    return (
        <TacticalPanel className="p-3">
            <div className="space-y-2">
                {/* Coordinates */}
                <div>
                    <span className="text-xs text-cyan-500/70 uppercase">Position</span>
                    <div className="text-sm font-bold">
                        {telemetry.currentPosition[1].toFixed(4)}°, {telemetry.currentPosition[0].toFixed(4)}°
                    </div>
                </div>

                {/* Destination info */}
                {destination && (
                    <>
                        <div className="border-t border-cyan-500/20 pt-2">
                            <span className="text-xs text-cyan-500/70 uppercase">Destination</span>
                            <div className="text-sm font-bold flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {destination.name}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-xs text-cyan-500/70 uppercase">Distance</span>
                                <div className="text-sm font-bold">{formatDistance(distanceRemaining)}</div>
                            </div>
                            <div>
                                <span className="text-xs text-cyan-500/70 uppercase">ETA</span>
                                <div className="text-sm font-bold">{formatETA(etaSeconds)}</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </TacticalPanel>
    );
}

// Mode toggle
function ModeToggle() {
    const mode = useFlightStore((state) => state.mode);
    const setMode = useFlightStore((state) => state.setMode);
    const startManualFlight = useFlightStore((state) => state.startManualFlight);
    const stopFlight = useFlightStore((state) => state.stopFlight);

    return (
        <TacticalPanel className="p-3">
            <div className="text-xs text-cyan-500/70 uppercase mb-2">Flight Mode</div>
            <div className="flex gap-1">
                {(['off', 'manual'] as const).map((m) => (
                    <button
                        key={m}
                        onClick={() => {
                            if (m === 'off') stopFlight();
                            else if (m === 'manual') startManualFlight();
                        }}
                        className={`
                            flex-1 px-3 py-2 rounded text-xs font-bold uppercase
                            transition-all
                            ${mode === m
                                ? 'bg-cyan-500 text-black'
                                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                            }
                        `}
                    >
                        {m}
                    </button>
                ))}
            </div>
        </TacticalPanel>
    );
}

// Manual controls
function ManualControls() {
    const targetSpeed = useFlightStore((state) => state.targetSpeed);
    const targetHeading = useFlightStore((state) => state.targetHeading);
    const targetAltitude = useFlightStore((state) => state.targetAltitude);
    const setTargetSpeed = useFlightStore((state) => state.setTargetSpeed);
    const setTargetHeading = useFlightStore((state) => state.setTargetHeading);
    const setTargetAltitude = useFlightStore((state) => state.setTargetAltitude);
    const mode = useFlightStore((state) => state.mode);
    const startManualFlight = useFlightStore((state) => state.startManualFlight);

    const handleChange = (setter: (value: number) => void, value: number) => {
        setter(value);
        // Auto-start manual mode when adjusting controls
        if (mode === 'off') {
            startManualFlight();
        }
    };

    return (
        <TacticalPanel className="p-3 space-y-4">
            <div className="text-xs text-cyan-500/70 uppercase">Manual Controls</div>

            {/* Speed */}
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span>Speed</span>
                    <span className="text-cyan-400">{targetSpeed} km/h</span>
                </div>
                <Slider
                    min={100}
                    max={2000}
                    step={50}
                    value={[targetSpeed]}
                    onValueChange={([v]) => handleChange(setTargetSpeed, v)}
                    className="[&_[role=slider]]:bg-cyan-500 [&_[role=slider]]:border-cyan-400"
                />
            </div>

            {/* Heading */}
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span>Heading</span>
                    <span className="text-cyan-400">{targetHeading}°</span>
                </div>
                <Slider
                    min={0}
                    max={360}
                    step={5}
                    value={[targetHeading]}
                    onValueChange={([v]) => handleChange(setTargetHeading, v)}
                    className="[&_[role=slider]]:bg-cyan-500 [&_[role=slider]]:border-cyan-400"
                />
            </div>

            {/* Altitude */}
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span>Altitude</span>
                    <span className="text-cyan-400">{(targetAltitude / 1000).toFixed(0)} km</span>
                </div>
                <Slider
                    min={1000}
                    max={50000}
                    step={1000}
                    value={[targetAltitude]}
                    onValueChange={([v]) => handleChange(setTargetAltitude, v)}
                    className="[&_[role=slider]]:bg-cyan-500 [&_[role=slider]]:border-cyan-400"
                />
            </div>
        </TacticalPanel>
    );
}

// Autopilot panel
function AutopilotPanel() {
    const startAutopilot = useFlightStore((state) => state.startAutopilot);
    const mode = useFlightStore((state) => state.mode);
    const destination = useFlightStore((state) => state.destination);

    const handleDestinationSelect = (dest: Destination) => {
        startAutopilot(dest);
    };

    // Show primary destinations
    const primaryDestinations = DESTINATIONS.filter(d =>
        ['Sydney', 'Nimbin', 'Melbourne', 'Brisbane', 'Uluru'].includes(d.name)
    );

    return (
        <TacticalPanel className="p-3">
            <div className="text-xs text-cyan-500/70 uppercase mb-2">Autopilot Destinations</div>
            <div className="grid grid-cols-2 gap-2">
                {primaryDestinations.map((dest) => (
                    <button
                        key={dest.name}
                        onClick={() => handleDestinationSelect(dest)}
                        className={`
                            px-2 py-2 rounded text-xs font-medium
                            transition-all flex items-center justify-center gap-1
                            ${mode === 'autopilot' && destination?.name === dest.name
                                ? 'bg-green-500 text-black'
                                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                            }
                        `}
                    >
                        <Navigation className="w-3 h-3" />
                        {dest.name}
                    </button>
                ))}
            </div>
        </TacticalPanel>
    );
}

// Main FlightDashboard component
export function FlightDashboard() {
    const dashboardOpen = useFlightStore((state) => state.dashboardOpen);
    const closeDashboard = useFlightStore((state) => state.closeDashboard);
    const telemetry = useFlightTelemetry();
    const mode = useFlightStore((state) => state.mode);
    const { isMobile } = useBreakpoint();

    // Get sidebar state to position left instruments
    const sidebarCollapsed = useDesktopUIStore((state) => state.sidebarCollapsed);
    const sidebarWidth = useDesktopUIStore((state) => state.sidebarWidth);

    // Calculate left offset for instruments (avoid sidebar)
    const leftOffset = isMobile ? 16 : (sidebarCollapsed ? 16 : sidebarWidth + 16);

    // Initialize flight hook (handles animation loop)
    useFlight();

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && dashboardOpen) {
                closeDashboard();
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [dashboardOpen, closeDashboard]);

    if (!dashboardOpen) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: Z_INDEX.OVERLAY }}
        >
            {/* Top bar */}
            <div
                className="absolute top-0 right-0 p-4 flex items-start justify-between gap-4 transition-all duration-300"
                style={{ left: leftOffset }}
            >
                {/* Left: Compass */}
                <div className="pointer-events-auto">
                    <TacticalPanel className="p-2">
                        <Compass heading={telemetry.currentHeading} />
                    </TacticalPanel>
                </div>

                {/* Center: Mode indicator */}
                <div className="pointer-events-auto flex-1 max-w-xs mx-auto">
                    <TacticalPanel className="p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                                mode === 'off' ? 'bg-gray-500' :
                                mode === 'manual' ? 'bg-blue-500 animate-pulse' :
                                'bg-green-500 animate-pulse'
                            }`} />
                            <span className="text-xs uppercase font-bold">
                                {mode === 'off' ? 'Standby' :
                                 mode === 'manual' ? 'Manual Flight' :
                                 'Autopilot Active'}
                            </span>
                        </div>
                    </TacticalPanel>
                </div>

                {/* Right: Close button + Telemetry */}
                <div className="pointer-events-auto flex items-start gap-2">
                    <TelemetryPanel />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeDashboard}
                        className="bg-black/60 hover:bg-red-500/50 text-cyan-400 hover:text-white border border-cyan-500/30 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Left side: Instruments (positioned to avoid sidebar) */}
            {!isMobile && (
                <div
                    className="absolute top-1/2 -translate-y-1/2 space-y-3 pointer-events-auto transition-all duration-300"
                    style={{ left: leftOffset }}
                >
                    <TacticalPanel className="p-2">
                        <ArtificialHorizon pitch={0} roll={0} />
                    </TacticalPanel>
                    <SpeedIndicator speed={telemetry.currentSpeed} />
                    <AltitudeIndicator altitude={telemetry.currentAltitude} />
                </div>
            )}

            {/* Right side: Controls */}
            <div className={`absolute ${isMobile ? 'bottom-20 right-4' : 'right-4 top-1/2 -translate-y-1/2'} space-y-3 pointer-events-auto ${isMobile ? 'max-w-[200px]' : 'w-56'}`}>
                <ModeToggle />
                <ManualControls />
                <AutopilotPanel />
            </div>

            {/* Bottom bar (mobile: simplified) */}
            {isMobile && (
                <div className="absolute bottom-4 left-4 right-20 pointer-events-auto">
                    <TacticalPanel className="p-2 flex items-center justify-around">
                        <div className="text-center">
                            <div className="text-xs text-cyan-500/70">SPD</div>
                            <div className="text-lg font-bold">{Math.round(telemetry.currentSpeed)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-cyan-500/70">HDG</div>
                            <div className="text-lg font-bold">{Math.round(telemetry.currentHeading)}°</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-cyan-500/70">ALT</div>
                            <div className="text-lg font-bold">{(telemetry.currentAltitude / 1000).toFixed(0)}k</div>
                        </div>
                    </TacticalPanel>
                </div>
            )}
        </div>
    );
}

export default FlightDashboard;

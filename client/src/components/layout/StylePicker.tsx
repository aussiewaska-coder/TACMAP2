// StylePicker - Basemap style selection UI
// Works on both mobile and desktop

import { Check, Map, Moon, Sun, Compass, Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBasemapStore, BASEMAP_STYLES } from '@/stores/basemapStore';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

interface StylePickerProps {
    onSelect?: () => void;
    compact?: boolean;
}

const styleIcons: Record<string, React.ReactNode> = {
    'osm-terrain': <Mountain className="w-5 h-5" />,
    'osm-standard': <Map className="w-5 h-5" />,
    'carto-light': <Sun className="w-5 h-5" />,
    'carto-dark': <Moon className="w-5 h-5" />,
    'carto-voyager': <Compass className="w-5 h-5" />,
};

const styleColors: Record<string, string> = {
    'osm-terrain': 'bg-green-100 text-green-600',
    'osm-standard': 'bg-blue-100 text-blue-600',
    'carto-light': 'bg-amber-100 text-amber-600',
    'carto-dark': 'bg-slate-700 text-slate-200',
    'carto-voyager': 'bg-purple-100 text-purple-600',
};

/**
 * Style picker for selecting basemap styles
 */
export function StylePicker({ onSelect, compact = false }: StylePickerProps) {
    const map = useMapStore((state) => state.map);
    const currentStyleId = useBasemapStore((state) => state.currentStyleId);
    const isChanging = useBasemapStore((state) => state.isChanging);
    const setStyle = useBasemapStore((state) => state.setStyle);

    const handleStyleSelect = async (styleId: string) => {
        if (styleId === currentStyleId || isChanging) return;

        await setStyle(styleId, map);

        const style = BASEMAP_STYLES.find((s) => s.id === styleId);
        if (style) {
            toast.success(`Switched to ${style.name}`, { duration: 2000 });
        }

        onSelect?.();
    };

    if (compact) {
        return (
            <div className="flex gap-2 overflow-x-auto pb-2">
                {BASEMAP_STYLES.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => handleStyleSelect(style.id)}
                        disabled={isChanging}
                        className={`
              flex-shrink-0 w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1
              transition-all duration-200
              ${currentStyleId === style.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }
              ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styleColors[style.id]}`}>
                            {styleIcons[style.id]}
                        </div>
                        <span className="text-[10px] font-medium text-gray-600 truncate w-14 text-center">
                            {style.name}
                        </span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {BASEMAP_STYLES.map((style) => (
                <button
                    key={style.id}
                    onClick={() => handleStyleSelect(style.id)}
                    disabled={isChanging}
                    className={`
            w-full flex items-center gap-3 p-3 rounded-xl border-2
            transition-all duration-200
            ${currentStyleId === style.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                        }
            ${isChanging ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
                >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styleColors[style.id]}`}>
                        {styleIcons[style.id]}
                    </div>
                    <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">{style.name}</div>
                        {style.description && (
                            <div className="text-xs text-gray-500">{style.description}</div>
                        )}
                    </div>
                    {currentStyleId === style.id && (
                        <Check className="w-5 h-5 text-indigo-600" />
                    )}
                    {style.terrain && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            3D
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

export default StylePicker;

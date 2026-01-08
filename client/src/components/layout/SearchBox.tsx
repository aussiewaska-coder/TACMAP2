// SearchBox - Location search using Geocoder plugin
// Works on both mobile and desktop

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMapStore } from '@/stores';
import { toast } from 'sonner';

interface SearchResult {
    id: string;
    name: string;
    displayName: string;
    coordinates: [number, number];
    type: string;
}

interface SearchBoxProps {
    onResultSelect?: (result: SearchResult) => void;
    placeholder?: string;
    className?: string;
}

const PHOTON_API = 'https://photon.komoot.io/api';

/**
 * Location search box using Photon API
 */
export function SearchBox({ onResultSelect, placeholder = 'Search locations...', className = '' }: SearchBoxProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const map = useMapStore((state) => state.map);
    const flyTo = useMapStore((state) => state.flyTo);

    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        // Cancel previous request
        if (abortRef.current) {
            abortRef.current.abort();
        }
        abortRef.current = new AbortController();

        setIsLoading(true);

        try {
            const params = new URLSearchParams({
                q: searchQuery,
                limit: '6',
                lang: 'en',
                // Bias towards Australia
                lon: '133.7751',
                lat: '-25.2744',
            });

            const response = await fetch(`${PHOTON_API}?${params}`, {
                signal: abortRef.current.signal,
            });

            if (!response.ok) throw new Error('Search failed');

            const data = await response.json();

            const searchResults: SearchResult[] = data.features.map((feature: any, index: number) => {
                const props = feature.properties;
                const coords = feature.geometry.coordinates;

                const parts = [props.name];
                if (props.city && props.city !== props.name) parts.push(props.city);
                if (props.state) parts.push(props.state);
                if (props.country) parts.push(props.country);

                return {
                    id: `result-${index}`,
                    name: props.name || 'Unknown',
                    displayName: parts.filter(Boolean).join(', '),
                    coordinates: [coords[0], coords[1]] as [number, number],
                    type: props.osm_value || 'place',
                };
            });

            setResults(searchResults);
            setIsOpen(searchResults.length > 0);
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Search error:', error);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            search(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, search]);

    const handleResultClick = (result: SearchResult) => {
        flyTo(result.coordinates, 14, { pitch: 60, duration: 2500 });
        toast.success(`Flying to ${result.name}`);
        setQuery('');
        setResults([]);
        setIsOpen(false);
        onResultSelect?.(result);
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

    return (
        <div className={`relative ${className}`}>
            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <Input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="pl-10 pr-10 h-12 text-base bg-white rounded-xl border-gray-200"
                />
                {isLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                ) : query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Results dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
                    {results.map((result) => (
                        <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                        >
                            <MapPin className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">{result.name}</div>
                                <div className="text-sm text-gray-500 truncate">{result.displayName}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SearchBox;

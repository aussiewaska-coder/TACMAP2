// SearchPanel - Location search
// Placeholder - will integrate with geocoder plugin

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMobileUIStore } from '@/stores';

/**
 * Search panel for location search
 */
export function SearchPanel() {
    const searchQuery = useMobileUIStore((state) => state.searchQuery);
    const setSearchQuery = useMobileUIStore((state) => state.setSearchQuery);

    return (
        <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                    autoFocus
                />
            </div>

            {/* Search results placeholder */}
            <div className="text-center py-12 text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                    Geocoder integration coming soon...
                </p>
                <p className="text-xs mt-2">
                    Use city navigation for now
                </p>
            </div>
        </div>
    );
}

export default SearchPanel;

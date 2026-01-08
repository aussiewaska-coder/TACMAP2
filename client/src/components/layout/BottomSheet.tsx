// BottomSheet - Mobile bottom sheet component
// Uses vaul (drawer) for smooth native-like bottom sheet behavior

import { Drawer } from 'vaul';
import { useMobileUIStore } from '@/stores';
import { CityList } from './CityList';
import { LayersList } from './LayersList';
import { SettingsPanel } from './SettingsPanel';
import { SearchPanel } from './SearchPanel';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Mobile Bottom Sheet
 * 
 * A native-like bottom sheet for mobile that slides up from the bottom.
 * Content changes based on what action triggered it.
 */
export function BottomSheet() {
    const bottomSheetOpen = useMobileUIStore((state) => state.bottomSheetOpen);
    const bottomSheetContent = useMobileUIStore((state) => state.bottomSheetContent);
    const closeBottomSheet = useMobileUIStore((state) => state.closeBottomSheet);

    const getTitle = () => {
        switch (bottomSheetContent) {
            case 'cities':
                return 'Navigate to City';
            case 'layers':
                return 'Map Layers';
            case 'settings':
                return 'Settings';
            case 'search':
                return 'Search';
            case 'tools':
                return 'Tools';
            default:
                return '';
        }
    };

    const renderContent = () => {
        switch (bottomSheetContent) {
            case 'cities':
                return <CityList onSelect={closeBottomSheet} />;
            case 'layers':
                return <LayersList />;
            case 'settings':
                return <SettingsPanel />;
            case 'search':
                return <SearchPanel />;
            case 'tools':
                return <div className="p-4 text-gray-500">Tools coming soon...</div>;
            default:
                return null;
        }
    };

    return (
        <Drawer.Root open={bottomSheetOpen} onOpenChange={(open) => !open && closeBottomSheet()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[100]" />
                <Drawer.Content className="bg-white flex flex-col rounded-t-[20px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-[101]">
                    {/* Handle */}
                    <div className="p-4 bg-white rounded-t-[20px]">
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-4" />

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <Drawer.Title className="text-lg font-semibold text-gray-900">
                                {getTitle()}
                            </Drawer.Title>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeBottomSheet}
                                className="h-8 w-8 rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 pb-8">
                        {renderContent()}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

export default BottomSheet;

// Registry type definitions for Emergency Services feeds

export type StreamType = 'geojson' | 'rss' | 'cap' | 'arcgis' | 'json' | 'radio';
export type Category = 'Alerts' | 'Fire' | 'Flood' | 'Ground' | 'Communications' | 'Hazards' | 'Hazards & Warnings' | 'Weather' | 'Transport';
export type JurisdictionState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT' | 'AUS';
export type AccessLevel = 'Open' | 'Partial' | 'Internal';

export interface RegistryEntry {
    source_id: string;
    category: Category;
    subcategory: string;
    tags: string[];
    jurisdiction_state: JurisdictionState;
    endpoint_url: string;
    stream_type: StreamType;
    format: string;
    access_level: AccessLevel;
    certainly_open: boolean;
    machine_readable: boolean;

}

export interface RegistryFilters {
    category?: Category;
    state?: JurisdictionState;
    machine_readable?: boolean;
    tags?: string[];
}

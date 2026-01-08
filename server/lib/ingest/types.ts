// Alert normalization types

export interface CanonicalAlert {
    id: string;
    source_id: string;
    category: string;
    subcategory: string;
    tags: string[];
    state: string;
    hazard_type: string;
    severity: string;
    severity_rank: number; // 1=Emergency, 2=Watch&Act, 3=Advice, 4=Info
    title: string;
    description: string;
    issued_at: string; // ISO8601
    updated_at: string; // ISO8601
    expires_at?: string; // ISO8601
    url?: string;
    confidence: 'high' | 'medium' | 'low' | 'unverified';
    age_s: number;
    geometry?: GeoJSON.Geometry;
}

export interface AlertsResponse {
    type: 'FeatureCollection';
    features: GeoJSON.Feature[];
    metadata: {
        total_alerts: number;
        sources_count: number;
        stale: boolean;
        error?: string;
    };
}

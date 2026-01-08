// Aircraft tracking types

export interface AircraftTrack {
    icao24: string;
    registration?: string;
    lat: number;
    lon: number;
    alt_m: number;
    ground_speed_mps: number;
    track_deg: number;
    age_s: number;
    stale: boolean;
    source: 'adsb_lol' | 'opensky';
    operator?: string;
    role?: string;
    callsign?: string;
    vertical_rate?: number;
    on_ground?: boolean;
}

export interface AdsbLolResponse {
    ac?: Array<{
        hex: string;
        flight?: string;
        lat?: number;
        lon?: number;
        alt_baro?: number | string;
        gs?: number;
        track?: number;
        baro_rate?: number;
        category?: string;
        t?: string;
    }>;
    now?: number;
    messages?: number;
}

export interface OpenSkyState {
    icao24: string;
    callsign: string | null;
    origin_country: string;
    time_position: number | null;
    last_contact: number;
    longitude: number | null;
    latitude: number | null;
    baro_altitude: number | null;
    on_ground: boolean;
    velocity: number | null;
    true_track: number | null;
    vertical_rate: number | null;
    sensors: number[] | null;
    geo_altitude: number | null;
    squawk: string | null;
    spi: boolean;
    position_source: number;
}

export interface OpenSkyResponse {
    time: number;
    states: OpenSkyState[] | null;
}

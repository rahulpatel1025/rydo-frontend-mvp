export interface Coordinates { lat: number; lng: number; }
export interface Address { label?: 'HOME' | 'WORK' | 'OTHER' | null; address: string; location: Coordinates; }
export interface FareBreakdown { ride_fare?: number; base_fare?: number; distance_fare?: number; waiting_free_minutes?: number; waiting_minutes?: number; chargeable_waiting_minutes?: number; waiting_fee_per_min?: number; waiting_fare?: number; platform_fee?: number; total_fare: number; }
export interface User { name: string; phone: string; email: string; profile_picture?: string; gender?: 'MALE' | 'FEMALE' | 'OTHER'; date_of_birth?: string; rating?: number; default_payment_method?: 'CASH' | 'UPI' | 'CARD' | 'WALLET'; is_active: boolean; created_at: string; }
export interface Driver { id: number; name: string; phone: string; profile_picture?: string; rating: number; total_rides?: number; total_trips?: number; is_online: boolean; is_approved: boolean; }
export interface AuthResponse { token?: string; access_token?: string; refresh_token: string; expires_in: number; user?: User; driver?: Driver; is_new_user?: boolean; }

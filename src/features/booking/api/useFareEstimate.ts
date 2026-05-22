// src/features/booking/api/useFareEstimate.ts
import { useQuery } from '@tanstack/react-query';

export type VehicleType = 'bike' | 'auto' | 'shared_auto';

export interface FareBreakdown {
  base: number;
  includedKm: number;
  chargeableKm: number;
  perKmRate: number;
  distFare: number;
  waitingFare: number;
  nightSurcharge: number;
  grossFare: number;
  tds: number;
  platformFee: number;
  netToDriver: number;
  total: number;             // what passenger pays
  isLaunchRate: boolean;
}

export interface FareEstimate {
  distance_km: number;
  duration_minutes: number;
  route: { from: string; to: string };
  fares: Record<VehicleType, FareBreakdown>;
}

// ── Fare constants from RIDO Fare Policy v2.0 ─────────────────────────────────
const FARE_POLICY = {
  base_fare:          10,    // ₹10 all verticals
  included_km:         2,    // 2 km included in base fare
  waiting_per_min:     2,    // ₹2/min after 2 min free
  night_surcharge_pct: 0.10, // 10% between 10PM–6AM
  platform_commission: 0.12, // 12% of gross fare
  tds_rate:            0.01, // 1% TDS (Section 194-O)
  min_fare:           10,    // ₹10 minimum billable

  // Launch discount rates (default for first 90 days)
  launch: {
    bike:        4,    // ₹4/km
    auto:       12,    // ₹12/km
    shared_auto: 3.5,  // ₹3.5/seat/km (no launch discount — same as standard)
  },

  // Standard rates (post-launch)
  standard: {
    bike:        6,    // ₹6/km
    auto:       16,    // ₹16/km
    shared_auto: 3.5,  // ₹3.5/seat/km
  },
} as const;

// Toggle this to false when 90-day launch period ends
const USE_LAUNCH_RATES = true;

function calcFare(
  distanceKm: number,
  vehicleType: VehicleType,
  waitingMinutes: number = 0,
  isNight: boolean = false,
): FareBreakdown {
  const rates = USE_LAUNCH_RATES ? FARE_POLICY.launch : FARE_POLICY.standard;
  const perKmRate = rates[vehicleType];

  const chargeableKm = Math.max(0, distanceKm - FARE_POLICY.included_km);
  const distFare     = Math.round(chargeableKm * perKmRate * 100) / 100;

  // Waiting charge — shared auto has no waiting charge
  const freeMinutes  = 2;
  const billableWait = vehicleType === 'shared_auto'
    ? 0
    : Math.max(0, waitingMinutes - freeMinutes);
  const waitingFare  = billableWait * FARE_POLICY.waiting_per_min;

  const basePlusKm   = FARE_POLICY.base_fare + distFare + waitingFare;
  const nightSurcharge = isNight
    ? Math.round(basePlusKm * FARE_POLICY.night_surcharge_pct * 100) / 100
    : 0;

  const grossFare    = Math.max(
    FARE_POLICY.min_fare,
    Math.round((basePlusKm + nightSurcharge) * 100) / 100
  );

  // TDS: CEILING(gross × 0.01) — always round up per policy
  const tds          = Math.ceil(grossFare * FARE_POLICY.tds_rate);
  const platformFee  = Math.round(grossFare * FARE_POLICY.platform_commission * 100) / 100;
  const netToDriver  = Math.round((grossFare - tds - platformFee) * 100) / 100;

  return {
    base:          FARE_POLICY.base_fare,
    includedKm:    FARE_POLICY.included_km,
    chargeableKm:  Math.round(chargeableKm * 10) / 10,
    perKmRate,
    distFare,
    waitingFare,
    nightSurcharge,
    grossFare,
    tds,
    platformFee:   Math.round(platformFee),
    netToDriver:   Math.round(netToDriver),
    total:         grossFare,    // passenger pays gross fare
    isLaunchRate:  USE_LAUNCH_RATES,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFareEstimate(
  pickup?: { lat: number; lng: number; address: string },
  drop?:   { lat: number; lng: number; address: string },
  distanceKm?: number,        // from maps API — pass when available
  durationMinutes?: number,
) {
  return useQuery({
    queryKey: ['fareEstimate', pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, distanceKm],
    queryFn: async (): Promise<FareEstimate> => {
      // TODO: replace distanceKm with real value from Google Maps / OSRM
      const km  = distanceKm ?? 20;   // fallback 20km (Silvassa→Vapi default)
      const dur = durationMinutes ?? Math.round(km * 1.4); // rough estimate

      const isNight = (() => {
        const h = new Date().getHours();
        return h >= 22 || h < 6;
      })();

      return {
        distance_km:      km,
        duration_minutes: dur,
        route: {
          from: pickup?.address ?? 'Pickup',
          to:   drop?.address   ?? 'Drop',
        },
        fares: {
          bike:        calcFare(km, 'bike',        0, isNight),
          auto:        calcFare(km, 'auto',        0, isNight),
          shared_auto: calcFare(km, 'shared_auto', 0, isNight),
        },
      };
    },
    enabled: !!pickup && !!drop,
  });
}

// ── Utility: compute fare for a specific known route ─────────────────────────
// Useful for quick route chips on home screen
export function getRouteFare(distanceKm: number, vehicleType: VehicleType) {
  return calcFare(distanceKm, vehicleType);
}
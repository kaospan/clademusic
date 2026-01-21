/**
 * Geolocation Utilities
 * 
 * Common geolocation functions including distance calculations
 * and location-related helpers.
 */

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two points using the Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distance in miles
 */
export function calculateDistanceMiles(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  return calculateDistance(lat1, lon1, lat2, lon2) * 0.621371;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km`;
  }
  return `${Math.round(distanceKm)}km`;
}

/**
 * Check if two coordinates are within a certain radius
 */
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusKm: number
): boolean {
  return calculateDistance(lat1, lon1, lat2, lon2) <= radiusKm;
}

/**
 * Get current position as a promise
 */
export function getCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options,
    });
  });
}

/**
 * Watch position with cleanup
 */
export function watchPosition(
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options?: PositionOptions
): () => void {
  if (!navigator.geolocation) {
    errorCallback?.(new GeolocationPositionError());
    return () => {};
  }
  
  const watchId = navigator.geolocation.watchPosition(
    callback,
    errorCallback,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options,
    }
  );
  
  return () => navigator.geolocation.clearWatch(watchId);
}

/**
 * Anonymize location by rounding to nearby grid point
 * Useful for privacy when sharing location
 */
export function anonymizeLocation(
  lat: number,
  lon: number,
  precisionKm: number = 1
): { lat: number; lon: number } {
  // Approximately 0.01 degrees = 1.11 km at equator
  const precision = precisionKm / 111;
  return {
    lat: Math.round(lat / precision) * precision,
    lon: Math.round(lon / precision) * precision,
  };
}

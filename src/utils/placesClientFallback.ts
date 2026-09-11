export interface VetHospital {
  name: string;
  address: string;
  distance: string;
  distanceKm: number;
  phone?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  isOpen24Hours?: boolean;
  isEmergencyService?: boolean;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  source: string;
}

export interface PetSalon {
  name: string;
  address: string;
  distance: string;
  distanceKm: number;
  phone?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  services?: string[];
  source: string;
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export function formatDistance(distanceKm?: number | null): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return "";
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export async function searchNearbyVetsClient(
  lat: number,
  lng: number,
  locationName?: string
): Promise<{ hospitals: VetHospital[]; status: string }> {
  try {
    const radius = 30000; // 30km
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["amenity"="veterinary"](around:${radius}, ${lat}, ${lng});
        way["amenity"="veterinary"](around:${radius}, ${lat}, ${lng});
        node["healthcare"="veterinary"](around:${radius}, ${lat}, ${lng});
        node["name"~"veterinary|animal|vet|pet clinic|pashu|vaidya",i](around:${radius}, ${lat}, ${lng});
        way["name"~"veterinary|animal|vet|pet clinic|pashu|vaidya",i](around:${radius}, ${lat}, ${lng});
      );
      out center 15;
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQuery)}`,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const elements = data.elements || [];
      const list: VetHospital[] = [];
      const seen = new Set<string>();

      for (const el of elements) {
        const tags = el.tags || {};
        const name =
          tags.name ||
          tags["name:en"] ||
          tags["name:hi"] ||
          tags["name:te"] ||
          "Veterinary Hospital / Clinic";

        const addrParts: string[] = [];
        if (tags["addr:street"]) addrParts.push(tags["addr:street"]);
        if (tags["addr:suburb"] || tags["addr:neighbourhood"])
          addrParts.push(tags["addr:suburb"] || tags["addr:neighbourhood"]);
        if (tags["addr:city"] || tags["addr:town"] || tags["addr:village"])
          addrParts.push(tags["addr:city"] || tags["addr:town"] || tags["addr:village"]);

        const itemLat = el.lat || (el.center && el.center.lat) || lat;
        const itemLng = el.lon || (el.center && el.center.lon) || lng;
        const key = `${name}-${Math.round(itemLat * 1000)}-${Math.round(itemLng * 1000)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const distKm = calculateDistanceKm(lat, lng, itemLat, itemLng);
        const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          name + " " + (addrParts.join(", ") || "")
        )}&query_place_id=`;

        const is24h =
          tags.opening_hours === "24/7" ||
          /24.*7|emergency|24\s*hours/i.test(name) ||
          tags.emergency === "yes";

        const address =
          addrParts.length > 0
            ? addrParts.join(", ")
            : tags["addr:full"] || "Address not available";

        list.push({
          name,
          address,
          distance: `${distKm} km`,
          distanceKm: distKm,
          phone: tags.phone || tags["contact:phone"] || undefined,
          openNow: is24h ? true : undefined,
          isOpen24Hours: is24h,
          isEmergencyService: is24h || /emergency|trauma|urgent/i.test(name),
          latitude: itemLat,
          longitude: itemLng,
          googleMapsUrl: gMapsUrl,
          source: "OpenStreetMap",
        });
      }

      list.sort((a, b) => a.distanceKm - b.distanceKm);

      if (list.length > 0) {
        const topHospitals = list.slice(0, 10);
        try {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("vetcheck_cached_vethospitals", JSON.stringify(topHospitals));
          }
        } catch {
          // ignore
        }
        return { hospitals: topHospitals, status: "success" };
      }
    }

    // If no Overpass results or rate-limited, check session cache for last successful results
    try {
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem("vetcheck_cached_vethospitals");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { hospitals: parsed, status: "cached" };
          }
        }
      }
    } catch {
      // ignore
    }

    return { hospitals: [], status: "none_found" };
  } catch (err) {
    console.warn("[VetCheck Places Client Fallback] Search error:", err);
    try {
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem("vetcheck_cached_vethospitals");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { hospitals: parsed, status: "cached" };
          }
        }
      }
    } catch {
      // ignore
    }
    return { hospitals: [], status: "api_unavailable" };
  }
}

async function reverseGeocodeClient(lat: number, lon: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18`;
    const res = await fetch(nomUrl, {
      headers: { "User-Agent": "VetCheck-App/1.0 (animal health assistant)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function searchNearbyPetSalonsClient(
  lat: number,
  lng: number,
  _locationName?: string,
  expandedRadius?: boolean
): Promise<{ salons: PetSalon[]; status: string }> {
  try {
    const radii = expandedRadius ? [15000, 35000, 50000] : [5000, 10000, 20000];
    const list: PetSalon[] = [];
    const seen = new Set<string>();

    for (const radius of radii) {
      if (list.length >= 5) break;

      const overpassQuery = `
        [out:json][timeout:12];
        (
          node["shop"="pet_grooming"](around:${radius}, ${lat}, ${lng});
          way["shop"="pet_grooming"](around:${radius}, ${lat}, ${lng});
          relation["shop"="pet_grooming"](around:${radius}, ${lat}, ${lng});
          node["amenity"="pet_grooming"](around:${radius}, ${lat}, ${lng});
          way["amenity"="pet_grooming"](around:${radius}, ${lat}, ${lng});
          node["craft"="pet_groomer"](around:${radius}, ${lat}, ${lng});
          way["craft"="pet_groomer"](around:${radius}, ${lat}, ${lng});
          node["shop"="pet"]["grooming"="yes"](around:${radius}, ${lat}, ${lng});
          way["shop"="pet"]["grooming"="yes"](around:${radius}, ${lat}, ${lng});
          node["shop"="pet"]["service:grooming"="yes"](around:${radius}, ${lat}, ${lng});
          way["shop"="pet"]["service:grooming"="yes"](around:${radius}, ${lat}, ${lng});
          node["shop"="pet"]["name"~"groom|salon|spa|care|bath|parlour|parlor|style",i](around:${radius}, ${lat}, ${lng});
          way["shop"="pet"]["name"~"groom|salon|spa|care|bath|parlour|parlor|style",i](around:${radius}, ${lat}, ${lng});
          node["name"~"pet grooming|dog grooming|cat grooming|pet salon|pet spa|dog spa|pet care|pet parlour|pet parlor",i](around:${radius}, ${lat}, ${lng});
          way["name"~"pet grooming|dog grooming|cat grooming|pet salon|pet spa|dog spa|pet care|pet parlour|pet parlor",i](around:${radius}, ${lat}, ${lng});
        );
        out center 25;
      `;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const elements = data.elements || [];

          for (const el of elements) {
            const tags = el.tags || {};
            const name =
              tags.name ||
              tags["name:en"] ||
              tags["name:hi"] ||
              tags["name:te"] ||
              tags["name:ta"] ||
              tags["name:kn"] ||
              tags["name:ml"] ||
              tags["name:mr"] ||
              tags["name:bn"] ||
              "Pet Grooming Salon";

            const addrParts: string[] = [];
            if (tags["addr:housenumber"]) addrParts.push(tags["addr:housenumber"]);
            if (tags["addr:building"] || tags["addr:unit"])
              addrParts.push(tags["addr:building"] || tags["addr:unit"]);
            if (tags["addr:street"]) addrParts.push(tags["addr:street"]);
            if (tags["addr:place"]) addrParts.push(tags["addr:place"]);
            if (tags["addr:suburb"] || tags["addr:neighbourhood"])
              addrParts.push(tags["addr:suburb"] || tags["addr:neighbourhood"]);
            if (tags["addr:city"] || tags["addr:town"] || tags["addr:village"])
              addrParts.push(tags["addr:city"] || tags["addr:town"] || tags["addr:village"]);
            if (tags["addr:district"]) addrParts.push(tags["addr:district"]);
            if (tags["addr:state"]) addrParts.push(tags["addr:state"]);
            if (tags["addr:postcode"]) addrParts.push(tags["addr:postcode"]);

            let address =
              addrParts.length > 0
                ? addrParts.join(", ")
                : (tags["addr:full"] || null);

            const itemLat = el.lat || (el.center && el.center.lat) || lat;
            const itemLng = el.lon || (el.center && el.center.lon) || lng;

            if (!address && itemLat && itemLng) {
              address = await reverseGeocodeClient(itemLat, itemLng);
            }

            const finalAddress = address || "Address not available";

            const key = `${name.toLowerCase().trim()}-${Math.round(itemLat * 1000)}-${Math.round(itemLng * 1000)}`;

            if (seen.has(key)) continue;
            seen.add(key);

            const distKm = calculateDistanceKm(lat, lng, itemLat, itemLng);
            const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              name + (finalAddress !== "Address not available" ? " " + finalAddress : "")
            )}`;

            const rawPhone =
              tags.phone ||
              tags["contact:phone"] ||
              tags["phone:mobile"] ||
              tags["emergency:phone"] ||
              undefined;

            const is24h = tags.opening_hours === "24/7";

            list.push({
              name,
              address: finalAddress,
              distance: `${distKm} km`,
              distanceKm: distKm,
              phone: rawPhone,
              openNow: is24h ? true : undefined,
              latitude: itemLat,
              longitude: itemLng,
              googleMapsUrl: gMapsUrl,
              services: ["Grooming", "Bathing", "Pet Styling"],
              source: "OpenStreetMap",
            });
          }
        }
      } catch (subErr) {
        console.warn(`[Pet Salons Client] Overpass query for radius ${radius}m error:`, subErr);
      }
    }

    list.sort((a, b) => a.distanceKm - b.distanceKm);

    if (list.length > 0) {
      const topSalons = list.slice(0, 10);
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("vetcheck_cached_petsalons", JSON.stringify(topSalons));
        }
      } catch {
        // ignore
      }
      return { salons: topSalons, status: "success" };
    }

    // Check cached results if any exist
    try {
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem("vetcheck_cached_petsalons");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { salons: parsed, status: "cached" };
          }
        }
      }
    } catch {
      // ignore
    }

    return { salons: [], status: "none_found" };
  } catch (err) {
    console.warn("[VetCheck Pet Salons Client Fallback] Search error:", err);
    try {
      if (typeof window !== "undefined") {
        const cached = sessionStorage.getItem("vetcheck_cached_petsalons");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { salons: parsed, status: "cached" };
          }
        }
      }
    } catch {
      // ignore
    }
    return { salons: [], status: "api_unavailable" };
  }
}

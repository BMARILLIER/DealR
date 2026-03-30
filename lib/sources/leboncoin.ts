import { Car } from "@/lib/types";
import { SearchParams } from "./types";

const FUEL_MAP: Record<string, string> = {
  Essence: "1",
  Diesel: "2",
  GPL: "3",
  Électrique: "4",
  Hybride: "5",
};

const GEARBOX_MAP: Record<string, string> = {
  Manuelle: "1",
  Automatique: "2",
};

function getAttr(attributes: { key: string; value: string }[], key: string): string {
  return attributes?.find((a) => a.key === key)?.value ?? "";
}

function fuelLabel(val: string): string {
  const map: Record<string, string> = { "1": "Essence", "2": "Diesel", "3": "GPL", "4": "Électrique", "5": "Hybride" };
  return map[val] ?? "Autre";
}

function gearboxLabel(val: string): string {
  return val === "2" ? "Automatique" : "Manuelle";
}

export async function searchLeboncoin(params: SearchParams): Promise<Car[]> {
  try {
    const filters: Record<string, unknown> = {
      category: { id: "2" },
      enums: {
        ad_type: ["offer"],
      },
      ranges: {},
    };

    const enums = filters.enums as Record<string, string[]>;
    const ranges = filters.ranges as Record<string, { min?: number; max?: number }>;

    // Brand filter via keywords
    if (params.brands.length > 0) {
      const keywords = params.brands.join(" ");
      if (params.model && params.model !== "__other_model__") {
        filters.keywords = { text: `${keywords} ${params.model}` };
      } else {
        filters.keywords = { text: keywords };
      }
    }

    if (params.maxPrice > 0) {
      ranges.price = { max: params.maxPrice };
    }
    if (params.maxKm > 0) {
      ranges.mileage = { max: params.maxKm };
    }
    if (params.fuel.length > 0) {
      const mapped = params.fuel.map((f) => FUEL_MAP[f]).filter(Boolean);
      if (mapped.length > 0) enums.fuel = mapped;
    }
    if (params.gearbox && GEARBOX_MAP[params.gearbox]) {
      enums.gearbox = [GEARBOX_MAP[params.gearbox]];
    }
    if (params.yearMin > 0 || params.yearMax > 0) {
      const yr: { min?: number; max?: number } = {};
      if (params.yearMin > 0) yr.min = params.yearMin;
      if (params.yearMax > 0) yr.max = params.yearMax;
      ranges.vehicle_year = yr;
    }
    if (params.seller === "Particulier") enums.owner_type = ["private"];
    if (params.seller === "Professionnel") enums.owner_type = ["pro"];

    if (params.location) {
      filters.location = {
        locations: [{ locationType: "city", label: params.location }],
      };
    }

    const body = {
      limit: 30,
      filters,
      sort_by: "time",
      sort_order: "desc",
    };

    const res = await fetch("https://api.leboncoin.fr/finder/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": "ba0c2dad52b3ec",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        Origin: "https://www.leboncoin.fr",
        Referer: "https://www.leboncoin.fr/",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Leboncoin API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const ads = data.ads ?? data.results ?? [];

    return ads.slice(0, 30).map((ad: Record<string, unknown>, i: number) => {
      const attrs = (ad.attributes ?? []) as { key: string; value: string }[];
      const price = Array.isArray(ad.price) ? ad.price[0] : (ad.price ?? 0);
      const km = parseInt(getAttr(attrs, "mileage") || "0", 10);
      const year = parseInt(getAttr(attrs, "vehicle_year") || "0", 10);
      const fuelVal = getAttr(attrs, "fuel");
      const gearVal = getAttr(attrs, "gearbox");
      const loc = ad.location as Record<string, string> | undefined;
      const owner = ad.owner as Record<string, string> | undefined;
      const firstPub = (ad.first_publication_date ?? ad.index_date ?? "") as string;
      const postedAt = firstPub ? firstPub.split(" ")[0] : new Date().toISOString().split("T")[0];

      // Estimate market price: slightly above listing price
      const estimatedMarket = Math.round((price as number) * 1.05);

      const brandFromTitle = params.brands.find((b) =>
        ((ad.subject ?? "") as string).toLowerCase().includes(b.toLowerCase())
      ) ?? params.brands[0] ?? "";

      return {
        id: 100000 + i + (ad.list_id ? Number(ad.list_id) % 100000 : 0),
        title: (ad.subject ?? "") as string,
        brand: brandFromTitle,
        model: params.model && params.model !== "__other_model__" ? params.model : "",
        price: price as number,
        km,
        year,
        fuel: fuelLabel(fuelVal),
        gearbox: gearboxLabel(gearVal),
        seller: owner?.type === "pro" ? "Professionnel" : "Particulier",
        location: loc?.city ?? loc?.zipcode ?? "",
        trim: getAttr(attrs, "vehicle_engine") || "",
        equipment: [],
        days_online: 0,
        estimated_market_price: estimatedMarket,
        source: "Leboncoin" as const,
        platform: "leboncoin",
        url: (ad.url ?? `https://www.leboncoin.fr/voitures/${ad.list_id}.htm`) as string,
        posted_at: postedAt,
        price_history: [price as number],
      };
    });
  } catch (err) {
    console.error("Leboncoin search failed:", err);
    return [];
  }
}

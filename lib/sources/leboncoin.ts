import { Car } from "@/lib/types";
import { SearchParams } from "./types";

const FUEL_MAP: Record<string, string> = {
  Essence: "1",
  Diesel: "2",
  GPL: "3",
  Électrique: "4",
  Hybride: "5",
};

const FUEL_LABEL: Record<string, string> = {
  "1": "Essence",
  "2": "Diesel",
  "3": "GPL",
  "4": "Électrique",
  "5": "Hybride",
};

const GEARBOX_MAP: Record<string, string> = {
  Manuelle: "1",
  Automatique: "2",
};

function getAttr(
  attributes: { key: string; value?: string; values?: string }[],
  key: string
): string {
  const a = attributes?.find((a) => a.key === key);
  return a?.value ?? a?.values ?? "";
}

export async function searchLeboncoin(params: SearchParams): Promise<Car[]> {
  try {
    const enums: Record<string, string[]> = { ad_type: ["offer"] };
    const ranges: Record<string, { min?: number; max?: number }> = {};

    if (params.fuel.length > 0) {
      const mapped = params.fuel.map((f) => FUEL_MAP[f]).filter(Boolean);
      if (mapped.length > 0) enums.fuel = mapped;
    }
    if (params.gearbox && GEARBOX_MAP[params.gearbox]) {
      enums.gearbox = [GEARBOX_MAP[params.gearbox]];
    }
    if (params.seller === "Particulier") enums.owner_type = ["private"];
    if (params.seller === "Professionnel") enums.owner_type = ["pro"];

    if (params.maxPrice > 0) ranges.price = { max: params.maxPrice };
    if (params.maxKm > 0) ranges.mileage = { max: params.maxKm };
    if (params.yearMin > 0 || params.yearMax > 0) {
      const yr: { min?: number; max?: number } = {};
      if (params.yearMin > 0) yr.min = params.yearMin;
      if (params.yearMax > 0) yr.max = params.yearMax;
      ranges.regdate = yr;
    }

    const keywords =
      params.brands.length > 0
        ? params.brands.join(" ") +
          (params.model && params.model !== "__other_model__"
            ? ` ${params.model}`
            : "")
        : "";

    const filters: Record<string, unknown> = {
      category: { id: "2" },
      enums,
      ranges,
    };
    if (keywords) filters.keywords = { text: keywords };
    if (params.location) {
      filters.location = {
        locations: [{ locationType: "city", label: params.location }],
      };
    }

    const res = await fetch("https://api.leboncoin.fr/finder/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LBC;Android;13;phone;13.8.3.0;640x1136;22",
      },
      body: JSON.stringify({
        limit: 30,
        filters,
        sort_by: "time",
        sort_order: "desc",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Leboncoin API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const ads = data.ads ?? [];

    return ads.map(
      (
        ad: Record<string, unknown>,
        i: number
      ): Car => {
        const attrs = (ad.attributes ?? []) as {
          key: string;
          value?: string;
          values?: string;
        }[];
        const price = Array.isArray(ad.price)
          ? (ad.price[0] as number)
          : ((ad.price ?? 0) as number);
        const km = parseInt(getAttr(attrs, "mileage") || "0", 10);
        const year = parseInt(getAttr(attrs, "regdate") || "0", 10);
        const fuelVal = getAttr(attrs, "fuel");
        const gearVal = getAttr(attrs, "gearbox");
        const loc = ad.location as Record<string, string> | undefined;
        const owner = ad.owner as Record<string, string> | undefined;
        const firstPub = (ad.first_publication_date ?? "") as string;
        const postedAt = firstPub
          ? firstPub.split(" ")[0]
          : new Date().toISOString().split("T")[0];

        const brandAttr = getAttr(attrs, "u_car_brand") || getAttr(attrs, "brand");
        const modelAttr = getAttr(attrs, "u_car_model");
        // u_car_model format: "BMW_Série 2" -> extract after "_"
        const modelClean = modelAttr.includes("_")
          ? modelAttr.split("_").slice(1).join("_")
          : modelAttr;

        const images = ad.images as { urls?: string[] } | undefined;
        const imageUrl = images?.urls?.[0] ?? "";

        return {
          id: (ad.list_id as number) ?? 100000 + i,
          title: (ad.subject ?? "") as string,
          brand: brandAttr || params.brands[0] || "",
          model: modelClean || "",
          price,
          km,
          year,
          fuel: FUEL_LABEL[fuelVal] ?? "Autre",
          gearbox: gearVal === "2" ? "Automatique" : "Manuelle",
          seller:
            owner?.type === "pro" ? "Professionnel" : "Particulier",
          location: loc?.city ?? loc?.city_label ?? "",
          trim: "",
          equipment: (ad.subject as string)?.includes("GPS")
            ? ["GPS"]
            : [],
          days_online: 0,
          estimated_market_price: Math.round(price * 1.05),
          source: "Leboncoin" as const,
          platform: "leboncoin",
          url: (ad.url ??
            `https://www.leboncoin.fr/ad/voitures/${ad.list_id}`) as string,
          posted_at: postedAt,
          price_history: [price],
          image: imageUrl,
        };
      }
    );
  } catch (err) {
    console.error("Leboncoin search failed:", err);
    return [];
  }
}

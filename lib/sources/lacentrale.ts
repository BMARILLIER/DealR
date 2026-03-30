import { Car } from "@/lib/types";
import { SearchParams } from "./types";

const BRAND_SLUGS: Record<string, string> = {
  Peugeot: "peugeot",
  Renault: "renault",
  Volkswagen: "volkswagen",
  BMW: "bmw",
  Audi: "audi",
  Mercedes: "mercedes",
  Toyota: "toyota",
  Citroën: "citroen",
  Fiat: "fiat",
  Ford: "ford",
  Hyundai: "hyundai",
  Kia: "kia",
  Nissan: "nissan",
  Opel: "opel",
  Seat: "seat",
  Skoda: "skoda",
  Dacia: "dacia",
  Mini: "mini",
  Volvo: "volvo",
  Mazda: "mazda",
};

const FUEL_MAP: Record<string, string> = {
  Essence: "ess",
  Diesel: "dies",
  Hybride: "hyb",
  Électrique: "elec",
  GPL: "gpl",
};

export async function searchLaCentrale(params: SearchParams): Promise<Car[]> {
  try {
    // Build search URL params for La Centrale
    const queryParts: string[] = [];

    if (params.brands.length > 0) {
      const slugs = params.brands
        .map((b) => BRAND_SLUGS[b] ?? b.toLowerCase())
        .join(",");
      queryParts.push(`makesModelsCommercialNames=${slugs}`);
    }
    if (params.model && params.model !== "__other_model__") {
      queryParts.push(`modelsCommercialNames=${params.model.toLowerCase()}`);
    }
    if (params.maxPrice > 0) {
      queryParts.push(`priceMax=${params.maxPrice}`);
    }
    if (params.maxKm > 0) {
      queryParts.push(`mileageMax=${params.maxKm}`);
    }
    if (params.yearMin > 0) {
      queryParts.push(`yearMin=${params.yearMin}`);
    }
    if (params.yearMax > 0) {
      queryParts.push(`yearMax=${params.yearMax}`);
    }
    if (params.fuel.length > 0) {
      const fuelSlugs = params.fuel.map((f) => FUEL_MAP[f]).filter(Boolean);
      if (fuelSlugs.length > 0) queryParts.push(`energies=${fuelSlugs.join(",")}`);
    }
    if (params.gearbox === "Automatique") {
      queryParts.push(`gearbox=auto`);
    } else if (params.gearbox === "Manuelle") {
      queryParts.push(`gearbox=manu`);
    }

    queryParts.push("page=1");

    const searchUrl = `https://api.lacentrale.fr/v3/search?category=auto&${queryParts.join("&")}`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        Origin: "https://www.lacentrale.fr",
        Referer: "https://www.lacentrale.fr/listing",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`La Centrale API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const listings = data.results ?? data.ads ?? data.items ?? [];

    return listings.slice(0, 30).map((item: Record<string, unknown>, i: number) => {
      const vehicle = (item.vehicle ?? item) as Record<string, unknown>;
      const pricing = (item.pricing ?? item) as Record<string, unknown>;
      const locData = (item.location ?? item.loc ?? {}) as Record<string, string>;
      const id = (item.id ?? item.classifiedId ?? 200000 + i) as number;

      const title =
        (item.title as string) ??
        `${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.version ?? ""}`.trim();
      const price = (pricing.price ?? pricing.amount ?? item.price ?? 0) as number;
      const km = (vehicle.mileage ?? vehicle.km ?? item.mileage ?? 0) as number;
      const year = (vehicle.year ?? item.year ?? 0) as number;

      const postedAt =
        ((item.publishedAt ?? item.firstOnlineDate ?? item.createdAt ?? "") as string).split("T")[0] ||
        new Date().toISOString().split("T")[0];

      return {
        id: typeof id === "number" ? id : 200000 + i,
        title,
        brand: (vehicle.make ?? vehicle.brand ?? params.brands[0] ?? "") as string,
        model: (vehicle.model ?? params.model ?? "") as string,
        price,
        km,
        year,
        fuel: (vehicle.fuel ?? vehicle.energy ?? "Essence") as string,
        gearbox: (vehicle.gearbox ?? "Manuelle") as string,
        seller: (item.sellerType === "pro" ? "Professionnel" : "Particulier") as string,
        location: (locData.city ?? locData.zipCode ?? locData.department ?? "") as string,
        trim: (vehicle.version ?? vehicle.trim ?? "") as string,
        equipment: [],
        days_online: 0,
        estimated_market_price: Math.round(price * 1.05),
        source: "La Centrale" as const,
        platform: "lacentrale",
        url: (item.url ?? `https://www.lacentrale.fr/auto-occasion-annonce-${id}.html`) as string,
        posted_at: postedAt,
        price_history: [price],
      };
    });
  } catch (err) {
    console.error("La Centrale search failed:", err);
    return [];
  }
}

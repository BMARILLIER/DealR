import { Car } from "@/lib/types";
import { SearchParams } from "./types";

const BRAND_IDS: Record<string, string> = {
  Peugeot: "54",
  Renault: "58",
  Volkswagen: "74",
  BMW: "9",
  Audi: "5",
  Mercedes: "47",
  Toyota: "71",
  Citroën: "15",
  Fiat: "22",
  Ford: "24",
  Hyundai: "33",
  Kia: "36",
  Nissan: "51",
  Opel: "53",
  Seat: "62",
  Skoda: "63",
  Dacia: "16",
  Mini: "48",
  Volvo: "75",
  Mazda: "45",
};

const FUEL_MAP: Record<string, string> = {
  Essence: "B",
  Diesel: "D",
  Hybride: "2",
  Électrique: "E",
  GPL: "L",
};

export async function searchAutoScout24(params: SearchParams): Promise<Car[]> {
  try {
    const queryParts: string[] = ["cy=F", "sort=standard", "desc=0", "ustate=N%2CU", "size=30", "page=1", "atype=C"];

    if (params.brands.length > 0) {
      const makeIds = params.brands.map((b) => BRAND_IDS[b] ?? "").filter(Boolean);
      if (makeIds.length > 0) queryParts.push(`make=${makeIds.join(",")}`);
      else {
        // Fallback: search by name
        queryParts.push(`search=${encodeURIComponent(params.brands.join(" "))}`);
      }
    }
    if (params.maxPrice > 0) queryParts.push(`priceto=${params.maxPrice}`);
    if (params.maxKm > 0) queryParts.push(`kmto=${params.maxKm}`);
    if (params.yearMin > 0) queryParts.push(`fregfrom=${params.yearMin}`);
    if (params.yearMax > 0) queryParts.push(`fregto=${params.yearMax}`);
    if (params.fuel.length > 0) {
      const mapped = params.fuel.map((f) => FUEL_MAP[f]).filter(Boolean);
      if (mapped.length > 0) queryParts.push(`fuel=${mapped.join(",")}`);
    }
    if (params.gearbox === "Automatique") queryParts.push("gear=A");
    else if (params.gearbox === "Manuelle") queryParts.push("gear=M");

    const url = `https://www.autoscout24.fr/lst?${queryParts.join("&")}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`AutoScout24 error: ${res.status}`);
      return [];
    }

    const html = await res.text();

    // Extract JSON-LD or __NEXT_DATA__ from the page
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);

    const cars: Car[] = [];

    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const listings =
          nextData?.props?.pageProps?.listings ??
          nextData?.props?.pageProps?.searchResult?.listings ??
          [];

        for (let i = 0; i < Math.min(listings.length, 30); i++) {
          const item = listings[i];
          const v = item.vehicle ?? item;
          const price = item.price ?? item.prices?.public?.priceRaw ?? v.price ?? 0;
          const km = v.mileage ?? v.km ?? 0;
          const year = v.firstRegistration
            ? parseInt(v.firstRegistration.split("/").pop() ?? "0", 10)
            : v.year ?? 0;
          const postedAt = (item.createdAt ?? item.publishedAt ?? "").split("T")[0] || new Date().toISOString().split("T")[0];

          cars.push({
            id: 300000 + i + (item.id ? Number(String(item.id).replace(/\D/g, "").slice(0, 6)) : 0),
            title: v.title ?? `${v.make ?? ""} ${v.model ?? ""} ${v.version ?? ""}`.trim(),
            brand: v.make ?? v.brand ?? params.brands[0] ?? "",
            model: v.model ?? "",
            price,
            km,
            year,
            fuel: v.fuelType ?? v.fuel ?? "Essence",
            gearbox: v.transmissionType === "A" || v.gearbox === "Automatique" ? "Automatique" : "Manuelle",
            seller: v.sellerType === "D" ? "Professionnel" : "Particulier",
            location: v.location?.city ?? v.city ?? "",
            trim: v.version ?? "",
            equipment: [],
            days_online: 0,
            estimated_market_price: Math.round(price * 1.05),
            source: "AutoScout24" as const,
            platform: "autoscout24",
            url: item.url
              ? `https://www.autoscout24.fr${item.url}`
              : `https://www.autoscout24.fr/offres/${item.id}`,
            posted_at: postedAt,
            price_history: [price],
          });
        }
      } catch (e) {
        console.error("AutoScout24 parse error:", e);
      }
    }

    // Try JSON-LD as fallback
    if (cars.length === 0 && jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const items = Array.isArray(jsonLd) ? jsonLd : jsonLd.itemListElement ?? [];
        for (let i = 0; i < Math.min(items.length, 30); i++) {
          const item = items[i].item ?? items[i];
          cars.push({
            id: 300000 + i,
            title: item.name ?? "",
            brand: item.brand?.name ?? params.brands[0] ?? "",
            model: item.model ?? "",
            price: item.offers?.price ?? 0,
            km: item.mileageFromOdometer?.value ?? 0,
            year: item.vehicleModelDate ?? 0,
            fuel: item.fuelType ?? "Essence",
            gearbox: item.vehicleTransmission === "Automatique" ? "Automatique" : "Manuelle",
            seller: "Particulier",
            location: "",
            trim: "",
            equipment: [],
            days_online: 0,
            estimated_market_price: Math.round((item.offers?.price ?? 0) * 1.05),
            source: "AutoScout24" as const,
            platform: "autoscout24",
            url: item.url ?? "",
            posted_at: new Date().toISOString().split("T")[0],
            price_history: [item.offers?.price ?? 0],
          });
        }
      } catch (e) {
        console.error("AutoScout24 JSON-LD parse error:", e);
      }
    }

    return cars;
  } catch (err) {
    console.error("AutoScout24 search failed:", err);
    return [];
  }
}

import { Car } from "@/lib/types";
import { SearchParams } from "./types";

const BRAND_SLUGS: Record<string, string> = {
  Peugeot: "peugeot",
  Renault: "renault",
  Volkswagen: "volkswagen",
  BMW: "bmw",
  Audi: "audi",
  Mercedes: "mercedes-benz",
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
  Porsche: "porsche",
  "Alfa Romeo": "alfa-romeo",
  Jeep: "jeep",
  "Land Rover": "land-rover",
  Suzuki: "suzuki",
  Honda: "honda",
  Mitsubishi: "mitsubishi",
  Cupra: "cupra",
  DS: "ds-automobiles",
  Tesla: "tesla",
};

const FUEL_MAP: Record<string, string> = {
  Essence: "B",
  Diesel: "D",
  Hybride: "2",
  Électrique: "E",
  GPL: "L",
};

export async function searchAutoScout24(
  params: SearchParams
): Promise<Car[]> {
  try {
    // Build URL path with brand slug
    const brandSlug =
      params.brands.length === 1
        ? BRAND_SLUGS[params.brands[0]] ?? params.brands[0].toLowerCase()
        : "";

    const queryParts: string[] = [
      "cy=F",
      "atype=C",
      "ustate=N%2CU",
      "size=20",
      "page=1",
      "sort=standard",
      "desc=0",
    ];

    // Multiple brands via mmvmk query param
    if (params.brands.length > 1) {
      const slugs = params.brands
        .map((b) => BRAND_SLUGS[b] ?? b.toLowerCase())
        .filter(Boolean);
      queryParts.push(`mmvmk0=${slugs[0]}`);
      if (slugs[1]) queryParts.push(`mmvmk1=${slugs[1]}`);
    }
    if (params.model && params.model !== "__other_model__" && params.brands.length === 1) {
      queryParts.push(`mmvmd0=${encodeURIComponent(params.model.toLowerCase())}`);
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

    const path = brandSlug ? `/lst/${brandSlug}` : "/lst";
    const url = `https://www.autoscout24.fr${path}?${queryParts.join("&")}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`AutoScout24 error: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
    );

    if (!nextDataMatch) {
      console.error("AutoScout24: no __NEXT_DATA__ found");
      return [];
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const listings = nextData?.props?.pageProps?.listings ?? [];

    return listings.map(
      (
        item: Record<string, unknown>,
        i: number
      ): Car => {
        const v = item.vehicle as Record<string, string>;
        const p = item.price as Record<string, unknown>;
        const loc = item.location as Record<string, string>;
        const seller = item.seller as Record<string, unknown>;
        const details = (item.vehicleDetails ?? []) as {
          data: string;
          ariaLabel: string;
        }[];
        const images = (item.images ?? []) as string[];

        // Parse price from formatted string "€ 7 990"
        const priceStr = (p?.priceFormatted ?? "0") as string;
        const price = parseInt(priceStr.replace(/[^\d]/g, ""), 10) || 0;

        // Parse km from "210 500 km"
        const kmStr = v?.mileageInKm ?? "0";
        const km = parseInt(kmStr.replace(/[^\d]/g, ""), 10) || 0;

        // Parse year from details "08/2015"
        const dateDetail = details.find(
          (d) => d.ariaLabel === "1ère immatriculation"
        );
        const yearStr = dateDetail?.data ?? "";
        const yearMatch = yearStr.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

        // Posted date from detail or fallback
        const postedAt = yearStr
          ? `${yearStr.split("/").reverse().join("-")}`
          : new Date().toISOString().split("T")[0];

        const title = `${v?.make ?? ""} ${v?.modelGroup ?? v?.model ?? ""} ${v?.modelVersionInput ?? ""}`.trim();

        // Equipment from subtitle
        const subtitle = (v?.subtitle ?? "") as string;
        const equipment = subtitle
          ? subtitle.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        // Image URL - get higher res
        const imageUrl = images[0]
          ? images[0].replace("/250x188.webp", "/720x540.webp")
          : "";

        const sellerType = (seller?.type ?? "Private") as string;

        return {
          id: 300000 + i,
          title,
          brand: v?.make ?? params.brands[0] ?? "",
          model: v?.modelGroup ?? v?.model ?? "",
          price,
          km,
          year,
          fuel: v?.fuel ?? "Essence",
          gearbox: v?.transmission === "Boîte manuelle" ? "Manuelle" : "Automatique",
          seller:
            sellerType === "Dealer" ? "Professionnel" : "Particulier",
          location: loc?.city ?? "",
          trim: v?.modelVersionInput ?? "",
          equipment,
          days_online: 0,
          estimated_market_price: Math.round(price * 1.05),
          source: "AutoScout24" as const,
          platform: "autoscout24",
          url: `https://www.autoscout24.fr${(item.url as string) ?? ""}`,
          posted_at: new Date().toISOString().split("T")[0],
          price_history: [price],
          image: imageUrl,
        };
      }
    );
  } catch (err) {
    console.error("AutoScout24 search failed:", err);
    return [];
  }
}

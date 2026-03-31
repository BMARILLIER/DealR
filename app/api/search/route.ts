import { NextResponse } from "next/server";
import { searchLeboncoin } from "@/lib/sources/leboncoin";
import { searchLaCentrale } from "@/lib/sources/lacentrale";
import { searchAutoScout24 } from "@/lib/sources/autoscout24";
import { SearchParams } from "@/lib/sources/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const params: SearchParams = await request.json();

    // Determine which sources to query
    const sources = params.sources.length > 0 ? params.sources : ["Leboncoin", "AutoScout24"];

    // Query all sources in parallel
    const promises: Promise<{ source: string; cars: unknown[]; error?: string }>[] = [];

    if (sources.includes("Leboncoin")) {
      promises.push(
        searchLeboncoin(params)
          .then((cars) => ({ source: "Leboncoin", cars }))
          .catch((e) => ({ source: "Leboncoin", cars: [], error: String(e) }))
      );
    }
    if (sources.includes("La Centrale")) {
      promises.push(
        searchLaCentrale(params)
          .then((cars) => ({ source: "La Centrale", cars }))
          .catch((e) => ({ source: "La Centrale", cars: [], error: String(e) }))
      );
    }
    if (sources.includes("AutoScout24")) {
      promises.push(
        searchAutoScout24(params)
          .then((cars) => ({ source: "AutoScout24", cars }))
          .catch((e) => ({ source: "AutoScout24", cars: [], error: String(e) }))
      );
    }

    const results = await Promise.all(promises);

    const allCars = results.flatMap((r) => r.cars);
    const sourceStatus = results.map((r) => ({
      source: r.source,
      count: r.cars.length,
      error: r.error,
    }));

    return NextResponse.json({ cars: allCars, sources: sourceStatus });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json(
      { cars: [], sources: [], error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

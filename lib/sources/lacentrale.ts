import { Car } from "@/lib/types";
import { SearchParams } from "./types";

// La Centrale bloque les requêtes serveur (403).
// Ce fetcher est désactivé en attendant une solution.
export async function searchLaCentrale(_params: SearchParams): Promise<Car[]> {
  return [];
}

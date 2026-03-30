export interface Car {
  id: number;
  title: string;
  brand: string;
  model: string;
  price: number;
  km: number;
  year: number;
  fuel: string;
  gearbox: string;
  seller: string;
  location: string;
  trim: string;
  equipment: string[];
  days_online: number;
  estimated_market_price: number;
  source: "Leboncoin" | "La Centrale" | "AutoScout24";
  platform: string;
  url: string;
  posted_at: string;
  price_history: number[];
}

export interface BuyDecision {
  action: "Acheter maintenant" | "Négocier" | "Attendre";
  reason: string;
  icon: string;
}

export interface MarketPrice {
  dealr_market_price: number;
  gap: number;
  gap_percent: number;
  negotiated_price: number;
}

export interface PublicationInfo {
  posted_date: string;       // "12/03/2026"
  duration_label: string;    // "Depuis 45 jours" or "Depuis 2 mois"
  computed_days: number;
}

export interface ScoredCar extends Car {
  score: number;
  label: "Excellent" | "Bon" | "Moyen";
  target_price: number;
  negotiation_message: string;
  decision: BuyDecision;
  market: MarketPrice;
  publication: PublicationInfo;
}

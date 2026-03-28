import { BuyDecision, Car, MarketPrice, PublicationInfo, ScoredCar } from "./types";

function computeScore(car: Car): number {
  let score = 100;

  // Price penalty
  if (car.price > 17000) score -= 20;

  // KM penalties
  if (car.km > 100000) score -= 25;
  else if (car.km > 70000) score -= 15;

  // Days online bonus (seller motivation)
  if (car.days_online > 60) score += 25;
  else if (car.days_online > 30) score += 15;

  // Below market price bonus
  if (car.price < car.estimated_market_price * 0.9) score += 15;

  return Math.max(0, Math.min(100, score));
}

function getLabel(score: number): "Excellent" | "Bon" | "Moyen" {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  return "Moyen";
}

function computeTargetPrice(car: Car): number {
  if (car.days_online > 60) return Math.round(car.price * 0.88);
  if (car.days_online > 30) return Math.round(car.price * 0.92);
  return car.price;
}

function generateMessage(car: Car): string {
  const target = computeTargetPrice(car);
  if (car.days_online <= 30) {
    return `Bonjour, votre véhicule ${car.title} m'intéresse. Est-il toujours disponible ?`;
  }
  if (car.days_online <= 60) {
    return `Bonjour, votre ${car.title} m'intéresse. L'annonce étant en ligne depuis ${car.days_online} jours, seriez-vous ouvert à une offre à ${target.toLocaleString("fr-FR")} € ?`;
  }
  return `Bonjour, votre ${car.title} m'intéresse. L'annonce étant publiée depuis ${car.days_online} jours, je me permets de vous proposer ${target.toLocaleString("fr-FR")} €. Qu'en pensez-vous ?`;
}

function getBuyDecision(score: number, days_online: number): BuyDecision {
  if (score > 80 && days_online < 20)
    return { action: "Acheter maintenant", reason: "Score élevé, annonce récente", icon: "🔥" };
  if (score > 70 && days_online > 30)
    return { action: "Négocier", reason: "Bon score, vendeur potentiellement flexible", icon: "💬" };
  return { action: "Attendre", reason: "Conditions pas encore optimales", icon: "⏳" };
}

function computeMarketPrice(car: Car): MarketPrice {
  // DEALR market estimate: base from similar listings, adjusted for km and year
  const currentYear = new Date().getFullYear();
  const age = currentYear - car.year;
  const avgKm = 15000; // average km/year

  // Start from estimated market price (average of similar listings)
  let marketPrice = car.estimated_market_price;

  // Km adjustment: penalize excess km, bonus for low km
  const expectedKm = age * avgKm;
  const kmDelta = car.km - expectedKm;
  const kmAdjustment = -(kmDelta * 0.04); // 4 cents per km delta
  marketPrice = Math.round(marketPrice + kmAdjustment);

  // Age adjustment: slight depreciation for older cars
  if (age > 4) marketPrice = Math.round(marketPrice * 0.97);

  marketPrice = Math.max(marketPrice, 1000);

  const gap = car.price - marketPrice;
  const gap_percent = Math.round((gap / marketPrice) * 100);

  // Negotiated price: market price minus negotiation leverage
  let discount = 0;
  if (car.days_online > 60) discount = 0.08;
  else if (car.days_online > 30) discount = 0.05;
  const negotiated_price = Math.round(marketPrice * (1 - discount));

  return {
    dealr_market_price: marketPrice,
    gap,
    gap_percent,
    negotiated_price,
  };
}

function computePublication(car: Car): PublicationInfo {
  const posted = new Date(car.posted_at);
  const now = new Date();
  const diffMs = now.getTime() - posted.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const posted_date = posted.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  let duration_label: string;
  if (days < 30) {
    duration_label = `Depuis ${days} jour${days !== 1 ? "s" : ""}`;
  } else {
    const months = Math.round(days / 30);
    duration_label = `Depuis ${months} mois`;
  }

  return { posted_date, duration_label, computed_days: days };
}

export function scoreCar(car: Car): ScoredCar {
  const pub = computePublication(car);
  const carWithDays = { ...car, days_online: pub.computed_days };
  const score = computeScore(carWithDays);
  return {
    ...carWithDays,
    score,
    label: getLabel(score),
    target_price: computeTargetPrice(carWithDays),
    negotiation_message: generateMessage(carWithDays),
    decision: getBuyDecision(score, carWithDays.days_online),
    market: computeMarketPrice(carWithDays),
    publication: pub,
  };
}

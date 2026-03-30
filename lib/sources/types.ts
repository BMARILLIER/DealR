export interface SearchParams {
  brands: string[];
  model: string;
  maxPrice: number;
  maxKm: number;
  fuel: string[];
  gearbox: string;
  yearMin: number;
  yearMax: number;
  location: string;
  radius: number;
  seller: string;
  sources: string[];
}

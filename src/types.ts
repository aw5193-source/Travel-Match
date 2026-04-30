/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TravelVibe {
  RELAXING = 'relaxing',
  ADVENTUROUS = 'adventurous',
  CULTURAL = 'cultural',
  NATURE = 'nature',
  URBAN = 'urban',
  LUXURY = 'luxury',
}

export enum BudgetLevel {
  BUDGET = 'budget',
  MODERATE = 'moderate',
  LUXURY = 'luxury',
}

export interface UserPreferences {
  vibe: TravelVibe[]; // Basic vibes
  budget: BudgetLevel;
  climate: 'warm' | 'cold' | 'temperate' | 'any';
  travelers: 'solo' | 'couple' | 'family' | 'friends';
  interests: string[];
  // New granular categories
  scenery: string[];
  culture: string[];
  food: string[];
  adventure: string[];
  nightlife: string[];
  priorities: {
    safety: boolean;
    comfort: boolean;
    accessibility: boolean;
    walkability: boolean;
    value: boolean;
  };
  pace: 'relaxed' | 'neutral' | 'energetic';
  density: 'quiet' | 'neutral' | 'vibrant';
  customDirectives: string;
}

export interface LocationMatch {
  id: string;
  name: string;
  country: string;
  description: string;
  coordinates: { lat: number; lng: number };
  matchScore: number;
  imageUrl: string;
  images?: string[];
}

export interface ResidentialOption {
  name: string;
  type: string;
  description: string;
  priceRange: string;
  imageUrl: string;
  images?: string[];
  sourceLink?: string;
}

export interface PlaceToVisit {
  name: string;
  description: string;
  imageUrl: string;
  images?: string[];
  sourceLink?: string;
}

export interface FoodOption {
  name: string;
  description: string;
  imageUrl: string;
  images?: string[];
  sourceLink?: string;
}

export interface EventActivity {
  name: string;
  description: string;
  imageUrl: string;
  images?: string[];
  sourceLink?: string;
}

export interface DetailedLocationInfo {
  overview: string;
  residential: ResidentialOption[];
  places: PlaceToVisit[];
  food: FoodOption[];
  activities: EventActivity[];
}

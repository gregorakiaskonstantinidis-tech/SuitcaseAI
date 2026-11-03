export type Clothing = {
  id: string
  name: string
  category: string
  color: string
  image: string
}

export type Luggage = {
  id: string
  name: string
  type: string
  capacity: number
  dimensions: string
  image: string
}

export type TripPreferences = {
  outfitCount: number
  reuse: boolean
  hybrid: boolean
  laundry: boolean
}

export type WeatherEstimate = {
  category: string
  summary: string
  minTemp: number
  maxTemp: number
  rainChance: number
  source: 'forecast' | 'climate' | 'seasonal' | 'fallback'
  location: string
  coverage: string
  note?: string
}

export type PackingItem = {
  id: string
  name: string
  category: string
  quantity: number
  packed: boolean
  wardrobeId?: string
  recommendationReason?: string
}

export type Trip = {
  id: string
  destination: string
  departure: string
  returnDate: string
  days: number
  luggageId: string
  activities: string[]
  weather: string
  weatherEstimate?: WeatherEstimate
  preferences: TripPreferences
  outfits?: Outfit[]
  packing: PackingItem[]
  checklist: PackingItem[]
  createdAt: string
}

export type Outfit = {
  id: string
  name: string
  occasion: string
  items: Clothing[]
  suggestions?: OutfitSuggestion[]
  hybrid: boolean
  note?: string
  reason?: string
}

export type OutfitSuggestion = {
  name: string
  category: string
  reason: string
}

export type LearningProfile = {
  itemPreference: Record<string, number>
  colorPreference: Record<string, number>
  categoryPreference: Record<string, number>
  feedbackCount: number
}

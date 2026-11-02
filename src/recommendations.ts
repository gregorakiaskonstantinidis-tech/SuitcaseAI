import type { Clothing, LearningProfile, Outfit, PackingItem, Trip } from './types'
import { defaultChecklist } from './data'
import { learnedItemScore, initialLearningProfile } from './learning'

const topCategories = new Set(['T-shirts', 'Shirts'])
const bottomCategories = new Set(['Trousers', 'Jeans', 'Shorts', 'Skirts'])

const activityFit: Record<string, string[]> = {
  sightseeing: ['T-shirts', 'Shirts', 'Jeans', 'Trousers', 'Shoes', 'Accessories'],
  'city exploration': ['T-shirts', 'Shirts', 'Jeans', 'Trousers', 'Shoes', 'Accessories'],
  beach: ['Shorts', 'Dresses', 'T-shirts', 'Shoes', 'Accessories'],
  'business meetings': ['Shirts', 'Trousers', 'Shoes', 'Jackets', 'Dresses'],
  'formal dinners': ['Shirts', 'Trousers', 'Shoes', 'Dresses', 'Jackets'],
  nightlife: ['Shirts', 'Trousers', 'Dresses', 'Shoes', 'Accessories'],
  hiking: ['T-shirts', 'Trousers', 'Shorts', 'Shoes', 'Jackets'],
  sports: ['T-shirts', 'Shorts', 'Shoes', 'Jackets'],
  shopping: ['T-shirts', 'Shirts', 'Jeans', 'Trousers', 'Shoes', 'Accessories'],
  relaxation: ['T-shirts', 'Shorts', 'Dresses', 'Shoes'],
}

function activityScore(item: Clothing, activities: string[]) {
  const category = item.category
  const text = `${item.name} ${category}`.toLowerCase()
  return activities.reduce((score, activity) => {
    const key = activity.toLowerCase()
    const match = Object.keys(activityFit).find((knownActivity) => key.includes(knownActivity) || knownActivity.includes(key))
    if (match) return score + (activityFit[match].includes(category) ? 3 : 0)
    if (/business|meeting|formal|office|interview/.test(text)) return score + (/business|formal|dinner/.test(key) ? 3 : 0)
    if (/sport|hiking|trail|active/.test(text)) return score + (/sport|hiking|outdoor/.test(key) ? 3 : 0)
    if (/swim|beach|linen|short/.test(text)) return score + (/beach|relax|warm/.test(key) ? 2 : 0)
    return score + (['T-shirts', 'Shirts', 'Jeans', 'Trousers', 'Shoes'].includes(category) ? 1 : 0)
  }, 0)
}

function weatherScore(item: Clothing, weather: string) {
  const name = item.name.toLowerCase()
  if (weather === 'Warm & sunny') {
    if (['Shorts', 'Dresses', 'T-shirts'].includes(item.category) || /linen|lightweight|cotton/.test(name)) return 3
    if (item.category === 'Jackets' || /wool|heavy|winter/.test(name)) return -3
    return 1
  }
  if (weather === 'Cool & crisp') {
    if (['Jackets', 'Trousers', 'Jeans'].includes(item.category)) return 4
    if (item.category === 'Shorts') return -3
    return 1
  }
  if (weather === 'Rainy') {
    if (item.category === 'Jackets' || /waterproof|rain|boot/i.test(name)) return 4
    if (item.category === 'Shorts') return -2
    return 1
  }
  return 2
}

function colorHarmony(items: Clothing[]) {
  const colors = new Set(items.map((item) => item.color.toLowerCase()))
  if (colors.size < 2) return 1
  const neutrals = ['black', 'white', 'ivory', 'cream', 'navy', 'indigo', 'sand', 'tan', 'oatmeal', 'stone', 'grey', 'gray']
  return [...colors].filter((color) => neutrals.some((neutral) => color.includes(neutral))).length > 0 ? 2 : 0
}

function itemScore(item: Clothing, activities: string[], weather: string, learning: LearningProfile) {
  return activityScore(item, activities) + weatherScore(item, weather) + learnedItemScore(item, learning)
}

function estimatedLitres(item: Clothing) {
  if (item.category === 'Shoes') return 2.2
  if (item.category === 'Jackets') return 3.5
  if (item.category === 'Dresses') return 1.6
  if (bottomCategories.has(item.category)) return 1.2
  if (item.category === 'Accessories') return 0.6
  return 0.7
}

export function recommendOutfits(
  wardrobe: Clothing[],
  trip: Pick<Trip, 'activities' | 'preferences' | 'weather'>,
  learning: LearningProfile = initialLearningProfile,
  bagCapacity = 38,
): Outfit[] {
  const count = Math.max(1, Math.min(trip.preferences.outfitCount, 8))
  const activities = trip.activities.length ? trip.activities : ['Sightseeing']
  const tops = wardrobe.filter((item) => topCategories.has(item.category))
  const bottoms = wardrobe.filter((item) => bottomCategories.has(item.category))
  const dresses = wardrobe.filter((item) => item.category === 'Dresses')
  const shoes = wardrobe.filter((item) => item.category === 'Shoes')
  const candidates: Array<{ items: Clothing[]; activity: string; score: number; hybridActivity?: string }> = []
  const combinations: Clothing[][] = [
    ...tops.flatMap((top) => bottoms.flatMap((bottom) => shoes.map((shoe) => [top, bottom, shoe]))),
    ...dresses.flatMap((dress) => shoes.map((shoe) => [dress, shoe])),
    ...tops.flatMap((top) => shoes.map((shoe) => [top, shoe])),
  ]

  for (const items of combinations) {
    if (new Set(items.map((item) => item.id)).size !== items.length) continue
    for (const activity of activities) {
      const score = items.reduce((total, item) => total + itemScore(item, [activity], trip.weather, learning), 0) + colorHarmony(items)
      const hybridActivity = activities.find((other) => other !== activity && items.reduce((total, item) => total + activityScore(item, [other]), 0) >= 5)
      candidates.push({ items, activity, score: score + (hybridActivity ? 2 : 0), hybridActivity })
    }
  }

  const selected: typeof candidates = []
  const used = new Set<string>()
  const packedItems = new Set<string>()
  const clothingSpaceBudget = Math.max(4, bagCapacity * 0.68)
  let estimatedClothingSpace = 0
  while (selected.length < count) {
    const available = candidates.filter(({ items }) => {
      const comboKey = items.map((item) => item.id).sort().join('|')
      if (used.has(comboKey)) return false
      const addedSpace = items.filter((item) => !packedItems.has(item.id)).reduce((space, item) => space + estimatedLitres(item), 0)
      return estimatedClothingSpace + addedSpace <= clothingSpaceBudget
    })
    const reusePenalty = trip.preferences.reuse ? 0 : 4
    const candidate = available.sort((a, b) => {
      const adjusted = (outfit: typeof a) => outfit.score - outfit.items.reduce((score, item) =>
        score + (selected.some((previous) => previous.items.some((previousItem) => previousItem.id === item.id)) ? reusePenalty : 0), 0)
      return adjusted(b) - adjusted(a)
    })[0]
    if (!candidate) {
      if (selected.length > 0) break
      const first = candidates[0]
      if (!first) break
      selected.push(first)
      first.items.forEach((item) => packedItems.add(item.id))
      estimatedClothingSpace += first.items.reduce((space, item) => space + estimatedLitres(item), 0)
      used.add(first.items.map((item) => item.id).sort().join('|'))
      continue
    }
    used.add(candidate.items.map((item) => item.id).sort().join('|'))
    selected.push(candidate)
    candidate.items.forEach((item) => {
      if (packedItems.has(item.id)) return
      packedItems.add(item.id)
      estimatedClothingSpace += estimatedLitres(item)
    })
  }

  return selected.map(({ items, activity, hybridActivity }, index) => {
    const dress = items.find((item) => item.category === 'Dresses')
    const top = items.find((item) => topCategories.has(item.category))
    const bottom = items.find((item) => bottomCategories.has(item.category))
    const isHybrid = trip.preferences.hybrid && Boolean(hybridActivity)
    return {
      id: `outfit-${index + 1}`,
      name: dress?.name ?? `${top?.color ?? 'Easy'} + ${bottom?.color ?? 'everyday'}`,
      occasion: activity,
      items,
      hybrid: isHybrid,
      note: isHybrid ? `A versatile match for ${activity.toLowerCase()} and ${hybridActivity?.toLowerCase()}.` : undefined,
      reason: `Matched to ${activity.toLowerCase()}, ${trip.weather.toLowerCase()} weather, and ${learning.feedbackCount ? 'your past outfit ratings' : 'versatile pieces in your wardrobe'}.`,
    }
  })
}

export function recommendPacking(wardrobe: Clothing[], outfits: Outfit[], days: number, laundry: boolean, weather = 'Mild & mixed'): PackingItem[] {
  const recommendedIds = new Set(outfits.flatMap((outfit) => outfit.items.map((item) => item.id)))
  const layers = weather === 'Cool & crisp' || weather === 'Rainy'
    ? wardrobe.filter((item) => item.category === 'Jackets' && weatherScore(item, weather) >= 2).slice(0, 1)
    : []
  const clothing: PackingItem[] = [...recommendedIds, ...layers.map((item) => item.id)].flatMap((id) => {
    const item = wardrobe.find((entry) => entry.id === id)
    if (!item) return []
    return [{ id: `wardrobe-${item.id}`, name: item.name, category: item.category, quantity: 1, packed: false, wardrobeId: item.id }]
  })
  const basics = defaultChecklist(days).filter((item) => item.category === 'Clothing basics')
  const multiplier = laundry ? 0.6 : 1
  return [
    ...clothing,
    ...basics.map((item) => ({ ...item, quantity: Math.max(1, Math.ceil(item.quantity * multiplier)) })),
  ]
}

export function usageEstimate(packing: PackingItem[], capacity: number) {
  const clothingCount = packing.filter((item) => item.wardrobeId).length
  return Math.min(96, Math.round((clothingCount * 3.8 + packing.length * 0.7) / Math.max(capacity / 38, 0.5)))
}

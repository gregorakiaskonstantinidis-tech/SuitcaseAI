import type { Clothing, LearningProfile, Outfit } from './types'

export const initialLearningProfile: LearningProfile = {
  itemPreference: {},
  colorPreference: {},
  categoryPreference: {},
  feedbackCount: 0,
}

export function recordOutfitFeedback(profile: LearningProfile, outfit: Outfit, liked: boolean): LearningProfile {
  const adjustment = liked ? 1 : -1
  const itemPreference = { ...profile.itemPreference }
  const colorPreference = { ...profile.colorPreference }
  const categoryPreference = { ...profile.categoryPreference }

  outfit.items.forEach((item) => {
    itemPreference[item.id] = Math.max(-5, Math.min(5, (itemPreference[item.id] ?? 0) + adjustment))
    const color = item.color.trim().toLowerCase()
    if (color) colorPreference[color] = Math.max(-5, Math.min(5, (colorPreference[color] ?? 0) + adjustment * 0.5))
    categoryPreference[item.category] = Math.max(-5, Math.min(5, (categoryPreference[item.category] ?? 0) + adjustment * 0.5))
  })

  return { itemPreference, colorPreference, categoryPreference, feedbackCount: profile.feedbackCount + 1 }
}

export function learnedItemScore(item: Clothing, profile: LearningProfile) {
  return (profile.itemPreference[item.id] ?? 0) * 2
    + (profile.colorPreference[item.color.trim().toLowerCase()] ?? 0)
    + (profile.categoryPreference[item.category] ?? 0)
}

export function learnedProfileSummary(profile: LearningProfile) {
  const likedColors = Object.entries(profile.colorPreference).filter(([, score]) => score >= 1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([color]) => color)
  const likedCategories = Object.entries(profile.categoryPreference).filter(([, score]) => score >= 1).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([category]) => category.toLowerCase())
  const details = [...likedColors, ...likedCategories]
  return details.length ? `Learning your preferences: ${details.join(' · ')}` : 'Your feedback helps SuitcaseAI learn what you like.'
}

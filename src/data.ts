import type { Clothing, Luggage, PackingItem } from './types'

const photo = (id: string, width = 400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

export const initialWardrobe: Clothing[] = [
  { id: 'c1', name: 'Linen button-up', category: 'Shirts', color: 'Ivory', image: photo('photo-1598033129183-c4f50c736f10') },
  { id: 'c2', name: 'Classic straight jeans', category: 'Jeans', color: 'Indigo', image: photo('photo-1541099649105-f69ad21f3246') },
  { id: 'c3', name: 'Tailored wide-leg trousers', category: 'Trousers', color: 'Sand', image: photo('photo-1594633312681-425c7b97ccd1') },
  { id: 'c4', name: 'Soft cotton tee', category: 'T-shirts', color: 'White', image: photo('photo-1521572163474-6864f9cf17ab') },
  { id: 'c5', name: 'Lightweight trench', category: 'Jackets', color: 'Stone', image: photo('photo-1548624149-f3235e9bb05b') },
  { id: 'c6', name: 'Everyday white sneakers', category: 'Shoes', color: 'White', image: photo('photo-1542291026-7eec264c27ff') },
  { id: 'c7', name: 'Black leather loafers', category: 'Shoes', color: 'Black', image: photo('photo-1531310197839-ccf54634509e') },
  { id: 'c8', name: 'Knit midi dress', category: 'Dresses', color: 'Navy', image: photo('photo-1595777457583-95e059d581b8') },
  { id: 'c9', name: 'Relaxed linen shorts', category: 'Shorts', color: 'Oatmeal', image: photo('photo-1591195853828-11db59a44f6b') },
  { id: 'c10', name: 'Canvas crossbody bag', category: 'Accessories', color: 'Tan', image: photo('photo-1548036328-c9fa89d128fa') },
  { id: 'c11', name: 'Blue Oxford shirt', category: 'Shirts', color: 'Sky blue', image: photo('photo-1603252109303-2751441dd157') },
  { id: 'c12', name: 'Lightweight knit', category: 'Jackets', color: 'Sage', image: photo('photo-1576566588028-4147f3842f27') },
]

export const initialLuggage: Luggage[] = [
  { id: 'l1', name: 'The Weekender', type: 'Cabin suitcase', capacity: 38, dimensions: '55 × 35 × 23 cm', image: photo('photo-1553062407-98eeb64c6a62') },
  { id: 'l2', name: 'City Tote', type: 'Personal item', capacity: 18, dimensions: '40 × 30 × 15 cm', image: photo('photo-1622560480654-d96214fdc887') },
]

export const defaultChecklist = (days: number): PackingItem[] => [
  { id: 'passport', name: 'Passport', category: 'Essentials', quantity: 1, packed: false },
  { id: 'id', name: 'ID card & travel documents', category: 'Essentials', quantity: 1, packed: false },
  { id: 'wallet', name: 'Wallet & cards', category: 'Essentials', quantity: 1, packed: false },
  { id: 'tickets', name: 'Travel tickets & reservations', category: 'Essentials', quantity: 1, packed: false },
  { id: 'phone', name: 'Phone', category: 'Electronics', quantity: 1, packed: false },
  { id: 'charger', name: 'Phone charger', category: 'Electronics', quantity: 1, packed: false },
  { id: 'powerbank', name: 'Power bank', category: 'Electronics', quantity: 1, packed: false },
  { id: 'toiletries', name: 'Toiletries', category: 'Personal care', quantity: 1, packed: false },
  { id: 'medication', name: 'Medication', category: 'Personal care', quantity: 1, packed: false },
  { id: 'sunglasses', name: 'Sunglasses', category: 'Accessories', quantity: 1, packed: false },
  { id: 'insurance', name: 'Travel insurance details', category: 'Essentials', quantity: 1, packed: false },
  { id: 'underwear', name: 'Underwear', category: 'Clothing basics', quantity: Math.min(days, 7), packed: false },
  { id: 'socks', name: 'Socks', category: 'Clothing basics', quantity: Math.min(days, 7), packed: false },
  { id: 'sleepwear', name: 'Sleepwear', category: 'Clothing basics', quantity: 1, packed: false },
]

export const activitiesList = ['Sightseeing', 'City exploration', 'Beach', 'Business meetings', 'Formal dinners', 'Nightlife', 'Hiking', 'Sports', 'Shopping', 'Relaxation']

export const activityIcon: Record<string, string> = {
  'Sightseeing': '🏛️', 'City exploration': '🚶', Beach: '🏖️', 'Business meetings': '💼',
  'Formal dinners': '🍷', Nightlife: '🌙', Hiking: '🥾', Sports: '🎾', Shopping: '🛍️', Relaxation: '☀️',
}

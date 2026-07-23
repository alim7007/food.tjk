import type { BasketItem, Food } from "./types";

const BASKET_PREFIX = "nexara_basket_";

function basketKey(restaurantId: string): string {
  return BASKET_PREFIX + restaurantId;
}

function loadBasket(restaurantId: string): BasketItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(basketKey(restaurantId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBasket(restaurantId: string, items: BasketItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(basketKey(restaurantId), JSON.stringify(items));
}

export function getBasket(restaurantId: string): BasketItem[] {
  return loadBasket(restaurantId);
}

export function addToBasket(restaurantId: string, food: Food, quantity: number = 1): BasketItem[] {
  const basket = loadBasket(restaurantId);
  const existing = basket.find((item) => item.food.id === food.id);

  if (existing) {
    existing.quantity += quantity;
  } else {
    basket.push({ food, quantity });
  }

  saveBasket(restaurantId, basket);
  return basket;
}

export function updateQuantity(restaurantId: string, foodId: string, quantity: number): BasketItem[] {
  const basket = loadBasket(restaurantId);
  const existing = basket.find((item) => item.food.id === foodId);

  if (existing) {
    if (quantity <= 0) {
      return removeFromBasket(restaurantId, foodId);
    }
    existing.quantity = quantity;
  }

  saveBasket(restaurantId, basket);
  return basket;
}

export function removeFromBasket(restaurantId: string, foodId: string): BasketItem[] {
  const basket = loadBasket(restaurantId).filter((item) => item.food.id !== foodId);
  saveBasket(restaurantId, basket);
  return basket;
}

export function clearBasket(restaurantId: string): void {
  saveBasket(restaurantId, []);
}

export function getBasketCount(restaurantId: string): number {
  return loadBasket(restaurantId).reduce((sum, item) => sum + item.quantity, 0);
}

export function getBasketTotal(restaurantId: string): number {
  return loadBasket(restaurantId).reduce(
    (sum, item) => sum + item.food.price * item.quantity,
    0
  );
}

export interface BasketGroup {
  restaurantId: string;
  items: BasketItem[];
  count: number;
  subtotal: number;
}

export function getAllBaskets(): BasketGroup[] {
  if (typeof window === "undefined") return [];
  const groups: BasketGroup[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(BASKET_PREFIX)) continue;
    const restaurantId = key.slice(BASKET_PREFIX.length);
    const items = loadBasket(restaurantId);
    if (items.length === 0) continue;
    groups.push({
      restaurantId,
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.food.price * item.quantity, 0),
    });
  }
  return groups;
}

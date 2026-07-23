import { useState, useCallback, useReducer, useEffect } from "react";
import type { BasketItem, Food } from "@/lib/types";
import {
  getBasket,
  addToBasket,
  updateQuantity,
  removeFromBasket,
  clearBasket,
} from "@/lib/basket";

type BasketAction =
  | { type: "set"; items: BasketItem[] };

function basketReducer(_state: BasketItem[], action: BasketAction): BasketItem[] {
  return action.items;
}

export function useBasket(restaurantId: string) {
  const [items, dispatch] = useReducer(basketReducer, []);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    dispatch({ type: "set", items: getBasket(restaurantId) });
  }, [restaurantId]);

  const add = useCallback((food: Food, quantity = 1) => {
    const updated = addToBasket(restaurantId, food, quantity);
    dispatch({ type: "set", items: updated });
  }, [restaurantId]);

  const changeQuantity = useCallback((foodId: string, quantity: number) => {
    const updated = updateQuantity(restaurantId, foodId, quantity);
    dispatch({ type: "set", items: updated });
  }, [restaurantId]);

  const remove = useCallback((foodId: string) => {
    const updated = removeFromBasket(restaurantId, foodId);
    dispatch({ type: "set", items: updated });
  }, [restaurantId]);

  const clear = useCallback(() => {
    clearBasket(restaurantId);
    dispatch({ type: "set", items: [] });
  }, [restaurantId]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.food.price * item.quantity, 0);

  return {
    items,
    count,
    subtotal,
    isOpen,
    setIsOpen,
    add,
    changeQuantity,
    remove,
    clear,
  };
}

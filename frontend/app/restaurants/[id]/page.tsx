"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { fetchRestaurantById, fetchFoodsByRestaurant, fetchCategories, createOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/image";
import { validatePhone, validateRequired } from "@/lib/validation";
import { getBasket, addToBasket, updateQuantity, removeFromBasket, clearBasket, getBasketCount, getBasketTotal } from "@/lib/basket";
import { SkeletonFoodCard } from "@/components/ui/Skeleton";
import ProductModal from "@/components/ui/ProductModal";
import type { Restaurant, Food, Category, BasketItem } from "@/lib/types";
import styles from "./page.module.css";

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState("");
  const [modalFood, setModalFood] = useState<Food | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetchRestaurantById(id),
      fetchFoodsByRestaurant(id),
      fetchCategories(),
    ])
      .then(([r, f, cat]) => {
        setRestaurant(r);
        setFoods(f);
        setCategories(cat);
        setBasket(getBasket(id));
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const foodCategories = [...new Set(foods.map((f) => f.category_id))];
  const filteredFoods = activeCat
    ? foods.filter((f) => f.category_id === activeCat)
    : foods;

  const handleAddToBasket = useCallback((food: Food, qty: number) => {
    setBasket(addToBasket(id, food, qty));
    setModalFood(null);
    setAddedFeedback(food.name);
    setTimeout(() => setAddedFeedback(null), 2000);
  }, [id]);

  const handleQty = (foodId: string, qty: number) => {
    setBasket(updateQuantity(id, foodId, qty));
  };

  const handleRemove = (foodId: string) => {
    setBasket(removeFromBasket(id, foodId));
  };

  const count = getBasketCount(id);
  const subtotal = getBasketTotal(id);

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.restHeader}>
            <div className={styles.backBtn} onClick={() => router.back()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </div>
            <div className={styles.skeletonTitle} />
          </div>
          <div className={styles.foodGrid}>
            {[1,2,3,4].map((i) => <SkeletonFoodCard key={i} />)}
          </div>
        </div>
      </>
    );
  }

  if (error || !restaurant) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.error}>
            <p>{error || "Not found"}</p>
            <button className={styles.retryBtn} onClick={() => router.back()}>
              {t("site.back")}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.restHeader}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className={styles.restInfo}>
            <h1 className={styles.restName}>{restaurant.name}</h1>
            {restaurant.description && (
              <p className={styles.restDesc}>{restaurant.description}</p>
            )}
            <div className={styles.restMeta}>
              <span className={styles.metaItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                30-45 min
              </span>
              <span className={styles.metaItem}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                10 TJS
              </span>
            </div>
          </div>
        </div>

        {foodCategories.length > 1 && (
          <div className={styles.categories}>
            <button
              className={`${styles.catPill} ${activeCat === "" ? styles.catActive : ""}`}
              onClick={() => setActiveCat("")}
            >
              {t("site.all")}
            </button>
            {foodCategories.map((catId) => (
              <button
                key={catId}
                className={`${styles.catPill} ${activeCat === catId ? styles.catActive : ""}`}
                onClick={() => setActiveCat(catId)}
              >
                {catMap.get(catId) || catId}
              </button>
            ))}
          </div>
        )}

        {filteredFoods.length === 0 && (
          <div className={styles.empty}>{t("site.noFoods")}</div>
        )}

        <div className={styles.foodGrid}>
          {filteredFoods.map((food) => (
            <div key={food.id} className={styles.foodCard} onClick={() => setModalFood(food)}>
              <div className={styles.foodImage}>
                {food.image_url ? (
                  <img src={imageUrl(food.image_url)!} alt={food.name} />
                ) : (
                  <div className={styles.foodPlaceholder}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
                  </div>
                )}
              </div>
              <div className={styles.foodBody}>
                <h3 className={styles.foodName}>{food.name}</h3>
                <span className={styles.foodPrice}>{food.price.toFixed(2)} TJS</span>
              </div>
            </div>
          ))}
        </div>

        {count > 0 && (
          <button
            className={styles.basketFloat}
            onClick={() => router.push(`/restaurants/${id}/basket`)}
          >
            <span className={styles.basketFloatCount}>{count}</span>
            <span>{t("site.viewBasket")}</span>
            <span className={styles.basketFloatPrice}>{(subtotal + 10).toFixed(2)} TJS</span>
          </button>
        )}

        {addedFeedback && (
          <div className={styles.toast}>{addedFeedback} — {t("site.addedToBasket")}</div>
        )}
      </div>

      {modalFood && (
        <ProductModal
          food={modalFood}
          onClose={() => setModalFood(null)}
          onAdd={handleAddToBasket}
        />
      )}
    </>
  );
}

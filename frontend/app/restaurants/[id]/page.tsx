"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/layout/Container";
import { fetchRestaurantById, fetchFoodsByRestaurant, createOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/image";
import { validatePhone, validateRequired } from "@/lib/validation";
import { getBasket, addToBasket, updateQuantity, removeFromBasket, clearBasket, getBasketCount, getBasketTotal } from "@/lib/basket";
import type { Restaurant, Food, BasketItem } from "@/lib/types";
import styles from "./page.module.css";

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{ address?: string; phone?: string }>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchRestaurantById(id), fetchFoodsByRestaurant(id)])
      .then(([r, f]) => { setRestaurant(r); setFoods(f); setBasket(getBasket(id)); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = (food: Food) => setBasket(addToBasket(id, food));
  const handleQty = (foodId: string, qty: number) => setBasket(updateQuantity(id, foodId, qty));
  const handleRemove = (foodId: string) => setBasket(removeFromBasket(id, foodId));

  const handleOrder = async () => {
    const addrErr = validateRequired(address, "Address");
    const phoneErr = validatePhone(phone);
    if (addrErr || phoneErr) {
      setFormErrors({ address: addrErr || undefined, phone: phoneErr || undefined });
      return;
    }
    setFormErrors({});
    setOrdering(true);
    try {
      await createOrder({
        restaurant_id: id,
        items: basket.map((item) => ({ food_id: item.food.id, quantity: item.quantity })),
        delivery_address: address,
        delivery_phone: phone,
        note: note || undefined,
      });
      clearBasket(id);
      setBasket([]);
      setOrderSuccess(true);
      setShowOrderForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOrdering(false);
    }
  };

  const count = getBasketCount(id);
  const subtotal = getBasketTotal(id);

  if (loading) return <><Header /><Container><div className={styles.loading}>{t("site.loading")}</div></Container></>;
  if (error) return <><Header /><Container><div className={styles.error}>{error}</div></Container></>;
  if (!restaurant) return <><Header /><Container><div className={styles.error}>Not found</div></Container></>;

  return (
    <>
      <Header />
      <Container>
        <div className={styles.header}>
          {restaurant.image_url && <img src={imageUrl(restaurant.image_url)!} alt={restaurant.name} className={styles.restImage} />}
          <h1 className={styles.name}>{restaurant.name}</h1>
          {restaurant.description && <p className={styles.desc}>{restaurant.description}</p>}
        </div>

        {orderSuccess && <div className={styles.success}>{t("site.orderSuccess")}</div>}

        <div className={styles.layout}>
          <div className={styles.menu}>
            <h2 className={styles.sectionTitle}>{t("site.menu")}</h2>
            {foods.length === 0 && <div className={styles.empty}>No items</div>}
            {foods.map((food) => (
              <div key={food.id} className={styles.foodItem}>
                {food.image_url && <img src={imageUrl(food.image_url)!} alt={food.name} className={styles.foodImage} />}
                <div className={styles.foodInfo}>
                  <h3 className={styles.foodName}>{food.name}</h3>
                  {food.description && <p className={styles.foodDesc}>{food.description}</p>}
                  <span className={styles.foodPrice}>${food.price.toFixed(2)}</span>
                </div>
                <button className={styles.addBtn} onClick={() => handleAdd(food)}>+</button>
              </div>
            ))}
          </div>

          <div className={styles.sidebar}>
            <h2 className={styles.sectionTitle}>{t("site.basket")}</h2>
            {basket.length === 0 ? (
              <p className={styles.emptyBasket}>{t("site.emptyBasket")}</p>
            ) : (
              <>
                <div className={styles.basketItems}>
                  {basket.map((item) => (
                    <div key={item.food.id} className={styles.basketItem}>
                      <div className={styles.basketItemInfo}>
                        <span className={styles.basketItemName}>{item.food.name}</span>
                        <span className={styles.basketItemPrice}>${(item.food.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className={styles.basketItemQty}>
                        <button onClick={() => handleQty(item.food.id, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => handleQty(item.food.id, item.quantity + 1)}>+</button>
                        <button className={styles.removeBtn} onClick={() => handleRemove(item.food.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.basketTotal}><span>{t("site.subtotal")}</span><strong>${subtotal.toFixed(2)}</strong></div>
                <div className={styles.basketTotal}><span>{t("site.delivery")}</span><strong>$10.00</strong></div>
                <div className={styles.basketTotal}><span>{t("site.total")}</span><strong>${(subtotal + 10).toFixed(2)}</strong></div>

                {!showOrderForm ? (
                  <button className={styles.orderBtn} onClick={() => setShowOrderForm(true)}>
                    {t("site.placeOrder")} ({count} {t("site.items")})
                  </button>
                ) : (
                  <div className={styles.orderForm}>
                    <input className={`${styles.input} ${formErrors.address ? styles.inputError : ""}`} placeholder={t("site.deliveryAddress")} value={address} onChange={(e) => { setAddress(e.target.value); setFormErrors((p) => ({ ...p, address: undefined })); }} />
                    {formErrors.address && <span className={styles.fieldError}>{formErrors.address}</span>}
                    <input className={`${styles.input} ${formErrors.phone ? styles.inputError : ""}`} placeholder={t("site.phoneNumber")} value={phone} onChange={(e) => { setPhone(e.target.value); setFormErrors((p) => ({ ...p, phone: undefined })); }} />
                    {formErrors.phone && <span className={styles.fieldError}>{formErrors.phone}</span>}
                    <textarea className={styles.textarea} placeholder={t("site.note")} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                    <button className={styles.orderBtn} onClick={handleOrder} disabled={ordering}>
                      {ordering ? "..." : t("site.confirmOrder")}
                    </button>
                    <button className={styles.cancelBtn} onClick={() => { setShowOrderForm(false); setFormErrors({}); }}>{t("site.cancel")}</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

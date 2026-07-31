"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { fetchRestaurantById, createOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/image";
import { validatePhone, validateRequired } from "@/lib/validation";
import { getBasket, updateQuantity, removeFromBasket, clearBasket, getBasketCount, getBasketTotal } from "@/lib/basket";
import { getProfile } from "@/lib/profile";
import type { Restaurant, BasketItem } from "@/lib/types";
import styles from "./page.module.css";

export default function BasketPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{ address?: string; phone?: string }>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchRestaurantById(id)
      .then(setRestaurant)
      .catch(() => {});
    setBasket(getBasket(id));
    const p = getProfile();
    if (p) {
      if (p.phone) setPhone(p.phone);
      if (p.address) setAddress(p.address);
    }
  }, [id]);

  const handleQty = (foodId: string, qty: number) => {
    setBasket(updateQuantity(id, foodId, qty));
  };

  const handleRemove = (foodId: string) => {
    setBasket(removeFromBasket(id, foodId));
  };

  const handleClear = () => {
    clearBasket(id);
    setBasket([]);
    setShowClearConfirm(false);
  };

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
    } catch (err: any) {
      setFormErrors({ address: err.message });
    } finally {
      setOrdering(false);
    }
  };

  const count = getBasketCount(id);
  const subtotal = getBasketTotal(id);
  const deliveryFee = 10;
  const total = subtotal + deliveryFee;

  if (orderSuccess) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2 className={styles.successTitle}>{t("site.orderSuccess")}</h2>
            <button className={styles.backHomeBtn} onClick={() => router.push("/")}>
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
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className={styles.title}>{t("site.basket")}</h1>
          {basket.length > 0 && (
            <button className={styles.clearBtn} onClick={() => setShowClearConfirm(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          )}
        </div>

        {showClearConfirm && (
          <div className={styles.confirmOverlay} onClick={() => setShowClearConfirm(false)}>
            <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
              <p>{t("site.clearBasketConfirm")}</p>
              <div className={styles.confirmActions}>
                <button className={styles.confirmNo} onClick={() => setShowClearConfirm(false)}>{t("site.no")}</button>
                <button className={styles.confirmYes} onClick={handleClear}>{t("site.yes")}</button>
              </div>
            </div>
          </div>
        )}

        {restaurant && (
          <div className={styles.restCard}>
            <div className={styles.restInfo}>
              <h3 className={styles.restName}>{restaurant.name}</h3>
              {restaurant.description && <p className={styles.restDesc}>{restaurant.description}</p>}
            </div>
          </div>
        )}

        {basket.length === 0 ? (
          <div className={styles.emptyBasket}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <p>{t("site.emptyBasket")}</p>
          </div>
        ) : (
          <>
            <div className={styles.itemsCard}>
              <h3 className={styles.sectionTitle}>{t("site.items")}</h3>
              {basket.map((item) => (
                <div key={item.food.id} className={styles.basketItem}>
                  <div className={styles.itemImage}>
                    {item.food.image_url ? (
                      <img src={imageUrl(item.food.image_url)!} alt={item.food.name} />
                    ) : (
                      <div className={styles.itemPlaceholder}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/></svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.food.name}</span>
                    <span className={styles.itemPrice}>{(item.food.price * item.quantity).toFixed(2)} TJS</span>
                  </div>
                  <div className={styles.itemQty}>
                    <button onClick={() => handleQty(item.food.id, item.quantity - 1)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleQty(item.food.id, item.quantity + 1)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.totalsCard}>
              <div className={styles.totalRow}>
                <span>{t("site.subtotal")}</span>
                <span>{subtotal.toFixed(2)} TJS</span>
              </div>
              <div className={styles.totalRow}>
                <span>{t("site.deliveryFee")}</span>
                <span>{deliveryFee.toFixed(2)} TJS</span>
              </div>
              <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                <span>{t("site.total")}</span>
                <span>{total.toFixed(2)} TJS</span>
              </div>
            </div>

            <div className={styles.checkoutCard}>
              <h3 className={styles.sectionTitle}>{t("site.deliveryAddress")}</h3>
              <input
                className={`${styles.input} ${formErrors.address ? styles.inputError : ""}`}
                placeholder={t("site.deliveryAddress")}
                value={address}
                onChange={(e) => { setAddress(e.target.value); setFormErrors((p) => ({ ...p, address: undefined })); }}
              />
              {formErrors.address && <span className={styles.fieldError}>{formErrors.address}</span>}
              <input
                className={`${styles.input} ${formErrors.phone ? styles.inputError : ""}`}
                placeholder={t("site.phoneNumber")}
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setFormErrors((p) => ({ ...p, phone: undefined })); }}
              />
              {formErrors.phone && <span className={styles.fieldError}>{formErrors.phone}</span>}
              <textarea
                className={styles.textarea}
                placeholder={t("site.note")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
              <button
                className={styles.orderBtn}
                onClick={handleOrder}
                disabled={ordering}
              >
                {ordering ? "..." : `${t("site.confirmOrder")} · ${total.toFixed(2)} TJS`}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

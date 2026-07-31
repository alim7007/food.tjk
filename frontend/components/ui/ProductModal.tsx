"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/image";
import type { Food } from "@/lib/types";
import styles from "./ProductModal.module.css";

interface Props {
  food: Food;
  onClose: () => void;
  onAdd: (food: Food, quantity: number) => void;
}

export default function ProductModal({ food, onClose, onAdd }: Props) {
  const { t } = useI18n();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const total = food.price * quantity;

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className={styles.imageWrap}>
          {food.image_url ? (
            <img src={imageUrl(food.image_url)!} alt={food.name} className={styles.image} />
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
            </div>
          )}
        </div>

        <div className={styles.body}>
          <h2 className={styles.name}>{food.name}</h2>
          {food.description && (
            <p className={styles.desc}>{food.description}</p>
          )}

          <div className={styles.quantityRow}>
            <span className={styles.quantityLabel}>{t("site.quantity")}</span>
            <div className={styles.stepper}>
              <button
                className={styles.stepBtn}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button
                className={styles.stepBtn}
                onClick={() => setQuantity((q) => q + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerPrice}>
            <span className={styles.totalLabel}>{t("site.total")}</span>
            <span className={styles.totalValue}>{total.toFixed(2)} TJS</span>
          </div>
          <button
            className={styles.addBtn}
            onClick={() => onAdd(food, quantity)}
          >
            {t("site.addToBasket")} · {total.toFixed(2)} TJS
          </button>
        </div>
      </div>
    </div>
  );
}

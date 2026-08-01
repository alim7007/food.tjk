"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/layout/Container";
import { fetchOrderById, cancelOrder } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Order } from "@/lib/types";
import styles from "./page.module.css";

const STATUS_STEPS = ["pending", "accepted", "delivered"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchOrderById(id)
      .then((o) => { setOrder(o); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      setOrder({ ...order, status: "cancelled" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <><Header /><Container><div className={styles.loading}>{t("site.loading")}</div></Container></>;
  if (error) return <><Header /><Container><div className={styles.error}>{error}</div></Container></>;
  if (!order) return <><Header /><Container><div className={styles.error}>Not found</div></Container></>;

  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <>
      <Header />
      <Container>
        <h1 className={styles.title}>{t("site.orderFrom")} {order.restaurant_name}</h1>
        <div className={styles.stepper}>
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className={`${styles.step} ${i <= currentStep ? styles.done : ""}`}>
              <div className={styles.dot}>{i <= currentStep ? "✓" : i + 1}</div>
              <span className={styles.label}>{t(`site.${step}`)}</span>
            </div>
          ))}
        </div>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("site.items")}</h2>
          {order.items.map((item) => (
            <div key={item.id} className={styles.item}><span>{item.food_name} × {item.quantity}</span><span>${item.total_price.toFixed(2)}</span></div>
          ))}
          <div className={styles.divider} />
          <div className={styles.row}><span>{t("site.subtotal")}</span><span>${order.subtotal.toFixed(2)}</span></div>
          <div className={styles.row}><span>{t("site.delivery")}</span><span>${order.delivery_fee.toFixed(2)}</span></div>
          <div className={`${styles.row} ${styles.total}`}><span>{t("site.total")}</span><span>${order.total.toFixed(2)}</span></div>
        </div>
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("site.delivery")}</h2>
          <div className={styles.row}><span>{t("site.address")}</span><span>{order.delivery_address}</span></div>
          <div className={styles.row}><span>{t("site.phone")}</span><span>{order.delivery_phone}</span></div>
          {order.note && <div className={styles.row}><span>{t("site.note")}</span><span>{order.note}</span></div>}
          {order.courier_name && <div className={styles.row}><span>{t("site.courier")}</span><span>{order.courier_name} ({order.courier_phone})</span></div>}
        </div>

        {order.status === "pending" && (
          <button className={styles.cancelBtn} onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "..." : t("site.cancelOrder")}
          </button>
        )}
      </Container>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { fetchCourierOrders } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useCourierSSEVersion } from "@/components/admin/CourierLayout";
import type { Order } from "@/lib/types";
import styles from "./page.module.css";

export default function CourierOrdersPage() {
  const { t } = useI18n();
  const sseVersion = useCourierSSEVersion();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchCourierOrders(status || undefined)
      .then((res) => { setOrders(res.orders); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, sseVersion]);

  return (
    <>
      <h1 className={styles.title}>{t("site.myOrders")}</h1>
      <div className={styles.filters}>
        {["", "accepted", "delivered"].map((s) => (
          <button key={s} className={`${styles.filterBtn} ${status === s ? styles.active : ""}`} onClick={() => setStatus(s)}>
            {s ? t(`site.${s}`) : t("site.all")}
          </button>
        ))}
      </div>
      {loading && <div className={styles.loading}>{t("site.loading")}</div>}
      {error && <div className={styles.error}>{error}</div>}
      {!loading && !error && orders.length === 0 && <div className={styles.empty}>{t("site.noAssignedOrders")}</div>}
      <div className={styles.list}>
        {orders.map((order) => (
          <div key={order.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.restaurant}>{order.restaurant_name}</span>
              <span className={`${styles.status} ${styles[order.status]}`}>{t(`site.${order.status}`)}</span>
            </div>
            <div className={styles.info}><span>{order.customer_name || "Guest"}</span><span>{order.delivery_phone}</span></div>
            <div className={styles.address}>{order.delivery_address}</div>
            {order.note && <div className={styles.note}>{t("site.note")}: {order.note}</div>}
            <div className={styles.items}>{order.items.map((item) => <span key={item.id}>{item.food_name} × {item.quantity}</span>)}</div>
            <div className={styles.total}>{order.total.toFixed(0)} TJS</div>
          </div>
        ))}
      </div>
    </>
  );
}

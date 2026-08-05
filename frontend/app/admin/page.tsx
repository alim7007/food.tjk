"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllOrders, fetchCouriers } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useSSEVersion } from "@/components/admin/AdminLayout";
import type { Order, Courier } from "@/lib/types";
import styles from "./page.module.css";

export default function AdminDashboard() {
  const { t } = useI18n();
  const sseVersion = useSSEVersion();
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAllOrders(undefined, 1, 100),
      fetchCouriers(),
    ])
      .then(([o, c]) => {
        setOrders(o.orders);
        setCouriers(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sseVersion]);

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter((o) => o.created_at.startsWith(today));
  const activeCouriers = couriers.filter((c) => c.is_active);

  const recentOrders = [...orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>{t("site.overview")}</h1>
        <div className={styles.metrics}>
          {[1,2,3,4].map((i) => <div key={i} className={styles.metricSkeleton} />)}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{t("site.overview")}</h1>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{pendingOrders.length}</span>
          <span className={styles.metricLabel}>{t("site.pending")}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{todayOrders.length}</span>
          <span className={styles.metricLabel}>{t("site.ordersToday")}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{activeCouriers.length}</span>
          <span className={styles.metricLabel}>{t("site.activeCouriers")}</span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t("site.recentOrders")}</h2>
          <Link href="/admin/orders" className={styles.viewAll}>{t("site.viewAll")} →</Link>
        </div>
        <div className={styles.recentList}>
          {recentOrders.map((o) => (
            <Link key={o.id} href={`/admin/orders/${o.id}`} className={styles.recentItem}>
              <div className={styles.recentLeft}>
                <span className={styles.recentRest}>{o.restaurant_name}</span>
                <span className={styles.recentCustomer}>{o.customer_name || "Guest"} · {o.total.toFixed(0)} TJS</span>
              </div>
              <span className={`${styles.statusBadge} ${styles[o.status]}`}>{t(`site.${o.status}`)}</span>
            </Link>
          ))}
          {recentOrders.length === 0 && (
            <div className={styles.empty}>{t("site.noOrders")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

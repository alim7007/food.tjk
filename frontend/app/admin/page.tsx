"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllOrders, fetchCouriers, fetchRestaurants } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Order, Courier, Restaurant } from "@/lib/types";
import styles from "./page.module.css";

export default function AdminDashboard() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAllOrders(undefined, 1, 100),
      fetchCouriers(),
      fetchRestaurants(),
    ])
      .then(([o, c, r]) => {
        setOrders(o.orders);
        setCouriers(c);
        setRestaurants(r.restaurants);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter((o) => o.created_at.startsWith(today));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const activeCouriers = couriers.filter((c) => c.is_active);

  const recentOrders = [...orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const needsAttention = orders.filter(
    (o) => o.status === "pending" || (o.status === "accepted" && !o.courier_id)
  );

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
          <span className={styles.metricValue}>{todayRevenue.toFixed(0)} TJS</span>
          <span className={styles.metricLabel}>{t("site.revenueToday")}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricValue}>{activeCouriers.length}</span>
          <span className={styles.metricLabel}>{t("site.activeCouriers")}</span>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("site.needsAttention")}</h2>
          <div className={styles.attentionList}>
            {needsAttention.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className={styles.attentionItem}>
                <div>
                  <span className={styles.attentionRest}>{o.restaurant_name}</span>
                  <span className={styles.attentionCustomer}>{o.customer_name || "Guest"}</span>
                </div>
                <div className={styles.attentionRight}>
                  <span className={`${styles.statusBadge} ${styles[o.status]}`}>{t(`site.${o.status}`)}</span>
                  <span className={styles.attentionTotal}>{o.total.toFixed(0)} TJS</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
        </div>
      </div>

      <div className={styles.quickActions}>
        <Link href="/admin/restaurants" className={styles.quickBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("site.addRestaurant")}
        </Link>
        <Link href="/admin/menu" className={styles.quickBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("site.addFood")}
        </Link>
        <Link href="/admin/couriers" className={styles.quickBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("site.addCourier")}
        </Link>
      </div>
    </div>
  );
}

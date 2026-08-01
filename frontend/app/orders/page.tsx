"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Container from "@/components/layout/Container";
import { fetchMyOrders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Order } from "@/lib/types";
import styles from "./page.module.css";

export default function OrdersPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    fetchMyOrders(status || undefined)
      .then((res) => { setOrders(res.orders); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, user, authLoading]);

  return (
    <>
      <Header />
      <Container>
        <h1 className={styles.title}>{t("site.myOrders")}</h1>
        <div className={styles.filters}>
          {["", "pending", "accepted", "delivered", "cancelled"].map((s) => (
            <button key={s} className={`${styles.filterBtn} ${status === s ? styles.active : ""}`} onClick={() => setStatus(s)}>
              {s ? t(`site.${s}`) : t("site.all")}
            </button>
          ))}
        </div>
        {loading && <div className={styles.loading}>{t("site.loading")}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && orders.length === 0 && <div className={styles.empty}>{t("site.noOrders")}</div>}
        <div className={styles.list}>
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.restaurant}>{order.restaurant_name}</span>
                <span className={`${styles.status} ${styles[order.status]}`}>{t(`site.${order.status}`)}</span>
              </div>
              <div className={styles.cardBody}>
                <span>{order.items.length} {t("site.items")}</span>
                <span className={styles.total}>${order.total.toFixed(2)}</span>
              </div>
              <div className={styles.cardFooter}>{order.delivery_address}</div>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllOrders } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Order } from "@/lib/types";
import styles from "./page.module.css";

const STATUSES = ["", "pending", "accepted", "delivered"];

export default function AdminOrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetchAllOrders(status || undefined, page, limit)
      .then((res) => { setOrders(res.orders); setTotal(res.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, page]);

  const totalPages = Math.ceil(total / limit);

  const filtered = search
    ? orders.filter((o) =>
        o.restaurant_name.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
        o.delivery_phone.includes(search)
      )
    : orders;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t("site.orders")}</h1>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.search}
          type="text"
          placeholder={t("site.searchOrders")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={styles.filters}>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${status === s ? styles.filterActive : ""}`}
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s ? t(`site.${s}`) : t("site.all")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>{t("site.loading")}</div>
      ) : (
        <>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span className={styles.th}>{t("site.order")}</span>
              <span className={styles.th}>{t("site.customer")}</span>
              <span className={styles.th}>{t("site.restaurant")}</span>
              <span className={styles.th}>{t("site.total")}</span>
              <span className={styles.th}>{t("site.courier")}</span>
              <span className={styles.th}>{t("site.status")}</span>
              <span className={styles.th}></span>
            </div>
            {filtered.map((o) => (
              <div key={o.id} className={styles.tableRow}>
                <span className={styles.td}>
                  <span className={styles.orderId}>#{o.id.slice(0, 8)}</span>
                  <span className={styles.orderTime}>{new Date(o.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                <span className={styles.td}>{o.customer_name || "Guest"}</span>
                <span className={styles.td}>{o.restaurant_name}</span>
                <span className={styles.td}><strong>{o.total.toFixed(0)} TJS</strong></span>
                <span className={styles.td}>{o.courier_name || "—"}</span>
                <span className={styles.td}>
                  <span className={`${styles.statusBadge} ${styles[o.status]}`}>{t(`site.${o.status}`)}</span>
                </span>
                <span className={styles.td}>
                  <Link href={`/admin/orders/${o.id}`} className={styles.detailBtn}>
                    {t("site.details")} →
                  </Link>
                </span>
              </div>
            ))}
          </div>

          <div className={styles.mobileList}>
            {filtered.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className={styles.mobileCard}>
                <div className={styles.mobileCardTop}>
                  <span className={styles.orderId}>#{o.id.slice(0, 8)}</span>
                  <span className={`${styles.statusBadge} ${styles[o.status]}`}>{t(`site.${o.status}`)}</span>
                </div>
                <div className={styles.mobileCardMid}>
                  <span>{o.restaurant_name}</span>
                  <strong>{o.total.toFixed(0)} TJS</strong>
                </div>
                <div className={styles.mobileCardBot}>
                  <span>{o.customer_name || "Guest"}</span>
                  <span>{new Date(o.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          )}

          {filtered.length === 0 && (
            <div className={styles.empty}>{t("site.noOrders")}</div>
          )}
        </>
      )}
    </div>
  );
}

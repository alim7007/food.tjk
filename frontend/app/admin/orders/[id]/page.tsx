"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById, updateOrderStatus, cancelOrder, assignCourier, fetchCouriers } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/admin/Toast";
import type { Order, Courier } from "@/lib/types";
import styles from "./page.module.css";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([fetchOrderById(id), fetchCouriers()])
      .then(([o, c]) => { setOrder(o); setCouriers(c); })
      .catch(() => toast("Failed to load order", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatus = async (status: string) => {
    if (!order) return;
    setActionLoading(status);
    try {
      if (status === "cancelled") {
        await cancelOrder(order.id);
      } else {
        await updateOrderStatus(order.id, status);
      }
      setOrder({ ...order, status });
      toast(t("site.statusUpdated"), "success");
    } catch {
      toast(t("site.actionFailed"), "error");
    } finally {
      setActionLoading("");
    }
  };

  const handleAssign = async (courierId: string) => {
    if (!order) return;
    setActionLoading("assign");
    try {
      await assignCourier(order.id, courierId);
      const c = couriers.find((x) => x.id === courierId);
      setOrder({ ...order, courier_id: courierId, courier_name: c?.name || "", courier_phone: c?.phone || "" });
      toast(t("site.courierAssigned"), "success");
    } catch {
      toast(t("site.actionFailed"), "error");
    } finally {
      setActionLoading("");
    }
  };

  if (loading) return <div className={styles.loading}>{t("site.loading")}</div>;
  if (!order) return <div className={styles.error}>{t("site.notFound")}</div>;

  const statusSteps = ["pending", "accepted", "delivered"];
  const currentStep = order.status === "cancelled" ? -1 : statusSteps.indexOf(order.status);

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.back()}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        {t("site.back")}
      </button>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>{t("site.order")} #{order.id.slice(0, 8)}</h1>
          <span className={styles.date}>{new Date(order.created_at).toLocaleString("ru")}</span>
        </div>
        <span className={`${styles.statusBadge} ${styles[order.status]}`}>{t(`site.${order.status}`)}</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("site.customer")}</h2>
            <div className={styles.infoRow}><span className={styles.infoLabel}>{t("site.name")}</span><span>{order.customer_name || "Guest"}</span></div>
            <div className={styles.infoRow}><span className={styles.infoLabel}>{t("site.phone")}</span><span>{order.delivery_phone}</span></div>
            <div className={styles.infoRow}><span className={styles.infoLabel}>{t("site.address")}</span><span>{order.delivery_address}</span></div>
            {order.note && <div className={styles.infoRow}><span className={styles.infoLabel}>{t("site.note")}</span><span>{order.note}</span></div>}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("site.items")}</h2>
            {order.items.map((item) => (
              <div key={item.id} className={styles.itemRow}>
                <span>{item.food_name} × {item.quantity}</span>
                <span>{item.total_price.toFixed(2)} TJS</span>
              </div>
            ))}
            <div className={styles.divider} />
            <div className={styles.itemRow}><span>{t("site.subtotal")}</span><span>{order.subtotal.toFixed(2)} TJS</span></div>
            <div className={styles.itemRow}><span>{t("site.delivery")}</span><span>{order.delivery_fee.toFixed(2)} TJS</span></div>
            <div className={`${styles.itemRow} ${styles.totalRow}`}><span>{t("site.total")}</span><span>{order.total.toFixed(2)} TJS</span></div>
          </div>
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("site.restaurant")}</h2>
            <span className={styles.restName}>{order.restaurant_name}</span>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("site.courier")}</h2>
            {order.courier_name ? (
              <div>
                <span className={styles.courierName}>{order.courier_name}</span>
                <span className={styles.courierPhone}>{order.courier_phone}</span>
              </div>
            ) : (
              <span className={styles.noCourier}>{t("site.notAssigned")}</span>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{t("site.status")}</h2>
            <div className={styles.timeline}>
              {statusSteps.map((step, i) => (
                <div key={step} className={`${styles.timelineStep} ${i <= currentStep ? styles.timelineDone : ""}`}>
                  <div className={styles.timelineDot}>{i <= currentStep ? "✓" : i + 1}</div>
                  <span>{t(`site.${step}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            {order.status === "pending" && (
              <button className={styles.actionBtn} onClick={() => handleStatus("accepted")} disabled={!!actionLoading}>
                {actionLoading === "accepted" ? "..." : t("site.accept")}
              </button>
            )}
            {order.status === "accepted" && !order.courier_id && (
              <select
                className={styles.assignSelect}
                value=""
                onChange={(e) => e.target.value && handleAssign(e.target.value)}
                disabled={!!actionLoading}
              >
                <option value="">{t("site.assignCourier")}...</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            )}
            {order.status === "accepted" && order.courier_id && (
              <button className={styles.actionBtn} onClick={() => handleStatus("delivered")} disabled={!!actionLoading}>
                {actionLoading === "delivered" ? "..." : t("site.markDelivered")}
              </button>
            )}
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <button className={styles.cancelBtn} onClick={() => handleStatus("cancelled")} disabled={!!actionLoading}>
                {actionLoading === "cancelled" ? "..." : t("site.cancelOrder")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

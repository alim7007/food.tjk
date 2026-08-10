"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchPublicCouriers } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Courier } from "@/lib/types";
import styles from "./page.module.css";

export default function CourierHomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCouriers()
      .then(setCouriers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (courier: Courier) => {
    localStorage.setItem("nexara_courier_id", courier.id);
    localStorage.setItem("nexara_courier_name", courier.name);
    router.push("/courier/orders");
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t("site.selectCourier")}</h1>
        <div className={styles.loading}>{t("site.loading")}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("site.selectCourier")}</h1>
      <p className={styles.subtitle}>{t("site.selectCourierDesc")}</p>
      <div className={styles.list}>
        {couriers.map((c) => (
          <button key={c.id} className={styles.card} onClick={() => handleSelect(c)}>
            <span className={styles.name}>{c.name}</span>
            <span className={styles.phone}>{c.phone}</span>
            <span className={styles.arrow}>→</span>
          </button>
        ))}
        {couriers.length === 0 && (
          <div className={styles.empty}>{t("site.noCouriers")}</div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { fetchCouriers, createCourier } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/admin/Toast";
import type { Courier } from "@/lib/types";
import styles from "./page.module.css";

export default function AdminCouriersPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCouriers()
      .then(setCouriers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !userId.trim()) return;
    setSaving(true);
    try {
      const created = await createCourier({ user_id: userId, name, phone });
      setCouriers((prev) => [...prev, created]);
      toast(t("site.courierCreated"), "success");
      setShowForm(false);
      setName(""); setPhone(""); setUserId("");
    } catch { toast(t("site.actionFailed"), "error"); }
    finally { setSaving(false); }
  };

  const filtered = search
    ? couriers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : couriers;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t("site.couriers")}</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("site.addCourier")}
        </button>
      </div>

      <input
        className={styles.search}
        type="text"
        placeholder={t("site.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <div className={styles.loading}>{t("site.loading")}</div>
      ) : (
        <div className={styles.list}>
          {filtered.map((c) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.avatar}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{c.name}</h3>
                <span className={styles.cardPhone}>{c.phone}</span>
              </div>
              <span className={`${styles.statusBadge} ${c.is_active ? styles.active : styles.inactive}`}>
                {c.is_active ? t("site.active") : t("site.inactive")}
              </span>
            </div>
          ))}
          {filtered.length === 0 && <div className={styles.empty}>{t("site.noCouriers")}</div>}
        </div>
      )}

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{t("site.addCourier")}</h2>
            <div className={styles.notice}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>{t("site.courierNotice")}</span>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.userId")}</label>
              <input className={styles.input} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="UUID пользователя" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.name")}</label>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.phone")}</label>
              <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>{t("site.cancel")}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim() || !phone.trim() || !userId.trim()}>
                {saving ? "..." : t("site.addCourier")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

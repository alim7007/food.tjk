"use client";

import { useState, useEffect, useRef } from "react";
import { fetchRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { imageUrl } from "@/lib/image";
import type { Restaurant } from "@/lib/types";
import styles from "./page.module.css";

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
  const res = await fetch(`${apiUrl}/admin/upload`, { method: "POST", credentials: "include", body: formData });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message || "Upload failed");
  return body.data.url;
}

export default function AdminRestaurantsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRestaurants(undefined, 1, 100)
      .then((res) => setRestaurants(res.restaurants))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName(""); setDesc(""); setImage("");
    setShowForm(true);
  };

  const openEdit = (r: Restaurant) => {
    setEditing(r);
    setName(r.name); setDesc(r.description || ""); setImage(r.image_url || "");
    setShowForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { setImage(await uploadImage(file)); }
    catch { toast(t("site.uploadFailed"), "error"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateRestaurant(editing.id, { name, description: desc, image_url: image || undefined });
        setRestaurants((prev) => prev.map((r) => r.id === updated.id ? updated : r));
        toast(t("site.restaurantUpdated"), "success");
      } else {
        const created = await createRestaurant(name, desc, image || undefined);
        setRestaurants((prev) => [created, ...prev]);
        toast(t("site.restaurantCreated"), "success");
      }
      setShowForm(false);
    } catch { toast(t("site.actionFailed"), "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRestaurant(deleteTarget.id);
      setRestaurants((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast(t("site.restaurantDeleted"), "success");
    } catch { toast(t("site.actionFailed"), "error"); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const filtered = search
    ? restaurants.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : restaurants;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t("site.restaurants")}</h1>
        <button className={styles.addBtn} onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("site.addRestaurant")}
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
          {filtered.map((r) => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardImage}>
                {r.image_url ? <img src={imageUrl(r.image_url)!} alt={r.name} /> : <div className={styles.noImage}>?</div>}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{r.name}</h3>
                {r.description && <p className={styles.cardDesc}>{r.description}</p>}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.editBtn} onClick={() => openEdit(r)}>{t("site.edit")}</button>
                <button className={styles.delBtn} onClick={() => setDeleteTarget(r)}>{t("site.delete")}</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className={styles.empty}>{t("site.noRestaurants")}</div>}
        </div>
      )}

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editing ? t("site.editRestaurant") : t("site.addRestaurant")}</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.name")}</label>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.description")}</label>
              <textarea className={styles.textarea} value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.image")}</label>
              <div className={styles.uploadArea}>
                {image ? (
                  <div className={styles.preview}>
                    <img src={imageUrl(image)!} alt="" />
                    <button className={styles.removeImg} onClick={() => setImage("")}>✕</button>
                  </div>
                ) : (
                  <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? "..." : t("site.uploadImage")}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} hidden />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>{t("site.cancel")}</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? "..." : editing ? t("site.save") : t("site.addRestaurant")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("site.deleteRestaurant")}
          message={`${t("site.deleteRestaurantConfirm")} "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { fetchRestaurants, fetchFoodsByRestaurant, fetchCategories, createFood, updateFood, deleteFood } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/admin/Toast";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { imageUrl } from "@/lib/image";
import type { Restaurant, Food, Category } from "@/lib/types";
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

export default function AdminMenuPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRest, setSelectedRest] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [catId, setCatId] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Food | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([fetchRestaurants(undefined, 1, 100), fetchCategories()])
      .then(([r, c]) => { setRestaurants(r.restaurants); setCategories(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRest) { setFoods([]); return; }
    setLoading(true);
    fetchFoodsByRestaurant(selectedRest)
      .then(setFoods)
      .catch(() => setFoods([]))
      .finally(() => setLoading(false));
  }, [selectedRest]);

  const openCreate = () => {
    if (!selectedRest) return;
    setEditing(null);
    setName(""); setDesc(""); setPrice(""); setCatId(""); setImage("");
    setShowForm(true);
  };

  const openEdit = (f: Food) => {
    setEditing(f);
    setName(f.name); setDesc(f.description || ""); setPrice(String(f.price)); setCatId(f.category_id); setImage(f.image_url || "");
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
    if (!name.trim() || !price || !catId || !selectedRest) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateFood(editing.id, { name, description: desc, price: parseFloat(price), category_id: catId, image_url: image || undefined });
        setFoods((prev) => prev.map((f) => f.id === updated.id ? updated : f));
        toast(t("site.foodUpdated"), "success");
      } else {
        const created = await createFood(selectedRest, { category_id: catId, name, description: desc, price: parseFloat(price), image_url: image || undefined });
        setFoods((prev) => [...prev, created]);
        toast(t("site.foodCreated"), "success");
      }
      setShowForm(false);
    } catch { toast(t("site.actionFailed"), "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFood(deleteTarget.id);
      setFoods((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      toast(t("site.foodDeleted"), "success");
    } catch { toast(t("site.actionFailed"), "error"); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const filtered = foods.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter && f.category_id !== catFilter) return false;
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t("site.menu")}</h1>
        {selectedRest && (
          <button className={styles.addBtn} onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t("site.addFood")}
          </button>
        )}
      </div>

      <div className={styles.controls}>
        <select className={styles.select} value={selectedRest} onChange={(e) => setSelectedRest(e.target.value)}>
          <option value="">{t("site.selectRestaurant")}...</option>
          {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {selectedRest && (
          <>
            <input className={styles.search} type="text" placeholder={t("site.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className={styles.select} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">{t("site.allCategories")}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
      </div>

      {!selectedRest ? (
        <div className={styles.empty}>{t("site.selectRestaurantFirst")}</div>
      ) : loading ? (
        <div className={styles.loading}>{t("site.loading")}</div>
      ) : (
        <div className={styles.list}>
          {filtered.map((f) => (
            <div key={f.id} className={styles.card}>
              <div className={styles.cardImage}>
                {f.image_url ? <img src={imageUrl(f.image_url)!} alt={f.name} /> : <div className={styles.noImage}>?</div>}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>{f.name}</h3>
                <span className={styles.cardCat}>{categories.find((c) => c.id === f.category_id)?.name || "—"}</span>
              </div>
              <span className={styles.cardPrice}>{f.price.toFixed(2)} TJS</span>
              <div className={styles.cardActions}>
                <button className={styles.editBtn} onClick={() => openEdit(f)}>{t("site.edit")}</button>
                <button className={styles.delBtn} onClick={() => setDeleteTarget(f)}>{t("site.delete")}</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className={styles.empty}>{t("site.noFoods")}</div>}
        </div>
      )}

      {showForm && (
        <div className={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{editing ? t("site.editFood") : t("site.addFood")}</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.name")}</label>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>{t("site.description")}</label>
              <textarea className={styles.textarea} value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("site.price")} (TJS)</label>
                <input className={styles.input} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("site.category")}</label>
                <select className={styles.input} value={catId} onChange={(e) => setCatId(e.target.value)}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
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
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !name.trim() || !price || !catId}>
                {saving ? "..." : editing ? t("site.save") : t("site.addFood")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("site.deleteFood")}
          message={`${t("site.deleteFoodConfirm")} "${deleteTarget.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

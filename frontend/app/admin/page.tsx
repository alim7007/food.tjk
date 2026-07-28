"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import Container from "@/components/layout/Container";
import { fetchAllOrders, updateOrderStatus, assignCourier, fetchCouriers, fetchRestaurants, createRestaurant, deleteRestaurant, fetchFoodsByRestaurant, createFood, deleteFood, fetchCategories, createCourier } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Order, Courier, Restaurant, Food, Category } from "@/lib/types";
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

type Tab = "orders" | "restaurants" | "couriers";

export default function AdminPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [newRestName, setNewRestName] = useState("");
  const [newRestDesc, setNewRestDesc] = useState("");
  const [newRestImage, setNewRestImage] = useState("");
  const [uploadingRest, setUploadingRest] = useState(false);

  const [selectedRest, setSelectedRest] = useState<string>("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [newFoodName, setNewFoodName] = useState("");
  const [newFoodDesc, setNewFoodDesc] = useState("");
  const [newFoodPrice, setNewFoodPrice] = useState("");
  const [newFoodCat, setNewFoodCat] = useState("");
  const [newFoodImage, setNewFoodImage] = useState("");
  const [uploadingFood, setUploadingFood] = useState(false);

  const [newCourierName, setNewCourierName] = useState("");
  const [newCourierPhone, setNewCourierPhone] = useState("");
  const [newCourierUserId, setNewCourierUserId] = useState("");

  const restFileRef = useRef<HTMLInputElement>(null);
  const foodFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAllOrders(statusFilter || undefined), fetchCouriers(), fetchRestaurants(), fetchCategories()])
      .then(([o, c, r, cat]) => { setOrders(o.orders); setCouriers(c); setRestaurants(r.restaurants); setCategories(cat); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    if (selectedRest) fetchFoodsByRestaurant(selectedRest).then(setFoods).catch(() => setFoods([]));
  }, [selectedRest]);

  const handleRestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRest(true);
    try { setNewRestImage(await uploadImage(file)); }
    catch (err: any) { setError(err.message); }
    finally { setUploadingRest(false); }
  };

  const handleFoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFood(true);
    try { setNewFoodImage(await uploadImage(file)); }
    catch (err: any) { setError(err.message); }
    finally { setUploadingFood(false); }
  };

  const handleStatus = async (orderId: string, status: string) => {
    try { await updateOrderStatus(orderId, status); setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o))); }
    catch (err: any) { setError(err.message); }
  };

  const handleAssign = async (orderId: string, courierId: string) => {
    try {
      await assignCourier(orderId, courierId);
      const c = couriers.find((x) => x.id === courierId);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, courier_id: courierId, courier_name: c?.name || "", courier_phone: c?.phone || "" } : o));
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateRest = async () => {
    if (!newRestName) return;
    try { const r = await createRestaurant(newRestName, newRestDesc, newRestImage || undefined); setRestaurants((prev) => [r, ...prev]); setNewRestName(""); setNewRestDesc(""); setNewRestImage(""); }
    catch (err: any) { setError(err.message); }
  };

  const handleDeleteRest = async (id: string) => {
    try { await deleteRestaurant(id); setRestaurants((prev) => prev.filter((r) => r.id !== id)); }
    catch (err: any) { setError(err.message); }
  };

  const handleCreateFood = async () => {
    if (!selectedRest || !newFoodName || !newFoodPrice || !newFoodCat) return;
    try {
      const f = await createFood(selectedRest, { category_id: newFoodCat, name: newFoodName, description: newFoodDesc, price: parseFloat(newFoodPrice), image_url: newFoodImage || undefined });
      setFoods((prev) => [...prev, f]);
      setNewFoodName(""); setNewFoodDesc(""); setNewFoodPrice(""); setNewFoodImage("");
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteFood = async (foodId: string) => {
    try { await deleteFood(foodId); setFoods((prev) => prev.filter((f) => f.id !== foodId)); }
    catch (err: any) { setError(err.message); }
  };

  const handleCreateCourier = async () => {
    if (!newCourierName || !newCourierPhone || !newCourierUserId) return;
    try { const c = await createCourier({ user_id: newCourierUserId, name: newCourierName, phone: newCourierPhone }); setCouriers((prev) => [...prev, c]); setNewCourierName(""); setNewCourierPhone(""); setNewCourierUserId(""); }
    catch (err: any) { setError(err.message); }
  };

  return (
    <>
      <Header />
      <Container>
        <h1 className={styles.title}>{t("site.admin")}</h1>
        <div className={styles.tabs}>
          {(["orders", "restaurants", "couriers"] as Tab[]).map((tb) => (
            <button key={tb} className={`${styles.tab} ${tab === tb ? styles.activeTab : ""}`} onClick={() => setTab(tb)}>
              {t(`site.${tb}`)}
            </button>
          ))}
        </div>
        {error && <div className={styles.error}>{error}</div>}

        {tab === "orders" && (
          <div>
            <div className={styles.filters}>
              {["", "pending", "accepted", "delivered"].map((s) => (
                <button key={s} className={`${styles.filterBtn} ${statusFilter === s ? styles.activeFilter : ""}`} onClick={() => setStatusFilter(s)}>
                  {s ? t(`site.${s}`) : t("site.all")}
                </button>
              ))}
            </div>
            {loading && <div className={styles.loading}>{t("site.loading")}</div>}
            <div className={styles.orderList}>
              {orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <span className={styles.orderRest}>{order.restaurant_name}</span>
                    <span className={`${styles.orderStatus} ${styles[order.status]}`}>{t(`site.${order.status}`)}</span>
                  </div>
                  <div className={styles.orderInfo}>
                    <span>{order.customer_name || "Guest"}</span>
                    <span>{order.delivery_phone}</span>
                    <span>{order.delivery_address}</span>
                  </div>
                  {order.note && <div className={styles.orderNote}>{t("site.note")}: {order.note}</div>}
                  <div className={styles.orderItems}>{order.items.map((item) => <span key={item.id}>{item.food_name} × {item.quantity}</span>)}</div>
                  <div className={styles.orderTotal}>${order.total.toFixed(2)}</div>
                  {order.courier_name && <div className={styles.courierInfo}>{t("site.courier")}: {order.courier_name} ({order.courier_phone})</div>}
                  <div className={styles.orderActions}>
                    {order.status === "pending" && <button className={styles.actionBtn} onClick={() => handleStatus(order.id, "accepted")}>{t("site.accept")}</button>}
                    {order.status === "accepted" && !order.courier_id && (
                      <select className={styles.select} value="" onChange={(e) => e.target.value && handleAssign(order.id, e.target.value)}>
                        <option value="">{t("site.assignCourier")}...</option>
                        {couriers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                      </select>
                    )}
                    {order.status === "accepted" && order.courier_id && <button className={styles.actionBtn} onClick={() => handleStatus(order.id, "delivered")}>{t("site.markDelivered")}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "restaurants" && (
          <div>
            <div className={styles.formRow}>
              <input className={styles.input} placeholder={t("site.name")} value={newRestName} onChange={(e) => setNewRestName(e.target.value)} />
              <input className={styles.input} placeholder={t("site.description")} value={newRestDesc} onChange={(e) => setNewRestDesc(e.target.value)} />
              <input ref={restFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleRestUpload} style={{ display: "none" }} />
              <button className={styles.uploadBtn} onClick={() => restFileRef.current?.click()} disabled={uploadingRest}>
                {uploadingRest ? "..." : newRestImage ? "✓" : t("site.uploadImage")}
              </button>
              <button className={styles.actionBtn} onClick={handleCreateRest}>{t("site.addRestaurant")}</button>
            </div>
            <div className={styles.restList}>
              {restaurants.map((r) => (
                <div key={r.id} className={styles.restCard}>
                  <div className={styles.restHeader}>
                    <strong>{r.name}</strong>
                    <button className={styles.dangerBtn} onClick={() => handleDeleteRest(r.id)}>{t("site.delete")}</button>
                  </div>
                  <button className={styles.actionBtn} onClick={() => setSelectedRest(selectedRest === r.id ? "" : r.id)}>
                    {selectedRest === r.id ? t("site.close") : t("site.manageFoods")}
                  </button>
                  {selectedRest === r.id && (
                    <div className={styles.foodSection}>
                      <div className={styles.formRow}>
                        <input className={styles.input} placeholder={t("site.name")} value={newFoodName} onChange={(e) => setNewFoodName(e.target.value)} />
                        <input className={styles.input} placeholder={t("site.description")} value={newFoodDesc} onChange={(e) => setNewFoodDesc(e.target.value)} />
                        <input className={styles.input} type="number" placeholder={t("site.price")} value={newFoodPrice} onChange={(e) => setNewFoodPrice(e.target.value)} />
                        <select className={styles.select} value={newFoodCat} onChange={(e) => setNewFoodCat(e.target.value)}>
                          <option value="">{t("site.category")}</option>
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input ref={foodFileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFoodUpload} style={{ display: "none" }} />
                        <button className={styles.uploadBtn} onClick={() => foodFileRef.current?.click()} disabled={uploadingFood}>
                          {uploadingFood ? "..." : newFoodImage ? "✓" : t("site.uploadImage")}
                        </button>
                        <button className={styles.actionBtn} onClick={handleCreateFood}>{t("site.addFood")}</button>
                      </div>
                      {foods.map((f) => (
                        <div key={f.id} className={styles.foodRow}>
                          <span>{f.name}</span>
                          <span>${f.price.toFixed(2)}</span>
                          <button className={styles.dangerBtn} onClick={() => handleDeleteFood(f.id)}>{t("site.delete")}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "couriers" && (
          <div>
            <div className={styles.formRow}>
              <input className={styles.input} placeholder="User ID" value={newCourierUserId} onChange={(e) => setNewCourierUserId(e.target.value)} />
              <input className={styles.input} placeholder={t("site.name")} value={newCourierName} onChange={(e) => setNewCourierName(e.target.value)} />
              <input className={styles.input} placeholder={t("site.phone")} value={newCourierPhone} onChange={(e) => setNewCourierPhone(e.target.value)} />
              <button className={styles.actionBtn} onClick={handleCreateCourier}>{t("site.addCourier")}</button>
            </div>
            <div className={styles.courierList}>
              {couriers.map((c) => (
                <div key={c.id} className={styles.courierCard}><strong>{c.name}</strong><span>{c.phone}</span></div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}

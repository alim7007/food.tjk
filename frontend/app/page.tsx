"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { fetchRestaurants, fetchCategories } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/image";
import { SkeletonCard } from "@/components/ui/Skeleton";
import type { Restaurant, Category } from "@/lib/types";
import styles from "./page.module.css";

export default function HomePage() {
  const { t } = useI18n();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRestaurants(search || undefined)
      .then((res) => { setRestaurants(res.restaurants); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  const filtered = activeCat
    ? restaurants.filter((r) => {
        return true;
      })
    : restaurants;

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className={styles.search}
            type="text"
            placeholder={t("site.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <div className={styles.categories}>
            <button
              className={`${styles.catPill} ${activeCat === "" ? styles.catActive : ""}`}
              onClick={() => setActiveCat("")}
            >
              {t("site.all")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={`${styles.catPill} ${activeCat === c.id ? styles.catActive : ""}`}
                onClick={() => setActiveCat(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <h2 className={styles.sectionTitle}>{t("site.restaurants")}</h2>

        {loading && (
          <div className={styles.grid}>
            {[1,2,3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={() => { setError(null); setLoading(true); fetchRestaurants(search || undefined).then((res) => { setRestaurants(res.restaurants); setError(null); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }}>
              {t("site.retry")}
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className={styles.empty}>{t("site.noRestaurants")}</div>
        )}

        {!loading && !error && (
          <div className={styles.grid}>
            {filtered.map((r) => (
              <Link key={r.id} href={`/restaurants/${r.id}`} className={styles.card}>
                <div className={styles.cardImage}>
                  {r.image_url ? (
                    <img src={imageUrl(r.image_url)!} alt={r.name} />
                  ) : (
                    <div className={styles.placeholder}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{r.name}</h3>
                  {r.description && <p className={styles.cardDesc}>{r.description}</p>}
                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      30-45 min
                    </span>
                    <span className={styles.metaItem}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      10 TJS
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/layout/Container";
import { fetchRestaurants } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/image";
import type { Restaurant } from "@/lib/types";
import styles from "./page.module.css";

export default function HomePage() {
  const { t } = useI18n();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchRestaurants(search)
      .then((res) => { setRestaurants(res.restaurants); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <>
      <Header />
      <Container>
        <div className={styles.hero}>
          <h1 className={styles.title}>{t("site.title")}</h1>
          <p className={styles.subtitle}>{t("site.subtitle")}</p>
          <input className={styles.search} type="text" placeholder={t("site.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading && <div className={styles.loading}>{t("site.loading")}</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && !error && restaurants.length === 0 && <div className={styles.empty}>{t("site.noRestaurants")}</div>}
        <div className={styles.grid}>
          {restaurants.map((r) => (
            <Link key={r.id} href={`/restaurants/${r.id}`} className={styles.card}>
              <div className={styles.cardImage}>
                {r.image_url ? <img src={imageUrl(r.image_url)!} alt={r.name} /> : <div className={styles.placeholder}>🍽️</div>}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{r.name}</h3>
                {r.description && <p className={styles.cardDesc}>{r.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}

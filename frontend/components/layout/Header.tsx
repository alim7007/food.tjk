"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import styles from "./Header.module.css";

export default function Header() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          Nexara
        </Link>

        <div className={styles.actions}>
          <select
            className={styles.langSelect}
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
          >
            <option value="tj">TJ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>

          {user ? (
            <>
              {user.role === "customer" && (
                <Link href="/orders" className={styles.navLink}>
                  {t("site.myOrders")}
                </Link>
              )}
              {user.role === "admin" && (
                <Link href="/admin" className={styles.navLink}>
                  {t("site.admin")}
                </Link>
              )}
              {user.role === "courier" && (
                <Link href="/courier/orders" className={styles.navLink}>
                  {t("site.orders")}
                </Link>
              )}
              <button onClick={handleLogout} className={styles.navLink}>
                {t("site.logout")}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>
                {t("site.login")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

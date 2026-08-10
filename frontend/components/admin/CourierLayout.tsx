"use client";

import { useState, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/admin/Toast";
import styles from "./CourierLayout.module.css";

const CourierSSEContext = createContext<number>(0);

export function useCourierSSEVersion() {
  return useContext(CourierSSEContext);
}

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [sseVersion, setSSEVersion] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current || !audioRef.current) return;
      audioRef.current.volume = 0;
      audioRef.current.play().then(() => {
        audioRef.current!.pause();
        audioRef.current!.currentTime = 0;
        audioRef.current!.volume = 0.5;
        audioUnlocked.current = true;
      }).catch(() => {});
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    const base = apiUrl.replace(/\/api\/v1$/, "");
    const es = new EventSource(`${base}/api/v1/courier/orders/events`, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "order_assigned") {
          toast(`Новый заказ: ${data.restaurant} — ${data.total} TJS`, "info");
          setSSEVersion((v) => v + 1);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        }
      } catch {}
    };

    es.onerror = () => {};

    return () => {
      es.close();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <CourierSSEContext.Provider value={sseVersion}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <span className={styles.brand}>Zudras Courier</span>
          <div className={styles.topbarRight}>
            <span className={styles.userName}>{user?.name}</span>
            <select className={styles.langSelect} value={lang} onChange={(e) => setLang(e.target.value as any)}>
              <option value="tj">TJ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              {t("site.logout")}
            </button>
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </CourierSSEContext.Provider>
  );
}

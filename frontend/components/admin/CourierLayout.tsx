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
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

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
          playSound();
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

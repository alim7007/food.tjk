"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getProfile, saveProfile, type UserProfile } from "@/lib/profile";
import styles from "./Header.module.css";

export default function Header() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const openProfile = () => {
    const p = getProfile();
    setProfile(p);
    setPhone(p?.phone || "");
    setAddress(p?.address || "");
    setProfileOpen(!profileOpen);
    setEditing(false);
  };

  const handleSaveProfile = () => {
    setSaving(true);
    const p: UserProfile = { phone: phone.trim(), address: address.trim() };
    saveProfile(p);
    setProfile(p);
    setEditing(false);
    setSaving(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          Zudras
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

              <div className={styles.profileWrap} ref={dropdownRef}>
                <button className={styles.profileBtn} onClick={openProfile}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>

                {profileOpen && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownHead}>
                      <span className={styles.dropdownName}>{user.name}</span>
                      <span className={styles.dropdownEmail}>{user.email}</span>
                    </div>

                    {!editing ? (
                      <>
                        {profile?.address || profile?.phone ? (
                          <div className={styles.profileInfo}>
                            {profile.address && (
                              <div className={styles.profileRow}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                <span>{profile.address}</span>
                              </div>
                            )}
                            {profile.phone && (
                              <div className={styles.profileRow}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                <span>{profile.phone}</span>
                              </div>
                            )}
                            <button className={styles.dropdownBtn} onClick={() => setEditing(true)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              {t("site.edit")}
                            </button>
                          </div>
                        ) : (
                          <div className={styles.profileEmpty}>
                            <p>{t("site.noProfileData")}</p>
                            <button className={styles.dropdownBtn} onClick={() => setEditing(true)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              {t("site.addAddress")}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.editForm}>
                        <input
                          className={styles.editInput}
                          placeholder={t("site.phoneNumber")}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                        <input
                          className={styles.editInput}
                          placeholder={t("site.deliveryAddress")}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                        <div className={styles.editActions}>
                          <button className={styles.editCancel} onClick={() => setEditing(false)}>{t("site.cancel")}</button>
                          <button className={styles.editSave} onClick={handleSaveProfile} disabled={saving}>
                            {saving ? "..." : t("site.save")}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={styles.dropdownDivider} />
                    <Link href="/orders" className={styles.dropdownLink} onClick={() => setProfileOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      {t("site.myOrders")}
                    </Link>
                    <button className={styles.dropdownLink} onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      {t("site.logout")}
                    </button>
                  </div>
                )}
              </div>
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

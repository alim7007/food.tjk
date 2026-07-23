"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/layout/Container";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { validateEmail, validatePassword, validatePhone, validateRequired } from "@/lib/validation";
import type { UserRole } from "@/lib/types";
import styles from "./page.module.css";

export default function RegisterPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const nErr = validateRequired(name, "Name"); if (nErr) errors.name = nErr;
    const eErr = validateEmail(email); if (eErr) errors.email = eErr;
    const pErr = validatePassword(password); if (pErr) errors.password = pErr;
    if (phone) { const phErr = validatePhone(phone); if (phErr) errors.phone = phErr; }
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setError("");
    setLoading(true);
    try {
      await register({ email, password, name, phone: phone || undefined, address: address || undefined, role });
      router.push("/");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Header />
      <Container>
        <div className={styles.wrap}>
          <h1 className={styles.title}>{t("site.register")}</h1>
          {error && <div className={styles.error}>{error}</div>}
          <form onSubmit={handleSubmit} className={styles.form}>
            <input className={`${styles.input} ${fieldErrors.name ? styles.inputError : ""}`} type="text" placeholder={t("site.name")} value={name} onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }} />
            {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
            <input className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`} type="email" placeholder={t("site.email")} value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }} />
            {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
            <input className={`${styles.input} ${fieldErrors.password ? styles.inputError : ""}`} type="password" placeholder={t("site.password")} value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: "" })); }} />
            {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
            <input className={`${styles.input} ${fieldErrors.phone ? styles.inputError : ""}`} type="tel" placeholder={t("site.phone")} value={phone} onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: "" })); }} />
            {fieldErrors.phone && <span className={styles.fieldError}>{fieldErrors.phone}</span>}
            <input className={styles.input} type="text" placeholder={t("site.address")} value={address} onChange={(e) => setAddress(e.target.value)} />
            <select className={styles.input} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="customer">{t("site.customer")}</option>
              <option value="courier">{t("site.courier")}</option>
            </select>
            <button className={styles.btn} type="submit" disabled={loading}>{loading ? "..." : t("site.register")}</button>
          </form>
          <p className={styles.link}><Link href="/login">{t("site.login")}</Link></p>
        </div>
      </Container>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Container from "@/components/layout/Container";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { validateEmail, validateRequired } from "@/lib/validation";
import styles from "./page.module.css";

export default function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const pErr = validateRequired(password, "Password");
    if (eErr || pErr) { setFieldErrors({ email: eErr || undefined, password: pErr || undefined }); return; }
    setFieldErrors({});
    setError("");
    setLoading(true);
    try { await login(email, password); router.push("/"); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Header />
      <Container>
        <div className={styles.wrap}>
          <h1 className={styles.title}>{t("site.login")}</h1>
          {error && <div className={styles.error}>{error}</div>}
          <form onSubmit={handleSubmit} className={styles.form}>
            <input className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`} type="email" placeholder={t("site.email")} value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }} />
            {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
            <input className={`${styles.input} ${fieldErrors.password ? styles.inputError : ""}`} type="password" placeholder={t("site.password")} value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }} />
            {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
            <button className={styles.btn} type="submit" disabled={loading}>{loading ? "..." : t("site.login")}</button>
          </form>
          <p className={styles.link}><Link href="/register">{t("site.register")}</Link></p>
        </div>
      </Container>
    </>
  );
}

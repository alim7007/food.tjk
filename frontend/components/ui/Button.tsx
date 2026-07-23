"use client";

import { useState, useEffect, useRef, type ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "small" | "medium" | "large";
type Result = "success" | "error" | null;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  result?: Result;
}

export default function Button({
  variant = "primary",
  size = "medium",
  full = false,
  loading = false,
  result = null,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const [showResult, setShowResult] = useState<Result>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (result) {
      setShowResult(result);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowResult(null), 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [result]);

  const isDisabled = disabled || loading || showResult !== null;

  const variantClass = styles[variant] || styles.primary;
  const sizeClass = size === "small" ? styles.small : size === "large" ? styles.large : "";
  const fullClass = full ? styles.full : "";

  return (
    <button
      className={`${variantClass} ${sizeClass} ${fullClass} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {showResult === "success" && <span className={styles.checkIcon}>✓</span>}
      {showResult === "error" && <span className={styles.crossIcon}>✗</span>}
      {!loading && !showResult && children}
      {loading && children}
    </button>
  );
}

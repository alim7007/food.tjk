"use client";

import { useI18n } from "@/lib/i18n";
import styles from "./ConfirmDialog.module.css";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, loading }: Props) {
  const { t } = useI18n();

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={loading}>
            {t("site.cancel")}
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm} disabled={loading}>
            {loading ? "..." : confirmLabel || t("site.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

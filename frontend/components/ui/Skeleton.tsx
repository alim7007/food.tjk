import styles from "./Skeleton.module.css";

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.image} />
      <div className={styles.body}>
        <div className={styles.line} style={{ width: "70%" }} />
        <div className={styles.line} style={{ width: "50%" }} />
      </div>
    </div>
  );
}

export function SkeletonFoodCard() {
  return (
    <div className={styles.foodCard}>
      <div className={styles.foodImage} />
      <div className={styles.foodBody}>
        <div className={styles.line} style={{ width: "80%" }} />
        <div className={styles.line} style={{ width: "40%" }} />
      </div>
    </div>
  );
}

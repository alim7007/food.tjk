"use client";

import CourierLayout from "@/components/admin/CourierLayout";
import { ToastProvider } from "@/components/admin/Toast";

export default function CourierRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CourierLayout>{children}</CourierLayout>
    </ToastProvider>
  );
}

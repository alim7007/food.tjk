"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import { ToastProvider } from "@/components/admin/Toast";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AdminLayout>{children}</AdminLayout>
    </ToastProvider>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifikasi - BijakBeli.app",
  robots: { index: false, follow: false },
  alternates: { canonical: "/settings/notifications" },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

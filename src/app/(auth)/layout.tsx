import { Header } from "@/components/Header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      {/* Header in logged-out mode */}
      <Header showSidebar={false} />

      {/* Main content with padding for header */}
      <main className="pt-[72px]">{children}</main>
    </div>
  );
}

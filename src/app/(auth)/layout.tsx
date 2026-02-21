import { Header } from "@/components/Header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      <Header showSidebar={false} />
      <main className="min-h-0 flex-1 overflow-auto pt-[80px]">{children}</main>
    </div>
  );
}

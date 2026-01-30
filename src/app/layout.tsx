import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";

export const metadata: Metadata = {
  title: "200 Words a Day",
  description: "Learn languages effectively with 200 words a day",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}

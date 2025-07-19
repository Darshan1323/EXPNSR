import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import Link from "next/link";

const interFont = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "EXPNSR",
  description: "One stop Finance Platform",
  icons: {
    icon: "/favicon.ico", // default
    shortcut: "/favicon.ico", // for Safari
    apple: "/apple-touch-icon.png", // optional
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className={interFont.className}>
        <body className={interFont.className}>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  );
}

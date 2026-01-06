import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google"; // Changed font
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ComposeProvider } from "@/context/compose-context"; // Added context
import { Toaster } from "@/components/ui/sonner";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] }); // Configured font

export const metadata: Metadata = {
  title: "Wazzup - Secure Messaging",
  description: "End-to-end encrypted messaging application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.className}>
        <AuthProvider>
          <ComposeProvider>
             {children}
          </ComposeProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}

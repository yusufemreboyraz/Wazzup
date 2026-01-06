import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { ComposeProvider } from "@/context/compose-context";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wazzup - Secure Mailing",
  description: "End-to-end encrypted email application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={jetbrainsMono.className}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
          <AuthProvider>
            <ComposeProvider>
               {children}
            </ComposeProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

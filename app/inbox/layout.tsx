"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { ComposeDialog } from "@/components/email/compose-dialog";
import { Inbox, Send, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    // In real app, middleware redirects. Here we just show null or redirect effect handled in children/page
    return <div className="p-8">Please login...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-[200px] border-r flex flex-col p-4 gap-4">
        <div className="font-bold text-xl px-2">Wazzup</div>
        <div className="text-xs text-muted-foreground px-2 break-all">
          {user.username}
        </div>
        
        <ComposeDialog />

        <div className="flex flex-col gap-1 mt-4">
          <Link href="/inbox">
            <Button variant={pathname === "/inbox" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
              <Inbox className="w-4 h-4" /> Inbox
            </Button>
          </Link>
          <Link href="/inbox/sent">
            <Button variant={pathname === "/inbox/sent" ? "secondary" : "ghost"} className="w-full justify-start gap-2">
              <Send className="w-4 h-4" /> Sent
            </Button>
          </Link>
        </div>

        <div className="mt-auto">
          <Button variant="outline" className="w-full gap-2" onClick={logout}>
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
          {children}
      </div>
    </div>
  );
}

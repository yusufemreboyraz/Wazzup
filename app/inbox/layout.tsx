"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ComposeDialog } from "@/components/email/compose-dialog";
import { Inbox, Send, LogOut, RefreshCw, Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) {
    // Ideally this redirects in middleware or useEffect
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleRefresh = () => {
    window.location.reload(); // Simple refresh for now
  };

  const navItems = [
      { icon: Inbox, label: "Inbox", href: "/inbox", count: 0 }, // Mock count could be fetched
      { icon: Send, label: "Sent", href: "/inbox/sent", count: 0 },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-[220px] border-r flex flex-col bg-muted/30 h-full">
        
        {/* Brand Header */}
        <div className="h-[52px] flex items-center px-4 border-b shrink-0">
           <div className="flex items-center gap-2 font-bold text-lg text-primary">
              <Hexagon className="w-5 h-5 fill-current" />
              Wazzup
           </div>
        </div>

        {/* Compose Action */}
        <div className="p-4 shrink-0">
            <ComposeDialog />
        </div>

        {/* Navigation */}
        <div className="flex-1 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
                <Link 
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                         pathname === item.href 
                            ? "bg-primary/10 text-primary" 
                            : "text-muted-foreground hover:bg-muted"
                    )}
                >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {item.count > 0 && item.label === "Inbox" && (
                        <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                            {item.count}
                        </span>
                    )}
                </Link>
            ))}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t bg-background/50 shrink-0">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : "??"}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleRefresh}>
                    <RefreshCw className="w-3 h-3" /> Refresh
                 </Button>
                 <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout} title="Logout">
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                 </Button>
             </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

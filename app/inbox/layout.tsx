"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ComposeDialog } from "@/components/email/compose-dialog";
import { Inbox, Send, LogOut, RefreshCw, Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

// ... (imports)
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState({ inbox: 0 });

  useEffect(() => {
    if (!user) return;
    
    const fetchCounts = async () => {
        try {
            const res = await fetch(`/api/users/stats?userId=${user.id}`);
            const data = await res.json();
            if (data.inboxCount !== undefined) {
                setCounts({ inbox: data.inboxCount });
            }
        } catch (err) {
            console.error("Failed to fetch counts", err);
        }
    };

    fetchCounts();
    // Poll every 30s? Or just rely on page load for now.
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    // Ideally this redirects in middleware or useEffect
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleRefresh = () => {
    window.location.reload(); 
  };

  const navItems = [
      { icon: Inbox, label: "Inbox", href: "/inbox", count: counts.inbox },
      { icon: Send, label: "Sent", href: "/inbox/sent", count: 0 },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-[220px] border-r flex flex-col bg-muted/30 h-full">
        
        {/* Brand Header */}
        <div className="h-[52px] flex items-center justify-between px-4 border-b shrink-0">
           <div className="flex items-center gap-2 font-bold text-lg text-primary">
              <Hexagon className="w-5 h-5 fill-current" />
              Wazzup
           </div>
           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleRefresh} title="Refresh">
               <RefreshCw className="w-4 h-4" />
           </Button>
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
             <div className="flex flex-col gap-2">
                 <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 w-full text-left hover:bg-muted/50 p-2 rounded-md transition-colors outline-none focus-visible:ring-1">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {user.name ? user.name.substring(0, 2).toUpperCase() : "??"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                        </button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="start" className="w-[190px]">
                         <DropdownMenuLabel>My Account</DropdownMenuLabel>
                         <DropdownMenuSeparator />
                         <DropdownMenuItem className="text-red-500 focus:text-red-500" onClick={handleLogout}>
                             <LogOut className="mr-2 h-4 w-4" /> Log out
                         </DropdownMenuItem>
                     </DropdownMenuContent>
                 </DropdownMenu>
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

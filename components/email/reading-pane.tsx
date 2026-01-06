"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  Reply, 
  Trash2, 
  Star, 
  MoreVertical, 
  Archive,
  Lock,
  Loader2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Helper to get initials
function getInitials(name: string) {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
}

interface ReadingPaneProps {
  email: any | null;
  onClose?: () => void; // For mobile
}

export function ReadingPane({ email, onClose }: ReadingPaneProps) {
  if (!email) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 opacity-50" />
        </div>
        <h3 className="font-semibold text-lg">Wazzup Secure Mail</h3>
        <p className="text-sm max-w-[250px]">Select an email to verify its signature and decrypt its content.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Toolbar */}
      <div className="flex items-center p-4 border-b gap-2">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" disabled>
                <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled>
                <Trash2 className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
             <Button variant="ghost" size="icon" disabled>
                <Star className={`w-4 h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
            </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
             <span className="text-xs text-muted-foreground">
                {email.timestamp ? format(new Date(email.timestamp), "PP p") : ""}
             </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Subject & Sender Info */}
        <div className="flex items-start gap-4 mb-6">
            <Avatar className="w-10 h-10">
                <AvatarFallback>{getInitials(email.sender?.name)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
                <div className="font-semibold text-lg line-clamp-1">
                    {/* Subject usually in content, for now just Sender */}
                    Message from {email.sender?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                    From: <span className="text-foreground">{email.sender?.email}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                    To: <span className="text-foreground">Me</span>
                </div>
            </div>
        </div>

        <Separator className="mb-6" />

        {/* Content Body */}
        <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {email.decryptedContent || (
                <div className="flex items-center gap-2 text-primary animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Pending Decryption...
                </div>
            )}
        </div>
        
        {/* Security Badge */}
         <div className="mt-8 pt-4 border-t flex flex-col gap-2">
            <div className={`text-xs px-2 py-1 rounded w-fit flex items-center gap-2 border ${email.integrityVerified ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                {email.integrityVerified ? (
                    <>
                        <Lock className="w-3 h-3" />
                         Integrity Verified & Signed by {email.sender?.name}
                    </>
                ) : (
                    "Integrity Check Failed"
                )}
            </div>
             <p className="text-[10px] text-muted-foreground font-mono truncate max-w-md">
                Signature: {email.signature?.substring(0, 32)}...
            </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-muted/20">
        <Button className="w-full sm:w-auto gap-2">
            <Reply className="w-4 h-4" /> Reply
        </Button>
      </div>
    </div>
  );
}

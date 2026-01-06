"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable-panel"; // Install shadcn/ui-resizable wrapper if not present, otherwise use raw
import { ReadingPane } from "./reading-pane";
import { generateKeyPair, decryptPrivateKey, decryptContent, importPublicKey, verifySignature } from "@/lib/crypto";
import { useAuth } from "@/context/auth-context";

// Note: Shadcn Resizable relies on 'react-resizable-panels'.
// If you haven't added the UI component via shadcn CLI, you might need to use raw 'react-resizable-panels' or add the file manually.
// Assuming we need to implement the Shadcn wrapper quickly:
import * as ResizablePrimitive from "react-resizable-panels";

// --- Minimal Inline Resizable Components (in case not in ui folder) ---
const ResizablePanelGroupLocal = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
)
const ResizablePanelLocal = ResizablePrimitive.Panel
const ResizableHandleLocal = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle>) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}
  />
)
// ----------------------------------------------------------------------


interface Email {
  id: string;
  sender: { name: string; email: string; publicKey: string };
  recipient: { name: string; email: string };
  encryptedContent: string;
  encryptedAesKey: string;
  iv: string;
  signature: string;
  messageHash: string;
  timestamp: string;
  read: boolean;
  isStarred: boolean;
  decryptedContent?: string; // Client-side only
  integrityVerified?: boolean; // Client-side only
}

interface MailDisplayProps {
    emails: Email[];
    type: "inbox" | "sent";
    loading: boolean;
}

export function MailDisplay({ emails: initialEmails, type, loading }: MailDisplayProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const { privateKey } = useAuth(); // Decrypted private key

  // Sync props to state when new emails arrive
  if (initialEmails !== emails && initialEmails.length !== emails.length) {
      // Simple sync for now, in real app use useEffect
      setEmails(initialEmails);
  }

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const handleSelectEmail = async (email: Email) => {
      setSelectedEmailId(email.id);
      
      // Decrypt if not already decrypted
      if (!email.decryptedContent && privateKey) {
          try {
             // 1. Decrypt AES Key using Private Key
             // Note: In Sent folder, we encrypt the AES key for the recipient, not ourselves.
             // So we CANNOT decrypt Sent emails unless we stored a copy of AES Key encrypted for ourselves.
             // LIMITATION: Wazzup v1 Sent folder items are readable only by recipient.
             
             if (type === "sent") {
                 const mockContent = `[Secure Message Sent]\n\n(You cannot read this because the key was encrypted only for the recipient: ${email.recipient.name})`;
                 updateEmailState(email.id, { decryptedContent: mockContent, integrityVerified: true });
                 return;
             }

             const decryptedAesKey = await window.crypto.subtle.decrypt(
                 { name: "RSA-OAEP" },
                 privateKey,
                 Buffer.from(email.encryptedAesKey, "base64")
             );
             
             // Import AES Key
             const aesKey = await window.crypto.subtle.importKey(
                 "raw",
                 decryptedAesKey,
                 "AES-GCM",
                 true,
                 ["decrypt"]
             );

             // 2. Decrypt Content
             const [cipherText, authTag] = email.encryptedContent.split(":");
             const decryptedText = await decryptContent(cipherText, authTag, email.iv, aesKey);

             // 3. Verify Signature
             const isValid = await verifySignature(
                 decryptedText, 
                 email.signature, 
                 email.sender.publicKey
             );

             updateEmailState(email.id, { decryptedContent: decryptedText, integrityVerified: isValid });

          } catch (err) {
              console.error(err);
              updateEmailState(email.id, { decryptedContent: "[Decryption Failed]", integrityVerified: false });
          }
      }
  };

  const updateEmailState = (id: string, updates: Partial<Email>) => {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  return (
    <ResizablePanelGroupLocal direction="horizontal" className="h-[calc(100vh-2rem)] rounded-lg border items-stretch shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* List Pane */}
      <ResizablePanelLocal defaultSize={40} minSize={30} className="flex flex-col border-r">
        <div className="flex items-center px-4 py-2 border-b h-[52px]">
            <h1 className="text-xl font-bold mr-4">{type === 'inbox' ? 'Inbox' : 'Sent'}</h1>
            <div className="bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
                <form>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search" className="pl-8 h-9" />
                  </div>
                </form>
            </div>
        </div>
        
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-0 p-0">
                {loading ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="animate-spin w-4 h-4 mr-2"/>Syncing...</div>
                ) : emails.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground text-sm">No messages found.</div>
                ) : (
                    emails.map((email) => (
                        <button
                            key={email.id}
                            className={cn(
                                "flex flex-col items-start gap-2 border-b p-3 text-left text-sm transition-all hover:bg-accent/50",
                                selectedEmailId === email.id && "bg-accent"
                            )}
                            onClick={() => handleSelectEmail(email)}
                        >
                            <div className="flex w-full flex-col gap-1">
                                <div className="flex items-center">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("font-semibold", !email.read && "text-foreground")}>
                                            {type === 'sent' ? email.recipient.name : email.sender.name}
                                        </div>
                                        {!email.read && (
                                            <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                                        )}
                                    </div>
                                    <div className={cn("ml-auto text-xs", selectedEmailId === email.id ? "text-foreground" : "text-muted-foreground")}>
                                        {formatDistanceToNow(new Date(email.timestamp), { addSuffix: true })}
                                    </div>
                                </div>
                                <div className="text-xs font-medium line-clamp-1">
                                    {/* Subject would go here, using 'Secure Message' as placeholder if hidden */}
                                    Secure Message
                                </div> 
                                <div className="line-clamp-2 text-xs text-muted-foreground">
                                    {email.decryptedContent ? email.decryptedContent.substring(0, 100) : "End-to-end encrypted message..."}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {email.isStarred && <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Starred</Badge>}
                                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                    {type === 'sent' ? 'Sent' : 'Inbox'}
                                </Badge>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </ScrollArea>
      </ResizablePanelLocal>
      
      <ResizableHandleLocal />
      
      {/* Reading Pane */}
      <ResizablePanelLocal defaultSize={60}>
        <ReadingPane email={selectedEmail} />
      </ResizablePanelLocal>

    </ResizablePanelGroupLocal>
  );
}

// Node.js Buffer polyfill for browser environment usually handled by webpack/next
// But we used 'Buffer.from' in code. If it fails, we need manual hex conversion or use 'node-forge' utils.
// Next.js usually polyfills Buffer.

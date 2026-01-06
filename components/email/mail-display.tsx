"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ReadingPane } from "./reading-pane";
import { decryptContent, decryptAesKey, verifySignature } from "@/lib/crypto";
import { useAuth } from "@/context/auth-context";

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  encryptedContent: string;
  iv: string;
}

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
  isArchived: boolean;
  decryptedContent?: string; // Client-side only
  decryptedAesKey?: string; // Client-side only
  integrityVerified?: boolean; // Client-side only
  attachments?: Attachment[];
}

interface MailDisplayProps {
    emails: Email[];
    type: "inbox" | "sent";
    loading: boolean;
}

export function MailDisplay({ emails: initialEmails, type, loading }: MailDisplayProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const { privateKey } = useAuth(); // Decrypted private key

  // Sync props to state when new emails arrive
  if (initialEmails !== emails && initialEmails.length !== emails.length) {
      // Simple sync for now, in real app use useEffect
      setEmails(initialEmails);
  }

  const filteredEmails = emails.filter(email => {
      if (type === 'inbox' && email.isArchived) return false;
      
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      const senderName = email.sender.name.toLowerCase();
      const senderEmail = email.sender.email.toLowerCase();
      const recipientName = email.recipient.name.toLowerCase();
      
      // Since content is encrypted, we can only search metadata
      return senderName.includes(lowerQuery) || 
             senderEmail.includes(lowerQuery) || 
             recipientName.includes(lowerQuery);
  });

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const updateEmailState = (id: string, updates: Partial<Email>) => {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const updateServerStatus = async (id: string, updates: any) => {
      try {
          await fetch("/api/emails/status", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ emailId: id, status: updates }),
          });
      } catch (err) {
          console.error("Failed to update status", err);
      }
  };

  const handleSelectEmail = async (email: Email) => {
      setSelectedEmailId(email.id);
      
      // Decrypt if not already decrypted
      if (!email.decryptedContent && privateKey) {
          try {
             // 1. Decrypt AES Key using Private Key
             // Note: In Sent folder, we encrypt the AES key for the recipient, not ourselves.
             
             if (type === "sent") {
                 const mockContent = `[Secure Message Sent]\n\n(You cannot read this because the key was encrypted only for the recipient: ${email.recipient.name})`;
                 updateEmailState(email.id, { decryptedContent: mockContent, integrityVerified: true });
                 return;
             }

             // Use node-forge based helper from lib/crypto (Synchronous usually, but defined as string return)
             const aesKeyHex = decryptAesKey(email.encryptedAesKey, privateKey);

             // 2. Decrypt Content
             const [cipherText, authTag] = email.encryptedContent.split(":");
             
             // Pass hex key directly to decryptContent
             const decryptedText = decryptContent(cipherText, email.iv, aesKeyHex, authTag);

             // 3. Verify Signature
             const isValid = verifySignature(
                 decryptedText, 
                 email.signature, 
                 email.sender.publicKey
             );

             updateEmailState(email.id, { 
                 read: true, 
                 decryptedContent: decryptedText, 
                 decryptedAesKey: aesKeyHex,
                 integrityVerified: isValid 
             });

             // Mark as read in DB if not already
             if (!email.read) {
                 updateServerStatus(email.id, { read: true });
             }

          } catch (err) {
              console.error(err);
              updateEmailState(email.id, { decryptedContent: "[Decryption Failed]", integrityVerified: false });
          }
      } else if (!email.read) {
          // If already decrypted but not read (unlikely but possible), mark as read
          updateEmailState(email.id, { read: true });
          updateServerStatus(email.id, { read: true });
      }
  };

  const handleToggleStar = (id: string, current: boolean) => {
      const newState = !current;
      updateEmailState(id, { isStarred: newState });
      updateServerStatus(id, { isStarred: newState });
  };

  const handleToggleArchive = (id: string, current: boolean) => {
      const newState = !current;
      updateEmailState(id, { isArchived: newState });
      updateServerStatus(id, { isArchived: newState });
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-2rem)] rounded-lg border items-stretch shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* List Pane */}
      <ResizablePanel defaultSize={40} minSize={30} className="flex flex-col border-r">
        <div className="flex items-center px-4 py-2 border-b h-[52px]">
            <h1 className="text-xl font-bold mr-4">{type === 'inbox' ? 'Inbox' : 'Sent'}</h1>
            <div className="bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search sender or recipient..." 
                        className="pl-8 h-9" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
            </div>
        </div>
        
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-0 p-0">
                {loading ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="animate-spin w-4 h-4 mr-2"/>Syncing...</div>
                ) : filteredEmails.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground text-sm">No messages found matching filter.</div>
                ) : (
                    filteredEmails.map((email) => (
                        <div
                            key={email.id}
                            className={cn(
                                "flex w-full cursor-pointer flex-col items-start gap-2 border-b p-3 text-left text-sm transition-all hover:bg-accent/50",
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
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStar(email.id, email.isStarred);
                                    }}
                                    className="hover:bg-muted p-0.5 rounded"
                                >
                                     <Star className={cn("w-3 h-3", email.isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                                </button>
                                {email.isStarred && <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Starred</Badge>}
                                <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                    {type === 'sent' ? 'Sent' : 'Inbox'}
                                </Badge>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
      </ResizablePanel>
      
      <ResizableHandle />
      
      {/* Reading Pane */}
      <ResizablePanel defaultSize={60}>
        <ReadingPane 
            email={selectedEmail}
            onToggleStar={handleToggleStar}
            onToggleArchive={handleToggleArchive} 
        />
      </ResizablePanel>

    </ResizablePanelGroup>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ReadingPane } from "./reading-pane";
import { decryptContent, decryptAesKey, verifySignature, hashContent } from "@/lib/crypto";
import { useAuth } from "@/context/auth-context";
import { emailsApi, PaginationInfo } from "@/lib/api";
import { toast } from "sonner";

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
  decryptedContent?: string;
  decryptedAesKey?: string;
  // Security verification results (3 separate checks)
  hashVerified?: boolean;         // SHA256(content) === messageHash
  signatureValid?: boolean;       // RSA-PSS signature is valid
  senderAuthenticated?: boolean;  // Sender identity confirmed
  integrityVerified?: boolean;    // Legacy: all checks passed
  attachments?: Attachment[];
}

interface MailDisplayProps {
  emails: Email[];
  type: "inbox" | "sent" | "archive";
  loading: boolean;
  pagination?: PaginationInfo | null;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function MailDisplay({ 
  emails: initialEmails, 
  type, 
  loading,
  pagination,
  onLoadMore,
  loadingMore 
}: MailDisplayProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const { privateKey } = useAuth();

  // Sync props to state when new emails arrive
  useEffect(() => {
    setEmails(initialEmails);
  }, [initialEmails]);

  const updateEmailState = useCallback((id: string, updates: Partial<Email>) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const handleToggleArchive = useCallback(async (id: string, current: boolean) => {
    const newState = !current;
    updateEmailState(id, { isArchived: newState });
    
    try {
      await emailsApi.updateEmail({ emailId: id, isArchived: newState });
      toast.success(newState ? "Email archived" : "Email unarchived");
    } catch (err) {
      console.error("Failed to update archive status", err);
      updateEmailState(id, { isArchived: current }); // Rollback
      toast.error("Failed to update email");
    }
  }, [updateEmailState]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this email?")) return;
    
    try {
      await emailsApi.deleteEmail(id);
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmailId === id) setSelectedEmailId(null);
      toast.success("Email deleted");
    } catch (err) {
      toast.error("Could not delete email");
    }
  }, [selectedEmailId]);

  const filteredEmails = emails.filter(email => {
    if (type === 'inbox' && email.isArchived) return false;
    if (type === 'archive' && !email.isArchived) return false;

    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    const senderName = email.sender.name.toLowerCase();
    const senderEmail = email.sender.email.toLowerCase();
    const recipientName = email.recipient.name.toLowerCase();
    
    return senderName.includes(lowerQuery) || 
           senderEmail.includes(lowerQuery) || 
           recipientName.includes(lowerQuery);
  });

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  // Decrypt email when selected
  useEffect(() => {
    if (!selectedEmailId || !privateKey) return;
    
    const email = emails.find(e => e.id === selectedEmailId);
    if (!email || email.decryptedContent) return;

    const decryptEmail = async () => {
      try {
        if (type === "sent") {
          // Sent emails: we can't decrypt (key was for recipient)
          const mockContent = `[Secure Message Sent]\n\n(You cannot read this because the key was encrypted only for the recipient: ${email.recipient.name})`;
          updateEmailState(email.id, { 
            decryptedContent: mockContent, 
            hashVerified: true,
            signatureValid: true,
            senderAuthenticated: true,
            integrityVerified: true 
          });
          return;
        }

        // Inbox/Archive: decrypt the email
        const aesKeyHex = decryptAesKey(email.encryptedAesKey, privateKey);
        const [cipherText, authTag] = email.encryptedContent.split(":");
        const decryptedText = decryptContent(cipherText, email.iv, aesKeyHex, authTag);

        // === 3 SEPARATE SECURITY CHECKS ===
        
        // 1. Hash Verification: Does computed hash match stored hash?
        const computedHash = hashContent(decryptedText);
        const hashVerified = computedHash === email.messageHash;

        // 2. Signature Verification: Is the digital signature valid?
        let signatureValid = false;
        try {
          signatureValid = verifySignature(
            decryptedText, 
            email.signature, 
            email.sender.publicKey
          );
        } catch {
          signatureValid = false;
        }

        // 3. Sender Authentication: Is the sender identity confirmed?
        // (If signature is valid with sender's public key, sender is authenticated)
        const senderAuthenticated = signatureValid;

        // Legacy: all checks must pass
        const integrityVerified = hashVerified && signatureValid && senderAuthenticated;

        updateEmailState(email.id, { 
          read: true, 
          decryptedContent: decryptedText, 
          decryptedAesKey: aesKeyHex,
          hashVerified,
          signatureValid,
          senderAuthenticated,
          integrityVerified
        });

        // Mark as read on server
        if (!email.read) {
          try {
            await emailsApi.updateEmail({ emailId: email.id, read: true });
            // Dispatch event to update inbox count immediately
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('email-read'));
            }
          } catch (err) {
            console.error("Failed to mark as read", err);
          }
        }
      } catch (err) {
        console.error("Decryption error:", err);
        updateEmailState(email.id, { 
          decryptedContent: "[Decryption Failed]", 
          hashVerified: false,
          signatureValid: false,
          senderAuthenticated: false,
          integrityVerified: false 
        });
      }
    };

    decryptEmail();
  }, [selectedEmailId, privateKey, type, emails, updateEmailState]);

  const handleSelectEmail = useCallback((email: Email) => {
    setSelectedEmailId(email.id);
    setShowMobileDetail(true);
    
    // Mark as read if not already (optimistic update)
    if (!email.read && !email.decryptedContent) {
      updateEmailState(email.id, { read: true });
    }
  }, [updateEmailState]);

  const handleCloseMobileDetail = useCallback(() => {
    setShowMobileDetail(false);
  }, []);

  const handleToggleStar = useCallback(async (id: string, current: boolean) => {
    const newState = !current;
    updateEmailState(id, { isStarred: newState });
    
    try {
      await emailsApi.updateEmail({ emailId: id, isStarred: newState });
    } catch (err) {
      console.error("Failed to update star status", err);
      updateEmailState(id, { isStarred: current }); // Rollback
    }
  }, [updateEmailState]);

  // Mail List JSX
  const mailListContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-2 border-b h-[52px]">
        <h1 className="text-xl font-bold mr-4">
          {type === 'inbox' ? 'Inbox' : type === 'sent' ? 'Sent' : 'Archive'}
        </h1>
        <div className="bg-background/95 p-1 backdrop-blur supports-backdrop-filter:bg-background/60 w-full">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search sender or recipient..." 
                className="pl-8 h-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
          </form>
        </div>
      </div>
      
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-0 p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="animate-spin w-4 h-4 mr-2"/>Syncing...
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              No messages found matching filter.
            </div>
          ) : (
            <>
              {filteredEmails.map((email) => (
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
              ))}
              
              {/* Load More Button */}
              {pagination && pagination.hasMore && onLoadMore && (
                <div className="p-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Load More ({pagination.totalCount - (pagination.page * pagination.pageSize)} remaining)
                  </Button>
                </div>
              )}
              
              {/* Pagination Info */}
              {pagination && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  Showing {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of {pagination.totalCount} emails
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Desktop View - ResizablePanel */}
      <div className="hidden md:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-2rem)] rounded-lg border items-stretch shadow-sm bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          {/* List Pane */}
          <ResizablePanel defaultSize={40} minSize={30} className="flex flex-col border-r">
            {mailListContent}
          </ResizablePanel>
          
          <ResizableHandle />
          
          {/* Reading Pane */}
          <ResizablePanel defaultSize={60}>
            <ReadingPane 
              email={selectedEmail}
              onToggleStar={handleToggleStar}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDelete}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile View - Full Screen Toggle */}
      <div className="md:hidden h-full flex flex-col">
        {!showMobileDetail ? (
          <div className="h-full rounded-lg border shadow-sm bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            {mailListContent}
          </div>
        ) : (
          <div className="h-full rounded-lg border shadow-sm bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <ReadingPane 
              email={selectedEmail}
              onToggleStar={handleToggleStar}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDelete}
              onClose={handleCloseMobileDetail}
              isMobile={true}
            />
          </div>
        )}
      </div>
    </>
  );
}

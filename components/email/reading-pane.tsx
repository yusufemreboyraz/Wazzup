"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  Reply, 
  Forward,
  Trash2, 
  Star, 
  Archive,
  Lock,
  Loader2,
  Paperclip,
  File as FileIcon,
  Download,
  ShieldCheck,
  ShieldX,
  Key,
  FileDigit,
  CheckCircle2,
  XCircle,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { decryptBinaryContent } from "@/lib/crypto";
import { useCompose } from "@/context/compose-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Security Certificate Dialog
function SecurityCertificateDialog({ 
  open, 
  onOpenChange, 
  email 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  email: any;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isVerified = email?.integrityVerified;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className={`px-6 py-4 border-b ${isVerified ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center gap-3">
            {isVerified ? (
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-green-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <ShieldX className="w-6 h-6 text-red-600" />
              </div>
            )}
            <div>
              <DialogTitle className={isVerified ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                {isVerified ? 'Message Verified' : 'Verification Failed'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isVerified 
                  ? 'This message is authentic and has not been tampered with'
                  : 'This message may have been modified or is not authentic'
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Verification Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Verification Status
            </h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <FileDigit className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Digital Signature</span>
                </div>
                {isVerified ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Valid</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Invalid</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Message Integrity</span>
                </div>
                {isVerified ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Intact</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Compromised</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Sender Authentication</span>
                </div>
                {isVerified ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">Confirmed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Unverified</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Cryptographic Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cryptographic Details
            </h4>
            
            {/* Message Hash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Message Hash (SHA-256)</span>
                <button
                  onClick={() => copyToClipboard(email?.messageHash || '', 'hash')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copiedField === 'hash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'hash' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-green-400 break-all select-all">
                {email?.messageHash || 'N/A'}
              </div>
            </div>

            {/* Digital Signature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Digital Signature (RSA-PSS)</span>
                <button
                  onClick={() => copyToClipboard(email?.signature || '', 'signature')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copiedField === 'signature' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'signature' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-amber-400 break-all select-all max-h-20 overflow-y-auto">
                {email?.signature || 'N/A'}
              </div>
            </div>

            {/* Sender's Public Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sender's Public Key (RSA-2048)</span>
                <button
                  onClick={() => copyToClipboard(email?.sender?.publicKey || '', 'pubkey')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copiedField === 'pubkey' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'pubkey' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2.5 rounded bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-cyan-400 break-all select-all max-h-24 overflow-y-auto">
                {email?.sender?.publicKey || 'N/A'}
              </div>
            </div>
          </div>

          <Separator />

          {/* Encryption Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Encryption Information
            </h4>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-muted/50 border">
                <span className="text-muted-foreground">Encryption</span>
                <p className="font-medium mt-0.5">AES-256-GCM</p>
              </div>
              <div className="p-2.5 rounded bg-muted/50 border">
                <span className="text-muted-foreground">Key Exchange</span>
                <p className="font-medium mt-0.5">RSA-OAEP</p>
              </div>
              <div className="p-2.5 rounded bg-muted/50 border">
                <span className="text-muted-foreground">Hash Algorithm</span>
                <p className="font-medium mt-0.5">SHA-256</p>
              </div>
              <div className="p-2.5 rounded bg-muted/50 border">
                <span className="text-muted-foreground">Signature</span>
                <p className="font-medium mt-0.5">RSA-PSS</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sender Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sender Information
            </h4>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="text-sm">{getInitials(email?.sender?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{email?.sender?.name}</p>
                <p className="text-xs text-muted-foreground">{email?.sender?.email}</p>
              </div>
              {isVerified && (
                <div className="ml-auto">
                  <div className="px-2 py-1 rounded bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timestamp */}
          {email?.timestamp && (
            <div className="text-xs text-center text-muted-foreground pt-2">
              Signed on {format(new Date(email.timestamp), "PPpp")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReadingPaneProps {
  email: any | null;
  onClose?: () => void;
  onToggleStar?: (id: string, current: boolean) => void;
  onToggleArchive?: (id: string, current: boolean) => void;
  onDelete?: (id: string) => void;
}

export function ReadingPane({ email, onClose, onToggleStar, onToggleArchive, onDelete }: ReadingPaneProps) {
  const { openCompose } = useCompose();
  const [showCertificate, setShowCertificate] = useState(false);

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

  // Extract subject from decrypted content if available
  const extractSubject = (content: string | undefined) => {
    if (!content) return "Secure Message";
    const match = content.match(/^Subject: (.+?)(\n|$)/);
    return match ? match[1] : "Secure Message";
  };

  const handleReply = () => {
    if (!email) return;
    const subject = extractSubject(email.decryptedContent);
    openCompose({
      recipient: email.sender?.email,
      subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`, 
      message: `\n\n\n--- Original Message from ${email.sender?.name} ---\n${email.decryptedContent || ''}`
    });
  };

  const handleForward = () => {
    if (!email) return;
    const subject = extractSubject(email.decryptedContent);
    openCompose({
      recipient: "",
      subject: subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`,
      message: `\n\n\n---------- Forwarded Message ----------\nFrom: ${email.sender?.name} <${email.sender?.email}>\nDate: ${email.timestamp ? format(new Date(email.timestamp), "PPpp") : ""}\nSubject: ${subject}\n\n${email.decryptedContent || ''}`
    });
  };

  const handleDownloadAttachment = (att: any) => {
    try {
      if (!email.decryptedAesKey) throw new Error("No Key");
      
      const [cipherText, authTag] = att.encryptedContent.split(":");
      const decryptedBinary = decryptBinaryContent(cipherText, att.iv, email.decryptedAesKey, authTag);
      
      const bytes = new Uint8Array(decryptedBinary.length);
      for (let i = 0; i < decryptedBinary.length; i++) {
        bytes[i] = decryptedBinary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: att.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (e) {
      console.error(e);
      toast.error("Decryption failed");
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header Toolbar */}
        <div className="flex items-center p-4 border-b gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onToggleArchive?.(email.id, email.isArchived)} title={email.isArchived ? "Unarchive" : "Archive"}>
              <Archive className={`w-4 h-4 ${email.isArchived ? "text-primary fill-primary/10" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete?.(email.id)} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" onClick={() => onToggleStar?.(email.id, email.isStarred)} title={email.isStarred ? "Unstar" : "Star"}>
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
                {extractSubject(email.decryptedContent)}
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

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && email.decryptedAesKey && (
            <div className="mt-8">
              <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Paperclip className="w-3 h-3" /> ATTACHMENTS ({email.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {email.attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group">
                    <div className="h-10 w-10 rounded bg-background flex items-center justify-center border text-muted-foreground shrink-0">
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" title={att.filename}>
                        {att.filename}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(att.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleDownloadAttachment(att)}
                    >
                      <Download className="w-4 h-4 mb-0.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Security Badge - CLICKABLE */}
          <div className="mt-8 pt-4 border-t">
            <button
              onClick={() => setShowCertificate(true)}
              className={`text-xs px-3 py-2 rounded w-fit flex items-center gap-2 border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                email.integrityVerified 
                  ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30' 
                  : 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30'
              }`}
            >
              {email.integrityVerified ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Integrity Verified & Signed by {email.sender?.name}</span>
                </>
              ) : (
                <>
                  <ShieldX className="w-4 h-4" />
                  <span>Integrity Check Failed</span>
                </>
              )}
              <span className="text-[10px] opacity-60 ml-1">Click for details</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/20 flex gap-2">
          <Button 
            className="gap-2"
            onClick={handleReply}
          >
            <Reply className="w-4 h-4" /> Reply
          </Button>
          <Button 
            variant="outline"
            className="gap-2"
            onClick={handleForward}
          >
            <Forward className="w-4 h-4" /> Forward
          </Button>
        </div>
      </div>

      {/* Security Certificate Dialog */}
      <SecurityCertificateDialog 
        open={showCertificate} 
        onOpenChange={setShowCertificate} 
        email={email}
      />
    </>
  );
}

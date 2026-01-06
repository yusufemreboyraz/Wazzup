"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { 
  generateAesKey, 
  encryptContent, 
  encryptAesKey, 
  generateSignatureAndHash 
} from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const composeSchema = z.object({
  recipient: z.string().min(1, "Recipient is required"),
  subject: z.string().optional(), // Subject is usually part of content or separate. Plan said "Subject" can be separate. Wait, DB doesn't have Subject column in Schema?
  // Checking Schema: Email { id, senderId, recipientId, encryptedContent, ... }
  // I forgot to add 'subject' to the Schema! 
  // For now, I'll put subject INSIDE the encrypted content: "Subject: ...\n\nBody"
  // Or I can add it to schema. User requirements: "Email content is encrypted".
  // Usually metadata like Subject IS encrypted to hide it, or plain.
  // I will Prepend it to content for full security.
  message: z.string().min(1, "Message is required"),
});

export function ComposeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, privateKey } = useAuth(); // privateKey is the DECRYPTED one
  const router = useRouter();

  const form = useForm<z.infer<typeof composeSchema>>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      recipient: "",
      subject: "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof composeSchema>) {
    setLoading(true);
    try {
      if (!user || !privateKey) {
        throw new Error("You must be logged in to send emails");
      }

      // 1. Lookup Recipient to get Public Key
      const lookupRes = await fetch(`/api/users/lookup?username=${values.recipient}`);
      const lookupData = await lookupRes.json();
      
      if (!lookupRes.ok || !lookupData.user) {
        throw new Error("Recipient not found");
      }

      const recipientPublicKey = lookupData.user.publicKey;

      // 2. Prepare Content (Prepend Subject)
      const fullContent = `Subject: ${values.subject || "(No Subject)"}\n\n${values.message}`;

      // 3. Generate AES Key (Symmetric)
      const aesKey = generateAesKey();

      // 4. Encrypt Content with AES
      // Returns { encryptedContent, iv, authTag }
      const encryptedPkg = encryptContent(fullContent, aesKey);
      
      // We need to store AuthTag. My Schema has: encryptedContent, iv, ...
      // I should have added authTag to Schema or combined it.
      // In `lib/crypto` I said: "Format: saltHex:iv:authTag:encryptedContent" for Private Key.
      // For Email, I should probably combine them similarly in `encryptedContent` field 
      // OR update schema.
      // Let's combine: IV is stored separately in DB? Yes `iv` column.
      // But `authTag` is missing?
      // I will APPEND authTag to the `encryptedContent` string for storage as "ContentBase64:TagBase64"
      // Or just assume `encryptedContent` = `Ciphertext`.
      // WITHOUT AUTHTAG, GCM DECRYPTION FAILS.
      
      // DECISION: Store `encryptedContent` as "Base64(Cipher)::(Base64(Tag))" 
      // OR better, update `encryptContent` return type usage.
      
      const storedContent = `${encryptedPkg.encryptedContent}:${encryptedPkg.authTag}`;

      // 5. Encrypt AES Key with Recipient's Public Key (Confidentiality)
      const encryptedAesKey = encryptAesKey(aesKey, recipientPublicKey);

      // 6. Generate Hash & Sign (Integrity & Authenticity)
      // Hash is of the ORIGINAL PLAIN TEXT
      const { signature, hash } = generateSignatureAndHash(fullContent, privateKey);

      // 7. Send payload
      const payload = {
        senderId: user.id,
        recipientId: lookupData.user.id,
        encryptedContent: storedContent, // Passing Tag combined
        encryptedAesKey: encryptedAesKey,
        iv: encryptedPkg.iv,
        signature: signature,
        messageHash: hash,
      };

      const sendRes = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!sendRes.ok) throw new Error("Failed to send email");

      toast.success("Secure email sent!");
      setOpen(false);
      form.reset();
      router.refresh(); // Refresh inbox

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Send className="w-4 h-4" /> Compose</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Secure Message</DialogTitle>
          <DialogDescription>
            End-to-end encrypted. Only the recipient can read this.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FieldGroup>
             <Controller
              control={form.control}
              name="recipient"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>To (Username)</FieldLabel>
                  <Input placeholder="bob" {...field} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
             <Controller
              control={form.control}
              name="subject"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Subject</FieldLabel>
                  <Input placeholder="Secret Plans" {...field} />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="message"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Message</FieldLabel>
                  <Textarea 
                    placeholder="Type your secure message..." 
                    className="min-h-[150px]" 
                    {...field} 
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
             <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Encrypting & Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

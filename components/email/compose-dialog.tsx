"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, Paperclip, Minimize2, X } from "lucide-react";
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
  DialogClose
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

const composeSchema = z.object({
  recipient: z.string().email("Invalid email").refine(e => e.endsWith("@crypto.agu"), "Must conform to @crypto.agu"),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

export function ComposeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, privateKey } = useAuth();
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
      const lookupRes = await fetch(`/api/users/lookup?email=${values.recipient}`);
      const lookupData = await lookupRes.json();
      
      if (!lookupRes.ok || !lookupData.user) {
        throw new Error("Recipient not found (" + values.recipient + ")");
      }

      const recipientPublicKey = lookupData.user.publicKey;

      // 2. Prepare Content
      const fullContent = `Subject: ${values.subject || "(No Subject)"}\n\n${values.message}`;

      // 3. Generate AES Key
      const aesKey = generateAesKey();

      // 4. Encrypt Content (AES)
      const encryptedPkg = encryptContent(fullContent, aesKey);
      const storedContent = `${encryptedPkg.encryptedContent}:${encryptedPkg.authTag}`;

      // 5. Encrypt AES Key (RSA)
      const encryptedAesKey = encryptAesKey(aesKey, recipientPublicKey);

      // 6. Sign Hash
      const { signature, hash } = generateSignatureAndHash(fullContent, privateKey);

      // 7. Send
      const payload = {
        senderId: user.id,
        recipientId: lookupData.user.id,
        encryptedContent: storedContent,
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
      router.refresh(); // Refresh page to maybe show in 'Sent' if we were there

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 shadow-sm font-semibold h-11" size="lg">
            <Send className="w-4 h-4" /> New Message
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 bg-muted/40 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex flex-col gap-1">
             <DialogTitle>New Message</DialogTitle>
             <DialogDescription>End-to-End Encrypted Communication</DialogDescription>
          </div>
          {/* Custom Close? Default does exist */}
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            <div className="px-6 py-4 space-y-4">
                 {/* From Field (Readonly) */}
                <div className="flex items-center gap-4 text-sm">
                    <span className="w-12 text-muted-foreground font-medium">From:</span>
                    <span className="flex-1 text-foreground">{user?.email}</span>
                </div>
                <Separator />

                <FieldGroup className="gap-4">
                    <Controller
                    control={form.control}
                    name="recipient"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} orientation="horizontal" className="items-center">
                        <FieldLabel className="w-12 font-medium">To:</FieldLabel>
                        <Input 
                            placeholder="Recipient Email" 
                            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1 placeholder:text-muted-foreground/50"
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                        />
                        {/* Error displayed as toast or below? FieldError handles it if we keep structure */}
                        </Field>
                    )}
                    />
                    <Separator />
                    <Controller
                    control={form.control}
                    name="subject"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} orientation="horizontal" className="items-center">
                        <FieldLabel className="w-12 font-medium">Subject:</FieldLabel>
                        <Input 
                            placeholder="Subject" 
                            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1 font-medium placeholder:text-muted-foreground/50"
                            {...field} 
                        />
                        </Field>
                    )}
                    />
                </FieldGroup>
                <Separator />
                
                <Controller
                control={form.control}
                name="message"
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                    <Textarea 
                        placeholder="Write something secure..." 
                        className="min-h-[250px] border-0 focus-visible:ring-0 resize-none p-0 shadow-none text-base" 
                        {...field} 
                    />
                    </Field>
                )}
                />
            </div>
            
            <DialogFooter className="px-6 py-4 border-t bg-muted/40 sm:justify-between items-center">
                 <div className="flex gap-2">
                     <Button variant="ghost" size="icon" type="button" title="Attach (Not Implemented)">
                        <Paperclip className="w-4 h-4 text-muted-foreground" />
                     </Button>
                 </div>
                 <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Discard</Button>
                    <Button type="submit" disabled={loading} className="px-8">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Send"}
                    </Button>
                 </div>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

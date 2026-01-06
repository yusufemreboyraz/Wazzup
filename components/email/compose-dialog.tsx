"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Paperclip, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useCompose } from "@/context/compose-context";
import { 
  generateAesKey, 
  encryptContent, 
  encryptAesKey, 
  generateSignatureAndHash,
  encryptBinaryContent
} from "@/lib/crypto";
import { emailsApi, usersApi } from "@/lib/api";
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
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
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
  const { open, setOpen, composeOptions } = useCompose();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
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

  // Sync context options to form
  useEffect(() => {
    if (open) {
      form.reset({
        recipient: composeOptions.recipient || "",
        subject: composeOptions.subject || "",
        message: composeOptions.message || ""
      });
    } else {
      setFiles([]);
    }
  }, [open, composeOptions, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  async function onSubmit(values: z.infer<typeof composeSchema>) {
    setLoading(true);
    try {
      if (!user || !privateKey) {
        throw new Error("You must be logged in to send emails");
      }

      // 1. Lookup Recipient
      const lookupData = await usersApi.lookupByEmail(values.recipient);
      
      if (!lookupData.user) {
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

      // 4.5 Encrypt Attachments
      const processedAttachments = [];
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        let binaryString = "";
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binaryString += String.fromCharCode(bytes[i]);
        }
        
        const encAtt = encryptBinaryContent(binaryString, aesKey);
        processedAttachments.push({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          encryptedContent: `${encAtt.encryptedContent}:${encAtt.authTag}`,
          iv: encAtt.iv
        });
      }

      // 5. Encrypt AES Key (RSA)
      const encryptedAesKey = encryptAesKey(aesKey, recipientPublicKey);

      // 6. Sign Hash
      const { signature, hash } = generateSignatureAndHash(fullContent, privateKey);

      // 7. Send using API client
      await emailsApi.sendEmail({
        senderId: user.id,
        recipientId: lookupData.user.id,
        encryptedContent: storedContent,
        encryptedAesKey: encryptedAesKey,
        iv: encryptedPkg.iv,
        signature: signature,
        messageHash: hash,
        attachments: processedAttachments
      });

      toast.success("Secure email sent!");
      setOpen(false);
      form.reset();
      setFiles([]);
      router.refresh(); 

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 py-4 bg-muted/40 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex flex-col gap-1">
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>End-to-End Encrypted Communication</DialogDescription>
          </div>
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
                      placeholder="Recipient Email (e.g. bob@crypto.agu)" 
                      className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto py-1 placeholder:text-muted-foreground/50"
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
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
                    className="min-h-[200px] border-0 focus-visible:ring-0 resize-none p-0 shadow-none text-base" 
                    {...field} 
                  />
                </Field>
              )}
            />

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-xs">
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="hover:text-destructive"><X className="w-3 h-3"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="px-6 py-4 border-t bg-muted/40 sm:justify-between items-center">
            <div className="flex gap-2">
              <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <input type="file" className="hidden" onChange={handleFileChange} multiple />
              </label>
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

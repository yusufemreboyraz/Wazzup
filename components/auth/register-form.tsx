"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { generateKeyPair, encryptPrivateKey } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  emailUser: z.string().min(1, "Username is required").regex(/^[a-z0-9.]+$/, "Only lowercase letters, numbers, and dots allowed"), 
  // We validate 'emailUser' part only (lowercase enforced in UI but validated here too)
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      emailUser: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const fullEmail = `${values.emailUser}@crypto.agu`;

      // 1. Generate RSA Key Pair
      const keyPair = await generateKeyPair();
      
      // 2. Encrypt Private Key
      const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, values.password);

      // 3. Send to Server
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: fullEmail,
          password: values.password,
          publicKey: keyPair.publicKey,
          encryptedPrivateKey: encryptedPrivateKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // 4. Auto-login
      login({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey: encryptedPrivateKey
      }, keyPair.privateKey);
      
      toast.success("Account created successfully. Keys generated.");
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to generate your Secure Identity.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
             <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Full Name</FieldLabel>
                  <Input 
                    placeholder="Alice Doe" 
                    {...field} 
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="emailUser"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Email Username</FieldLabel>
                  <div className="flex items-center">
                    <Input 
                      placeholder="alice" 
                      {...field}
                      className="rounded-r-none" 
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
                    <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm text-muted-foreground whitespace-nowrap h-9 flex items-center">
                        @crypto.agu
                    </div>
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Password</FieldLabel>
                  <Input 
                    type="password" 
                    {...field}
                    aria-invalid={fieldState.invalid} 
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Generating Keys..." : "Register"}
            </Button>
          </FieldGroup>
          
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

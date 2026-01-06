"use client";

import { useAuth } from "@/context/auth-context";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Hexagon, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-background relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />

        <div className="z-10 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="p-4 rounded-full bg-primary/10 mb-2">
                <Hexagon className="w-12 h-12 text-primary fill-primary/20" />
             </div>
            <h1 className="text-3xl font-bold tracking-tight text-center">
                Welcome back, <span className="text-primary">{user.name}</span>
            </h1>
            <p className="text-muted-foreground font-mono text-sm">{user.email}</p>
            <Button size="lg" className="mt-4 px-8 shadow-sm" onClick={() => window.location.href = '/inbox'}>
                Open Inbox
            </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden bg-background">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
      
      <div className="z-10 w-full max-w-sm space-y-8">
        
        {/* Hero Header */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex justify-center mb-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-green-500 blur-xl opacity-30 rounded-full animate-pulse"></div>
                    <Hexagon className="w-12 h-12 text-green-500 fill-current relative z-10" />
                </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Wazzup
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
                Secure mail with end-to-end encryption.
            </p>
        </div>

        {/* Login Form - No Card Wrapper */}
        <div className="animate-in fade-in zoom-in-95 duration-500 delay-100">
             <LoginForm />
        </div>
        
        <div className="text-center text-[10px] text-muted-foreground opacity-40 uppercase tracking-widest font-mono">
            4096-bit RSA & AES-256
        </div>

      </div>
    </main>
  );
}
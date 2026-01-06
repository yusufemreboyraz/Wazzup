"use client";

import { useAuth } from "@/context/auth-context";
import { RegisterForm } from "@/components/auth/register-form";
import { LoginForm } from "@/components/auth/login-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // In a real app we'd redirect to /inbox if logged in, 
  // but for this demo page we might just show status.
  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Welcome, {user.name} ({user.email})</h1>
        <Button onClick={() => window.location.href = '/inbox'}>Go to Inbox</Button>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        {/* Header or something */}
      </div>

      <div className="relative flex place-items-center">
        {/* We can route via Next.js pages /login or /register, 
            but for simplicity let's just toggle or link here */}
            
        {/* Ideally use Next.js routing, but valid to render components directly too */}
      </div>
      
      {/* Since we have separate pages for /login and /register likely, 
          let's just provide links or show one default */}
      <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-8">
        Wazzup Secure Mail
      </h1>
      
      <div className="flex gap-4">
        {/* This page.tsx is techincally the root route. 
            Maybe we just redirect to /login? 
            Or show links. */}
         <LoginForm />
      </div>
    </main>
  );
}
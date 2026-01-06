import { LoginForm } from "@/components/auth/login-form";
import { redirect } from 'next/navigation';

export default function LoginPage() {
  // Since we moved the main login experience to the landing page,
  // we can either redirect OR show the same component.
  // Redirecting to root is cleaner if root IS the login page.
  redirect('/');
}

"use client";

import { useEffect, useState } from "react";
import { MailDisplay } from "@/components/email/mail-display";
import { useAuth } from "@/context/auth-context";

export default function SentPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetch(`/api/emails?userId=${user.id}&type=sent`)
      .then((res) => res.json())
      .then((data) => {
        if (data.emails) setEmails(data.emails);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return <div className="p-8">Please login.</div>;

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-0 md:flex">
      <MailDisplay emails={emails} type="sent" loading={loading} />
    </div>
  );
}

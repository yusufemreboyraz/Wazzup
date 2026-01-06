"use client";

import { useEffect, useState } from "react";
import { MailDisplay } from "@/components/email/mail-display";
import { useAuth } from "@/context/auth-context";

export default function ArchivePage() {
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch archived emails (isArchived=true)
    fetch(`/api/emails?userId=${user.id}&type=inbox&isArchived=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.emails) setEmails(data.emails);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return <MailDisplay emails={emails} type="archive" loading={loading} />;
}

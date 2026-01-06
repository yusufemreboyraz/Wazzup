"use client";

import { useEffect, useState, useCallback } from "react";
import { MailDisplay } from "@/components/email/mail-display";
import { useAuth } from "@/context/auth-context";
import { emailsApi, PaginationInfo } from "@/lib/api";

export default function SentPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const { user } = useAuth();

  const fetchEmails = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user) return;

    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const data = await emailsApi.getEmails({
        userId: user.id,
        type: 'sent',
        page,
        pageSize: 20,
      });

      if (append) {
        setEmails(prev => [...prev, ...data.emails]);
      } else {
        setEmails(data.emails);
      }
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to fetch sent emails:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEmails(1);
  }, [fetchEmails]);

  const loadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchEmails(pagination.page + 1, true);
    }
  };

  if (!user) return <div className="p-8">Please login.</div>;

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-0 md:flex">
      <MailDisplay 
        emails={emails} 
        type="sent" 
        loading={loading}
        pagination={pagination}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { MailDisplay } from "@/components/email/mail-display";
import { useAuth } from "@/context/auth-context";
import { emailsApi, PaginationInfo } from "@/lib/api";

export default function ArchivePage() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

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
        type: 'inbox',
        isArchived: true,
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
      console.error("Failed to fetch archived emails:", err);
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

  if (!user) return null;

  return (
    <MailDisplay 
      emails={emails} 
      type="archive" 
      loading={loading}
      pagination={pagination}
      onLoadMore={loadMore}
      loadingMore={loadingMore}
    />
  );
}

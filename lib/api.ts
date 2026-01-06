/**
 * API Client with Authentication
 * 
 * All API calls should use these helpers to ensure
 * proper authentication headers are included.
 */

// Get auth data from sessionStorage
function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  
  const userStr = sessionStorage.getItem("wazzup_user");
  const sessionToken = sessionStorage.getItem("wazzup_st");
  
  if (!userStr || !sessionToken) return {};
  
  try {
    const user = JSON.parse(userStr);
    return {
      "x-user-id": user.id,
      "x-session-token": sessionToken,
    };
  } catch {
    return {};
  }
}

// Generic fetch with auth
export async function fetchWithAuth(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });
}

// Email API types
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export interface EmailsResponse {
  emails: any[];
  pagination: PaginationInfo;
}

// Email API helpers
export const emailsApi = {
  async getEmails(params: {
    userId: string;
    type?: 'inbox' | 'sent';
    isArchived?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<EmailsResponse> {
    const searchParams = new URLSearchParams({
      userId: params.userId,
      type: params.type || 'inbox',
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
    });
    
    if (typeof params.isArchived === 'boolean') {
      searchParams.set('isArchived', String(params.isArchived));
    }
    
    const res = await fetchWithAuth(`/api/emails?${searchParams}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch emails');
    }
    return res.json();
  },

  async sendEmail(payload: {
    senderId: string;
    recipientId: string;
    encryptedContent: string;
    encryptedAesKey: string;
    iv: string;
    signature: string;
    messageHash: string;
    attachments?: any[];
  }): Promise<any> {
    const res = await fetchWithAuth('/api/emails', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send email');
    }
    return res.json();
  },

  async deleteEmail(emailId: string): Promise<void> {
    const res = await fetchWithAuth(`/api/emails?id=${emailId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete email');
    }
  },

  async updateEmail(params: {
    emailId: string;
    read?: boolean;
    isStarred?: boolean;
    isArchived?: boolean;
  }): Promise<any> {
    const res = await fetchWithAuth('/api/emails', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update email');
    }
    return res.json();
  },
};

// User lookup (no auth required for public key lookup)
export const usersApi = {
  async lookupByEmail(email: string): Promise<any> {
    const res = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'User not found');
    }
    return res.json();
  },
};


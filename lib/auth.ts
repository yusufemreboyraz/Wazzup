import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * API Authentication Utility
 * 
 * Simple session-based auth for API routes.
 * In a production app, you'd use JWT or a proper session library.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Extract user ID from request headers or body
 * In production, you'd validate a JWT token or session cookie
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  try {
    // Get user ID from header (set by frontend)
    const userId = req.headers.get("x-user-id");
    const sessionToken = req.headers.get("x-session-token");

    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    if (!sessionToken) {
      return { success: false, error: "Session token required" };
    }

    // Validate user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Auth error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

/**
 * Helper to create unauthorized response
 */
export function unauthorizedResponse(message: string = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Helper to create forbidden response
 */
export function forbiddenResponse(message: string = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * In production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Rate limit response
 */
export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." }, 
    { status: 429 }
  );
}


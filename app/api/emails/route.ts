import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { 
  authenticateRequest, 
  unauthorizedResponse, 
  forbiddenResponse,
  checkRateLimit,
  rateLimitResponse 
} from "@/lib/auth";

// Default pagination values
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`post-email-${clientIP}`, 30, 60000)) {
      return rateLimitResponse();
    }

    // Authentication
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.user) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json();
    const {
      senderId,
      recipientId,
      encryptedContent,
      encryptedAesKey,
      iv,
      signature,
      messageHash,
      attachments
    } = body;

    // Validate required fields
    if (!senderId || !recipientId || !encryptedContent || !encryptedAesKey || !iv || !signature || !messageHash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security: Verify sender is the authenticated user
    if (senderId !== auth.user.id) {
      return forbiddenResponse("You can only send emails as yourself");
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true }
    });

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const email = await prisma.email.create({
      data: {
        senderId,
        recipientId,
        encryptedContent,
        encryptedAesKey,
        iv,
        signature,
        messageHash,
        attachments: {
          create: attachments?.map((att: any) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            encryptedContent: att.encryptedContent,
            iv: att.iv
          })) || []
        }
      },
      include: {
        attachments: true
      }
    });

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Send email error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`get-emails-${clientIP}`, 100, 60000)) {
      return rateLimitResponse();
    }

    // Authentication
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.user) {
      return unauthorizedResponse(auth.error);
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "inbox";
    const isArchived = searchParams.get("isArchived");
    
    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(
      MAX_PAGE_SIZE, 
      Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE)))
    );
    const skip = (page - 1) * pageSize;

    if (!userId) {
      return NextResponse.json({ error: "UserId required" }, { status: 400 });
    }

    // Security: User can only fetch their own emails
    if (userId !== auth.user.id) {
      return forbiddenResponse("You can only access your own emails");
    }

    // Build where clause
    let whereClause: any = {};
    if (type === "sent") {
      whereClause = { senderId: userId };
    } else {
      whereClause = { recipientId: userId };
      if (isArchived === 'true') {
        whereClause.isArchived = true;
      } else if (isArchived === 'false' || !isArchived) {
        whereClause.isArchived = false;
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.email.count({ where: whereClause });

    // Fetch emails with pagination
    const emails = await prisma.email.findMany({
      where: whereClause,
      include: {
        sender: { select: { name: true, email: true, publicKey: true } },
        recipient: { select: { name: true, email: true } },
        attachments: true,
      },
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize,
    });

    return NextResponse.json({ 
      emails,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: skip + emails.length < totalCount
      }
    });
  } catch (error) {
    console.error("Fetch emails error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`delete-email-${clientIP}`, 50, 60000)) {
      return rateLimitResponse();
    }

    // Authentication
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.user) {
      return unauthorizedResponse(auth.error);
    }

    const { searchParams } = new URL(req.url);
    const emailId = searchParams.get("id");

    if (!emailId) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    // Verify ownership before delete
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      select: { senderId: true, recipientId: true }
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Only sender or recipient can delete
    if (email.senderId !== auth.user.id && email.recipientId !== auth.user.id) {
      return forbiddenResponse("You can only delete your own emails");
    }

    await prisma.email.delete({
      where: { id: emailId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// PATCH for updating email status (read, starred, archived)
export async function PATCH(req: NextRequest) {
  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(`patch-email-${clientIP}`, 100, 60000)) {
      return rateLimitResponse();
    }

    // Authentication
    const auth = await authenticateRequest(req);
    if (!auth.success || !auth.user) {
      return unauthorizedResponse(auth.error);
    }

    const body = await req.json();
    const { emailId, read, isStarred, isArchived } = body;

    if (!emailId) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    // Verify ownership
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      select: { senderId: true, recipientId: true }
    });

    if (!email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    // Only sender or recipient can update
    if (email.senderId !== auth.user.id && email.recipientId !== auth.user.id) {
      return forbiddenResponse("You can only update your own emails");
    }

    // Build update data
    const updateData: any = {};
    if (typeof read === 'boolean') updateData.read = read;
    if (typeof isStarred === 'boolean') updateData.isStarred = isStarred;
    if (typeof isArchived === 'boolean') updateData.isArchived = isArchived;

    const updated = await prisma.email.update({
      where: { id: emailId },
      data: updateData,
    });

    return NextResponse.json({ success: true, email: updated });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

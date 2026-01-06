import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            senderId,
            recipientId,
            encryptedContent,
            encryptedAesKey,
            iv,
            signature,
            messageHash,
            attachments // Array of { filename, contentType, size, encryptedContent, iv }
        } = body;

        if (!senderId || !recipientId || !encryptedContent || !encryptedAesKey || !iv || !signature || !messageHash) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "inbox"; // 'inbox' or 'sent'
    const isArchived = searchParams.get("isArchived"); // 'true' or 'false'

    if (!userId) {
        return NextResponse.json({ error: "UserId required" }, { status: 400 });
    }

    try {
        let whereClause: any = {};
        if (type === "sent") {
            whereClause = { senderId: userId };
        } else {
            whereClause = { recipientId: userId };
            // For inbox, we default to showing non-archived unless specified
            if (isArchived === 'true') {
                whereClause.isArchived = true;
            } else if (isArchived === 'false' || !isArchived) {
                // Default to false for inbox if not specified, 
                // BUT wait, maybe we want to see all? 
                // Requirement: "Archive Filtering" -> implies hiding.
                // Let's enforce: if type=inbox and isArchived not passed, exclude archived?
                // Usually standard behavior.
                whereClause.isArchived = false;
            }
        }

        const emails = await prisma.email.findMany({
            where: whereClause,
            include: {
                sender: { select: { name: true, email: true, publicKey: true } },
                recipient: { select: { name: true, email: true } },
                attachments: true,
            },
            orderBy: { timestamp: "desc" },
        });

        return NextResponse.json({ emails });
    } catch (error) {
        console.error("Fetch emails error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const emailId = searchParams.get("id");

    if (!emailId) {
        return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    try {
        await prisma.email.delete({
            where: { id: emailId },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}

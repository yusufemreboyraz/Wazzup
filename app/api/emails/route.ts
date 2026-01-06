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
            messageHash
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
            },
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

    if (!userId) {
        return NextResponse.json({ error: "UserId required" }, { status: 400 });
    }

    try {
        let whereClause = {};
        if (type === "sent") {
            whereClause = { senderId: userId };
        } else {
            whereClause = { recipientId: userId };
        }

        const emails = await prisma.email.findMany({
            where: whereClause,
            include: {
                sender: { select: { name: true, email: true, publicKey: true } },
                recipient: { select: { name: true, email: true } },
            },
            orderBy: { timestamp: "desc" },
        });

        return NextResponse.json({ emails });
    } catch (error) {
        console.error("Fetch emails error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

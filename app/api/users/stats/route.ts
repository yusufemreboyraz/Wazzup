import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "UserId required" }, { status: 400 });
    }

    try {
        const inboxCount = await prisma.email.count({
            where: {
                recipientId: userId,
                read: false,
                isArchived: false, // Don't count archived emails? Usually yes.
            },
        });

        // Sent count? Usually not needed for unread.

        return NextResponse.json({
            inboxCount
        });
    } catch (error) {
        console.error("Fetch stats error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

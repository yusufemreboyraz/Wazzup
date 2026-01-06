import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
    try {
        const { emailId, status } = await req.json();
        // status can be { read: boolean } or { isStarred: boolean } or { isArchived: boolean }

        if (!emailId || !status) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const updatedEmail = await prisma.email.update({
            where: { id: emailId },
            data: status,
        });

        return NextResponse.json({ success: true, email: updatedEmail });
    } catch (error) {
        console.error("Update email status error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password, publicKey, encryptedPrivateKey } = body;

        if (!username || !password || !publicKey || !encryptedPrivateKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Username already exists" }, { status: 409 });
        }

        // Hash password for authentication
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                username,
                passwordHash,
                publicKey,
                encryptedPrivateKey,
            },
        });

        // Return success (excluding sensitive fields)
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

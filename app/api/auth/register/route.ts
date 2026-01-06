import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password, publicKey, encryptedPrivateKey } = body;

        if (!name || !email || !password || !publicKey || !encryptedPrivateKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate Email Domain
        if (!email.endsWith("@crypto.agu")) {
            return NextResponse.json({ error: "Email must end with @crypto.agu" }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }

        // Hash password for authentication
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
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
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

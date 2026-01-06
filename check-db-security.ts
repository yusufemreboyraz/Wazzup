import { prisma } from "@/lib/db";

async function main() {
    console.log("\n🔍 DATABASE SECURITY AUDIT 🔍\n");

    // 1. Check Users
    const users = await prisma.user.findMany();
    console.log(`--- FOUND ${users.length} USERS ---`);
    users.forEach(u => {
        console.log(`User: ${u.name} (${u.email})`);
        console.log(`   🔑 Password:      ${u.passwordHash.substring(0, 15)}... [BCRYPT HASHED]`);
        console.log(`   🔒 Private Key:   ${u.encryptedPrivateKey.substring(0, 15)}... [AES ENCRYPTED]`);
        console.log(`   🔓 Public Key:    ${u.publicKey.substring(27, 42)}... [PLAINTEXT (Safe)]`);
        console.log("-".repeat(40));
    });

    // 2. Check Emails
    const emails = await prisma.email.findMany();
    console.log(`\n--- FOUND ${emails.length} EMAILS ---`);
    emails.forEach(e => {
        console.log(`Email ID: ${e.id}`);
        console.log(`   📝 Content:       ${e.encryptedContent.substring(0, 20)}... [AES-GCM CIPHERTEXT]`);
        console.log(`   🗝️  AES Key:       ${e.encryptedAesKey.substring(0, 15)}... [RSA-OAEP ENCRYPTED]`);
        console.log(`   ✍️  Signature:     ${e.signature.substring(0, 15)}... [RSA-PSS SIGNATURE]`);
        console.log("-".repeat(40));
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

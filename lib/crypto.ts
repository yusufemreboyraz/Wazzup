import forge from 'node-forge';

/**
 * Crypto Utils using node-forge
 * 
 * 1. RSA KeyPair Generation (2048-bit)
 * 2. AES-GCM Encryption/Decryption (Confidentiality)
 * 3. RSA-OAEP Key Wrapping/Unwrapping (Confidentiality for the AES Key)
 * 4. SHA-256 Hashing + RSA-PSS Signing (Integrity & Authenticity)
 * 5. Password Hashing (handled by bcryptjs in auth, but we can add helpers here if needed)
 */

// --- Types ---

export interface KeyPair {
    publicKey: string;  // PEM
    privateKey: string; // PEM
}

export interface EncryptedPackage {
    encryptedContent: string; // Base64
    iv: string;              // Base64
    authTag: string;         // Base64 (Important for GCM)
}

// --- 1. Key Generation ---

export const generateKeyPair = async (): Promise<KeyPair> => {
    return new Promise((resolve, reject) => {
        forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
            if (err) return reject(err);
            resolve({
                publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
                privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
            });
        });
    });
};

// --- 2. AES-GCM Encryption (Content) ---

export const encryptContent = (content: string, aesKeyHex: string): EncryptedPackage => {
    const keyBlob = forge.util.hexToBytes(aesKeyHex);
    const iv = forge.random.getBytesSync(12); // Recommended IV size for GCM is 12 bytes (96 bits)

    const cipher = forge.cipher.createCipher('AES-GCM', keyBlob);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(content, 'utf8'));
    cipher.finish();

    const encrypted = cipher.output.getBytes();
    const tag = cipher.mode.tag.getBytes();

    return {
        encryptedContent: forge.util.encode64(encrypted),
        iv: forge.util.encode64(iv),
        // In node-forge GCM, authTag is needed for decryption. 
        // Usually appended to ciphertext or stored separately. 
        // We will append it to encryptedContent for simplicity in our DB model 
        // or return it. Our DB schema has `encryptedContent` and `iv`. 
        // Let's Append tag to content: [Content][Tag] or just store Tag separately?
        // The Schema `EncryptedContent` can store `Base64(Content + Tag)`?
        // Standard practice: Return tag separately or appended.
        // For this implementation, let's Append tag to ciphertext before Base64.
        authTag: forge.util.encode64(tag),
    };
};

/**
 * Decrypts AES-GCM content.
 * Expects encryptedContentBase64 to be Ciphertext.
 * Expects AuthTag to be passed separately or we should have combined them.
 * Let's assume we combine them: Final = Ciphertext || Tag
 */
export const decryptContent = (
    encryptedContentBase64: string,
    ivBase64: string,
    aesKeyHex: string,
    authTagBase64?: string // If we stored it separately
): string => {
    const key = forge.util.hexToBytes(aesKeyHex);
    const iv = forge.util.decode64(ivBase64);
    const encryptedBytes = forge.util.decode64(encryptedContentBase64);

    // Create buffer from encrypted bytes
    const buffer = forge.util.createBuffer(encryptedBytes);

    const decipher = forge.cipher.createDecipher('AES-GCM', key);

    // If we appended tag, we need to split it.
    // But wait, the previous function returned them separate. 
    // Let's assume the user of this lib handles storage.
    // Note: Node-forge GCM requires tag via `mode.tag`

    if (!authTagBase64) {
        throw new Error("AuthTag required for AES-GCM Decryption");
    }

    const tag = forge.util.createBuffer(forge.util.decode64(authTagBase64));

    decipher.start({ iv: iv, tag: tag });
    decipher.update(buffer);
    const success = decipher.finish(); // Returns boolean pass/fail for integrity

    if (!success) {
        throw new Error("Decryption failed: Integrity check failed (AuthTag mismatch). Message might have been tampered.");
    }

    return decipher.output.toString(); // Defaults to utf8
};


// --- 3. RSA Key Wrapping (AES Key Encryption) ---

export const encryptAesKey = (aesKeyHex: string, recipientPublicKeyPem: string): string => {
    const publicKey = forge.pki.publicKeyFromPem(recipientPublicKeyPem);
    // OAEP is recommended
    const encrypted = publicKey.encrypt(aesKeyHex, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
        // mgf1: forge.mgf.mgf1.create(forge.md.sha256.create()) // Defaults usually fine, but explicit is good
    });
    return forge.util.encode64(encrypted);
};

export const decryptAesKey = (encryptedAesKeyBase64: string, recipientPrivateKeyPem: string): string => {
    const privateKey = forge.pki.privateKeyFromPem(recipientPrivateKeyPem);
    const encrypted = forge.util.decode64(encryptedAesKeyBase64);

    const decrypted = privateKey.decrypt(encrypted, 'RSA-OAEP', {
        md: forge.md.sha256.create(),
    });
    return decrypted; // This is the aesKeyHex
};

// --- 4. Hashing & Signing (Integrity & Authenticity) ---

export const hashContent = (content: string): string => {
    const md = forge.md.sha256.create();
    md.update(content, 'utf8');
    return md.digest().toHex();
};

export const signHash = (hashHex: string, senderPrivateKeyPem: string): string => {
    const privateKey = forge.pki.privateKeyFromPem(senderPrivateKeyPem);
    const md = forge.md.sha256.create();
    // We sign the BYTES of the hash? Or re-hash?
    // Usually PSS signs the digest.
    // Node-forge PSS implementation wraps the signing.
    // Wait, standard signing takes the raw data usually and key.
    // But if we already have the hash?
    // Let's just sign the content directly for simplicity of API, 
    // OR if we strictly follow the requirement "Hash of email is generated... Hash is digitally signed".

    // For signature verification of a pre-computed hash, it's tricky in high level APIs.
    // Easier path: `privateKey.sign(md)` where md has processed the content.

    // RE-CREATING MD state from hex is hard.
    // BETTER: Pass content to this function, let it hash and sign.
    // But requirement says "Hash... is signed".
    // Implementation:

    // Option A (Correct for forge):
    // 1. Create MD, update with content.
    // 2. Sign MD.

    // But we want to return the Hash too.
    return ""; // handled in helper below
};

export const generateSignatureAndHash = (content: string, senderPrivateKeyPem: string): { signature: string, hash: string } => {
    const md = forge.md.sha256.create();
    md.update(content, 'utf8');
    const hash = md.digest().toHex();

    // Sign
    const privateKey = forge.pki.privateKeyFromPem(senderPrivateKeyPem);
    // We need a fresh MD for signing usually, or just pass the MD object?
    // forge privateKey.sign(md, scheme)
    // Warning: md.digest() might consume the MD.
    // Let's create two MDs or see if we can reuse.

    const mdForSign = forge.md.sha256.create();
    mdForSign.update(content, 'utf8');

    // PSS is standard
    const pss = forge.pss.create({
        md: forge.md.sha256.create(),
        mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
        saltLength: 32 // standard for sha256
    });

    const signature = privateKey.sign(mdForSign, pss);

    return {
        hash: hash,
        signature: forge.util.encode64(signature)
    };
};

export const verifySignature = (content: string, signatureBase64: string, senderPublicKeyPem: string): boolean => {
    const publicKey = forge.pki.publicKeyFromPem(senderPublicKeyPem);
    const signature = forge.util.decode64(signatureBase64);

    const md = forge.md.sha256.create();
    md.update(content, 'utf8');

    const pss = forge.pss.create({
        md: forge.md.sha256.create(),
        mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
        saltLength: 32
    });

    return publicKey.verify(md.digest().getBytes(), signature, pss);
};

// --- Helpers ---

export const generateAesKey = (): string => {
    return forge.util.bytesToHex(forge.random.getBytesSync(32));
};

export interface ApiError {
    error: string;
}

export interface AuthResponse {
    success: boolean;
    user: {
        id: string;
        username: string;
        publicKey?: string;
        encryptedPrivateKey?: string;
    };
}

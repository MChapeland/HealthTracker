const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.appdata",
];

export function getGoogleClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!id) {
    throw new Error(
      "Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in a .env file (see .env.example)."
    );
  }
  return id;
}

export function getGoogleClientSecret(): string | undefined {
  const secret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET?.trim();
  return secret || undefined;
}

export function googleSignInScopes(): string[] {
  return GOOGLE_SCOPES;
}

/** Decode email claim from a Google ID token (no signature verification). */
export function emailFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}

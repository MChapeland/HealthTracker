import {
  refreshToken,
  signIn,
  signOut,
} from "@choochmeque/tauri-plugin-google-auth-api";
import { api } from "./api";
import {
  emailFromIdToken,
  getGoogleClientId,
  getGoogleClientSecret,
  googleSignInScopes,
} from "./googleAuthConfig";
import { isAndroid } from "./platform";

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

function signInOptions() {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const options: Parameters<typeof signIn>[0] = {
    clientId,
    scopes: googleSignInScopes(),
  };
  if (clientSecret && !isAndroid()) {
    options.clientSecret = clientSecret;
  }
  if (isAndroid()) {
    options.flowType = "native";
  }
  return options;
}

export async function googleSignIn(): Promise<string> {
  const response = await signIn(signInOptions());
  const email =
    (response.idToken ? emailFromIdToken(response.idToken) : null) ??
    (await fetchGoogleEmail(response.accessToken));
  if (!email) {
    throw new Error("Could not read your Google account email.");
  }
  if (!response.refreshToken) {
    throw new Error("Google did not return a refresh token. Try signing out of Google in your browser and sign in again.");
  }
  await api.saveGoogleAuth(email, response.refreshToken);
  return email;
}

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function googleRefreshAccessToken(): Promise<GoogleTokens> {
  const stored = await api.getGoogleRefreshToken();
  if (!stored) {
    throw new Error("Not signed in.");
  }
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const options: Parameters<typeof refreshToken>[0] = {
    refreshToken: stored,
    clientId,
  };
  if (clientSecret && !isAndroid()) {
    options.clientSecret = clientSecret;
  }
  const response = await refreshToken(options);
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken ?? stored,
    expiresAt: response.expiresAt ?? null,
  };
}

export async function googleSignOut(): Promise<void> {
  try {
    const tokens = await googleRefreshAccessToken().catch(() => null);
    await signOut(tokens ? { accessToken: tokens.accessToken } : undefined);
  } catch {
    await signOut();
  }
  await api.clearGoogleAuth();
}

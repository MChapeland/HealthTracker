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
import { isTauri } from "./platform";

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
}

/** Same-origin by default; configurable for split dev (Vite + server). */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  ""
);

function signInOptions() {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const options: Parameters<typeof signIn>[0] = {
    clientId,
    scopes: googleSignInScopes(),
  };
  if (clientSecret) {
    options.clientSecret = clientSecret;
  }
  return options;
}

/**
 * Starts Google sign-in.
 * - Desktop (Tauri): native OAuth via the plugin, storing the refresh token.
 * - Web: full-page redirect to the backend, which performs the OAuth code
 *   exchange server-side (client secret + refresh token never reach the browser).
 */
export async function googleSignIn(): Promise<string> {
  if (!isTauri()) {
    window.location.assign(`${API_BASE_URL}/api/auth/google/start`);
    // Navigation unloads the page; this never resolves.
    return new Promise<string>(() => {});
  }

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
  if (!isTauri()) {
    // The browser cannot refresh tokens (no client secret); the server mints a
    // short-lived access token from its stored refresh token.
    const res = await fetch(`${API_BASE_URL}/api/auth/google/access_token`, {
      credentials: "include",
    });
    if (!res.ok) {
      throw new Error("Not signed in.");
    }
    const data = (await res.json()) as {
      accessToken: string;
      expiresAt: number | null;
    };
    return {
      accessToken: data.accessToken,
      refreshToken: null,
      expiresAt: data.expiresAt ?? null,
    };
  }

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
  if (clientSecret) {
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
  if (!isTauri()) {
    await api.clearGoogleAuth();
    return;
  }

  try {
    const tokens = await googleRefreshAccessToken().catch(() => null);
    await signOut(tokens ? { accessToken: tokens.accessToken } : undefined);
  } catch {
    await signOut();
  }
  await api.clearGoogleAuth();
}

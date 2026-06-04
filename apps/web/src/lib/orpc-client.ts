import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import type { downloaderContract } from "@vidbee/downloader-core";

const isServer = typeof window === "undefined";
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const normalizedApiUrl = configuredApiUrl
	? configuredApiUrl.replace(/\/+$/, "")
	: "";
// Server-side (SSR): use the internal container URL directly.
// Client-side (browser): use the page origin so requests go through the
// reverse proxy over HTTPS instead of hitting the container directly.
export const apiUrl = isServer
	? (normalizedApiUrl || "http://localhost:3000")
	: window.location.origin;

// EventSource cannot send Authorization headers; auth token is passed as ?token=.
export const getEventsUrl = (): string => {
	const token = getAuthToken();
	const base = `${apiUrl}/events`;
	return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};
const rpcUrl = `${apiUrl}/rpc`;

const AUTH_TOKEN_KEY = "vidbee-auth-token";

export const getAuthToken = (): string | null => {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string): void => {
	localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = (): void => {
	localStorage.removeItem(AUTH_TOKEN_KEY);
};

const redirectToLogin = (): void => {
	clearAuthToken();
	window.location.replace("/login");
};

// Intercept 401 responses: clear the stale token and redirect to login.
// This handles the case where the API restarted and invalidated in-memory sessions.
const authFetch: typeof fetch = async (input, init) => {
	const response = await fetch(input, init);
	if (response.status === 401 && typeof window !== "undefined") {
		redirectToLogin();
	}
	return response;
};

export const orpcClient: ContractRouterClient<typeof downloaderContract> =
	createORPCClient(
		new RPCLink({
			url: rpcUrl,
			fetch: isServer ? undefined : authFetch,
			headers: () => {
				const token = getAuthToken();
				return token ? { Authorization: `Bearer ${token}` } : {};
			},
		}),
	);

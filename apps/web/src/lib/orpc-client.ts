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

export const eventsUrl = `${apiUrl}/events`;
const rpcUrl = `${apiUrl}/rpc`;

export const orpcClient: ContractRouterClient<typeof downloaderContract> =
	createORPCClient(
		new RPCLink({
			url: rpcUrl,
		}),
	);

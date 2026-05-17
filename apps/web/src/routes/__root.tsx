import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useLayoutEffect, useState } from "react";
import { Toaster } from "sonner";
import { i18n } from "../lib/i18n";
import { clearAuthToken, getAuthToken } from "../lib/orpc-client";
import { applyThemeToDocument, readWebSettings } from "../lib/web-settings";

import appCss from "../styles.css?url";

// useLayoutEffect is a no-op on the server, so use useEffect there to
// suppress the React SSR warning while keeping synchronous behaviour on
// the client where it matters.
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "VidBee Web" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	// Start hidden; revealed synchronously before first paint once auth is
	// confirmed, so the user never sees a flash of the wrong page.
	const [authReady, setAuthReady] = useState(false);

	useIsomorphicLayoutEffect(() => {
		const settings = readWebSettings();
		applyThemeToDocument(settings.theme);
		void i18n.changeLanguage(settings.language);

		// On the login page there is nothing to validate — just show it.
		if (window.location.pathname === "/login") {
			setAuthReady(true);
			return;
		}

		const token = getAuthToken();
		if (!token) {
			window.location.replace("/login");
			return; // Stay hidden while navigating.
		}

		// Validate the stored token against the API before revealing the page.
		// Keeps the page hidden if the token is stale (e.g. after an API restart).
		fetch(`${window.location.origin}/rpc/status`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: "{}",
		})
			.then((res) => {
				if (res.status === 401) {
					clearAuthToken();
					window.location.replace("/login");
				} else {
					setAuthReady(true);
				}
			})
			.catch(() => {
				// Network error — show the app and let it handle errors inline.
				setAuthReady(true);
			});
	}, []);

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body
				className="bg-background text-foreground"
				style={authReady ? undefined : { visibility: "hidden" }}
				suppressHydrationWarning
			>
				{children}
				<Toaster richColors={true} />
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
				/>
				<Scripts />
			</body>
		</html>
	);
}


import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useLayoutEffect, useState } from "react";
import { Toaster } from "sonner";
import { i18n } from "../lib/i18n";
import { getAuthToken } from "../lib/orpc-client";
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

		const token = getAuthToken();
		if (!token && window.location.pathname !== "/login") {
			window.location.replace("/login");
			// Stay hidden while the browser navigates away.
		} else {
			setAuthReady(true);
		}
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


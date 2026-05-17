import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { i18n } from "../lib/i18n";
import { getAuthToken } from "../lib/orpc-client";
import { applyThemeToDocument, readWebSettings } from "../lib/web-settings";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "VidBee Web",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-background text-foreground" suppressHydrationWarning>
				<RootHydrationEffects />
				{children}
				<Toaster richColors={true} />
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}

function RootHydrationEffects() {
	useEffect(() => {
		const settings = readWebSettings();
		applyThemeToDocument(settings.theme);
		void i18n.changeLanguage(settings.language);

		// Auth guard: runs after hydration to cover the SSR gap where
		// beforeLoad is skipped on the server (no localStorage available).
		const token = getAuthToken();
		if (!token && window.location.pathname !== "/login") {
			window.location.replace("/login");
		}
	}, []);

	return null;
}

import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@vidbee/ui/components/ui/button";
import { Input } from "@vidbee/ui/components/ui/input";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { clearAuthToken, getAuthToken, orpcClient, setAuthToken } from "../lib/orpc-client";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		if (typeof window === "undefined") return;
		if (getAuthToken()) throw redirect({ to: "/" });
	},
	component: LoginPage,
});

function LoginPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const result = await orpcClient.auth.login({ username, password });
			setAuthToken(result.token);
			await navigate({ to: "/" });
		} catch {
			clearAuthToken();
			setError(t("auth.invalidCredentials"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="w-full max-w-sm space-y-8 px-4">
				<div className="flex flex-col items-center gap-3">
					<img
						alt="VidBee"
						className="h-16 w-16 rounded-2xl"
						src="/app-icon.png"
					/>
					<div className="text-center">
						<h1 className="font-bold text-2xl">VidBee</h1>
						<p className="mt-1 text-muted-foreground text-sm">
							{t("auth.signInToContinue")}
						</p>
					</div>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<label className="font-medium text-sm" htmlFor="username">
							{t("auth.username")}
						</label>
						<Input
							autoComplete="username"
							autoFocus
							id="username"
							onChange={(e) => setUsername(e.target.value)}
							required
							value={username}
						/>
					</div>

					<div className="space-y-2">
						<label className="font-medium text-sm" htmlFor="password">
							{t("auth.password")}
						</label>
						<Input
							autoComplete="current-password"
							id="password"
							onChange={(e) => setPassword(e.target.value)}
							required
							type="password"
							value={password}
						/>
					</div>

					{error ? (
						<p className="text-destructive text-sm">{error}</p>
					) : null}

					<Button className="w-full" disabled={loading} type="submit">
						{loading ? t("auth.signingIn") : t("auth.signIn")}
					</Button>
				</form>
			</div>
		</div>
	);
}

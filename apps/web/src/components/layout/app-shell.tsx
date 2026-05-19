import { useNavigate } from "@tanstack/react-router";
import {
	AppSidebar,
	type AppSidebarIcon,
	type AppSidebarItem,
} from "@vidbee/ui/components/ui/app-sidebar";
import { appSidebarIcons } from "@vidbee/ui/components/ui/app-sidebar-icons";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { clearAuthToken } from "../../lib/orpc-client";

type AppPage = "about" | "download" | "settings";

interface AppShellProps {
	children: ReactNode;
	page: AppPage;
}

const LogOutIconComponent = ({ className }: { className?: string }) => (
	<LogOut className={className} />
);

const logoutIcon: AppSidebarIcon = {
	active: LogOutIconComponent,
	inactive: LogOutIconComponent,
};

export const AppShell = ({ children, page }: AppShellProps) => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const openSupportedSites = () => {
		window.open(
			"https://vidbee.org/supported-sites/",
			"_blank",
			"noopener,noreferrer",
		);
	};

	const handleLogout = () => {
		clearAuthToken();
		window.location.href = "/login";
	};

	const items: AppSidebarItem[] = [
		{
			id: "home",
			active: page === "download",
			icon: appSidebarIcons.home,
			label: t("menu.download"),
			onClick: () => {
				void navigate({ to: "/" });
			},
		},
		{
			id: "subscriptions",
			disabled: true,
			icon: appSidebarIcons.subscriptions,
			label: t("menu.rss"),
		},
		{
			id: "supported-sites",
			icon: appSidebarIcons.supportedSites,
			label: t("menu.supportedSites"),
			onClick: openSupportedSites,
		},
	];

	const bottomItems: AppSidebarItem[] = [
		{
			id: "settings",
			active: page === "settings",
			icon: appSidebarIcons.settings,
			label: t("menu.preferences"),
			showLabel: false,
			showTooltip: true,
			onClick: () => {
				void navigate({ to: "/settings" });
			},
		},
		{
			id: "about",
			active: page === "about",
			icon: appSidebarIcons.about,
			label: t("menu.about"),
			onClick: () => {
				void navigate({ to: "/about" });
			},
			showLabel: false,
			showTooltip: true,
		},
		{
			id: "logout",
			icon: logoutIcon,
			label: t("auth.signOut"),
			showLabel: false,
			showTooltip: true,
			onClick: handleLogout,
		},
	];

	return (
		<div className="flex h-screen flex-row">
			<AppSidebar
				appName="VidBee"
				bottomItems={bottomItems}
				items={items}
				logoAlt="VidBee"
				logoSrc="/app-icon.png"
			/>

			<main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
				<div className="h-full flex-1 overflow-y-auto overflow-x-hidden">
					{children}
				</div>
			</main>
		</div>
	);
};

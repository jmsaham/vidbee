import { useNavigate } from "@tanstack/react-router";
import {
	AppSidebar,
	type AppSidebarIcon,
	type AppSidebarItem,
} from "@vidbee/ui/components/ui/app-sidebar";
import { appSidebarIcons } from "@vidbee/ui/components/ui/app-sidebar-icons";
import { cn } from "@vidbee/ui/lib/cn";
import { Library, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { clearAuthToken } from "../../lib/orpc-client";

type AppPage = "about" | "download" | "library" | "settings";

interface AppShellProps {
	children: ReactNode;
	page: AppPage;
}

const LogOutIconComponent = ({ className }: { className?: string }) => (
	<LogOut className={className} />
);

const LibraryIconComponent = ({ className }: { className?: string }) => (
	<Library className={className} />
);

const logoutIcon: AppSidebarIcon = {
	active: LogOutIconComponent,
	inactive: LogOutIconComponent,
};

const libraryIcon: AppSidebarIcon = {
	active: LibraryIconComponent,
	inactive: LibraryIconComponent,
};

interface MobileNavItemProps {
	active?: boolean;
	icon: AppSidebarIcon;
	label: string;
	onClick?: () => void;
}

const MobileNavItem = ({
	active,
	icon,
	label,
	onClick,
}: MobileNavItemProps) => {
	const IconComponent = active ? icon.active : icon.inactive;
	return (
		<button
			className={cn(
				"flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
				active ? "text-primary" : "text-muted-foreground",
			)}
			onClick={onClick}
			type="button"
		>
			<IconComponent className="h-5 w-5" />
			<span className="text-[10px] leading-none">{label}</span>
		</button>
	);
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
			id: "library",
			active: page === "library",
			icon: libraryIcon,
			label: t("menu.library"),
			onClick: () => {
				void navigate({ to: "/library" });
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

	const mobileNavItems: MobileNavItemProps[] = [
		{
			active: page === "download",
			icon: appSidebarIcons.home,
			label: t("menu.download"),
			onClick: () => void navigate({ to: "/" }),
		},
		{
			active: page === "library",
			icon: libraryIcon,
			label: t("menu.library"),
			onClick: () => void navigate({ to: "/library" }),
		},
		{
			active: page === "settings",
			icon: appSidebarIcons.settings,
			label: t("menu.preferences"),
			onClick: () => void navigate({ to: "/settings" }),
		},
		{
			active: page === "about",
			icon: appSidebarIcons.about,
			label: t("menu.about"),
			onClick: () => void navigate({ to: "/about" }),
		},
	];

	return (
		<div className="flex h-dvh flex-col sm:flex-row">
			<AppSidebar
				appName="VidBee"
				bottomItems={bottomItems}
				className="hidden sm:flex"
				items={items}
				logoAlt="VidBee"
				logoSrc="/app-icon.png"
			/>

			<main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
				<div className="h-full flex-1 overflow-y-auto overflow-x-hidden pb-16 sm:pb-0">
					{children}
				</div>
			</main>

			<nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-border/60 bg-background/95 backdrop-blur-sm sm:hidden">
				{mobileNavItems.map((item) => (
					<MobileNavItem key={item.label} {...item} />
				))}
			</nav>
		</div>
	);
};

import {
	buildFilePathCandidates,
	normalizeSavedFileName,
} from "@vidbee/downloader-core/download-file";
import { Badge } from "@vidbee/ui/components/ui/badge";
import { Button } from "@vidbee/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@vidbee/ui/components/ui/dialog";
import { ScrollArea } from "@vidbee/ui/components/ui/scroll-area";
import { cn } from "@vidbee/ui/lib/cn";
import { Download, Film, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { buildImageProxyUrl } from "../../lib/remote-image-proxy";
import { getAuthToken, orpcClient } from "../../lib/orpc-client";
import { readWebSettings } from "../../lib/web-settings";
import type { DownloadRecord } from "../download/types";
import { AppShell } from "../layout/app-shell";

type LibraryFilter = "all" | "video" | "audio";

const formatDuration = (seconds: number): string => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) {
		return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
	}
	return `${m}:${String(s).padStart(2, "0")}`;
};

const formatFileSize = (bytes: number): string => {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const buildStreamUrl = (filePath: string): string => {
	const token = getAuthToken() ?? "";
	return `/files/stream?path=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}`;
};

interface LibraryCardProps {
	record: DownloadRecord;
	onPlay: () => void;
}

const LibraryCard = ({ record, onPlay }: LibraryCardProps) => {
	const proxyUrl = record.thumbnail
		? buildImageProxyUrl(record.thumbnail)
		: null;

	return (
		<button
			type="button"
			onClick={onPlay}
			className="group relative overflow-hidden rounded-xl border border-border/50 bg-card text-left transition-all hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<div className="relative aspect-video bg-muted">
				{proxyUrl ? (
					<img
						alt={record.title ?? ""}
						className="h-full w-full object-cover"
						loading="lazy"
						src={proxyUrl}
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center text-muted-foreground">
						<Film className="h-10 w-10 opacity-20" />
					</div>
				)}

				<div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
					<div className="scale-75 transform opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
						<div className="rounded-full bg-white/90 p-3">
							<Play className="h-5 w-5 fill-current text-black" />
						</div>
					</div>
				</div>

				{record.duration != null && (
					<span className="absolute right-2 bottom-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-white text-xs">
						{formatDuration(record.duration)}
					</span>
				)}

				<span className="absolute top-2 left-2">
					<Badge className="text-xs capitalize opacity-90" variant="secondary">
						{record.type}
					</Badge>
				</span>
			</div>

			<div className="p-3">
				<p className="line-clamp-2 font-medium text-sm leading-snug">
					{record.title}
				</p>
				{record.fileSize != null && (
					<p className="mt-1 text-muted-foreground text-xs">
						{formatFileSize(record.fileSize)}
					</p>
				)}
			</div>
		</button>
	);
};

export const LibraryPage = () => {
	const { t } = useTranslation();
	const [records, setRecords] = useState<DownloadRecord[]>([]);
	const [filter, setFilter] = useState<LibraryFilter>("all");
	const [loading, setLoading] = useState(true);
	const [playerRecord, setPlayerRecord] = useState<DownloadRecord | null>(null);
	const [playerFilePath, setPlayerFilePath] = useState<string | null>(null);
	const [playerLoading, setPlayerLoading] = useState(false);
	const [playerOpen, setPlayerOpen] = useState(false);

	const loadLibrary = useCallback(async () => {
		try {
			const result = await orpcClient.history.list();
			const completed = result.history
				.map((r) => ({ ...r, entryType: "history" as const }))
				.filter((r) => r.status === "completed")
				.sort(
					(a, b) =>
						(b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt),
				);
			setRecords(completed);
		} catch {
			toast.error(t("errors.networkError"));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		void loadLibrary();
	}, [loadLibrary]);

	const filteredRecords = useMemo(() => {
		if (filter === "all") return records;
		return records.filter((r) => r.type === filter);
	}, [records, filter]);

	const resolveFilePath = useCallback(
		async (record: DownloadRecord): Promise<string | null> => {
			const settings = readWebSettings();
			const downloadPath =
				record.downloadPath?.trim() || settings.downloadPath.trim();
			if (!downloadPath || !record.title) return null;

			const savedExt = normalizeSavedFileName(record.savedFileName)
				? record.savedFileName?.split(".").at(-1)?.toLowerCase()
				: undefined;
			const ext = savedExt ?? (record.type === "audio" ? "mp3" : "mp4");

			const candidates = buildFilePathCandidates(
				downloadPath,
				record.title,
				ext,
				record.savedFileName,
			);

			for (const candidate of candidates) {
				try {
					const { exists } = await orpcClient.files.exists({ path: candidate });
					if (exists) return candidate;
				} catch {
					// try next candidate
				}
			}
			return null;
		},
		[],
	);

	const openPlayer = useCallback(
		async (record: DownloadRecord) => {
			setPlayerRecord(record);
			setPlayerFilePath(null);
			setPlayerLoading(true);
			setPlayerOpen(true);
			const filePath = await resolveFilePath(record);
			setPlayerFilePath(filePath);
			setPlayerLoading(false);
		},
		[resolveFilePath],
	);

	const closePlayer = () => {
		setPlayerOpen(false);
		setPlayerRecord(null);
		setPlayerFilePath(null);
	};

	const filterButtons: Array<{ key: LibraryFilter; label: string }> = [
		{ key: "all", label: t("library.filterAll") },
		{ key: "video", label: t("library.filterVideo") },
		{ key: "audio", label: t("library.filterAudio") },
	];

	return (
		<AppShell page="library">
			<div className="flex h-full flex-col">
				<div className="z-10 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h1 className="font-semibold text-xl">{t("library.title")}</h1>
						<div className="flex gap-1">
							{filterButtons.map((btn) => (
								<Button
									className={cn("h-8 rounded-full px-3 text-xs")}
									key={btn.key}
									onClick={() => setFilter(btn.key)}
									size="sm"
									variant={filter === btn.key ? "default" : "ghost"}
								>
									{btn.label}
								</Button>
							))}
						</div>
					</div>
				</div>

				<ScrollArea className="flex-1">
					<div className="p-4 sm:p-6">
						{loading ? (
							<div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
								{t("library.loading")}
							</div>
						) : filteredRecords.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
								<Film className="h-12 w-12 text-muted-foreground/30" />
								<p className="max-w-xs text-muted-foreground text-sm">
									{t("library.noItems")}
								</p>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
								{filteredRecords.map((record) => (
									<LibraryCard
										key={record.id}
										onPlay={() => void openPlayer(record)}
										record={record}
									/>
								))}
							</div>
						)}
					</div>
				</ScrollArea>
			</div>

			<Dialog
				onOpenChange={(open) => {
					if (!open) closePlayer();
				}}
				open={playerOpen}
			>
				{playerRecord && (
					<DialogContent className="max-w-3xl p-0 overflow-hidden">
						<div className="p-4 sm:p-6 space-y-4">
							<DialogHeader>
								<DialogTitle className="line-clamp-2 pr-6">
									{playerRecord.title}
								</DialogTitle>
							</DialogHeader>

							{playerLoading ? (
								<div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
									{t("library.loading")}
								</div>
							) : playerFilePath ? (
								playerRecord.type === "audio" ? (
									<audio
										className="w-full"
										controls
										key={playerFilePath}
										src={buildStreamUrl(playerFilePath)}
									/>
								) : (
									<video
										className="max-h-[60vh] w-full rounded-lg bg-black"
										controls
										key={playerFilePath}
										src={buildStreamUrl(playerFilePath)}
									/>
								)
							) : (
								<div className="flex aspect-video items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
									{t("library.fileNotFound")}
								</div>
							)}

							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
									<Badge className="capitalize" variant="secondary">
										{playerRecord.type}
									</Badge>
									{playerRecord.duration != null && (
										<span>{formatDuration(playerRecord.duration)}</span>
									)}
									{playerRecord.fileSize != null && (
										<span>{formatFileSize(playerRecord.fileSize)}</span>
									)}
								</div>
								{playerFilePath && (
									<Button asChild size="sm" variant="outline">
										<a
											download={
												playerRecord.savedFileName ??
												`${playerRecord.title ?? "download"}.${playerRecord.type === "audio" ? "mp3" : "mp4"}`
											}
											href={buildStreamUrl(playerFilePath)}
										>
											<Download className="mr-1.5 h-3.5 w-3.5" />
											{t("library.download")}
										</a>
									</Button>
								)}
							</div>
						</div>
					</DialogContent>
				)}
			</Dialog>
		</AppShell>
	);
};

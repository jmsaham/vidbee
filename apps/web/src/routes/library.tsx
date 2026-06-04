import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "../components/pages/library-page";

export const Route = createFileRoute("/library")({
	component: LibraryPage,
});

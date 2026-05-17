import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import packageJson from "./package.json";

const apiTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:3100";

const config = defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(packageJson.version),
	},
	plugins: [
		devtools({
			eventBusConfig: {
				enabled: false,
			},
		}),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		Icons({
			compiler: "jsx",
			jsx: "react",
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	server: {
		proxy: {
			"/events": {
				target: apiTarget,
				changeOrigin: true,
			},
			"/rpc": {
				target: apiTarget,
				changeOrigin: true,
			},
			"/images": {
				target: apiTarget,
				changeOrigin: true,
			},
		},
	},
	ssr: {
		noExternal: ["@vidbee/i18n"],
	},
});

export default config;

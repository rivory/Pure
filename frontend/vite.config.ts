import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: [
			{ find: "@", replacement: path.resolve(__dirname, "src") },
			{ find: "@libs", replacement: path.resolve(__dirname, "src/lib") },
		],
	},
});

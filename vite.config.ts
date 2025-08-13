import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const basePath = "/weekly-planner/"; // <-- change if your repo name differs
export default defineConfig({ plugins: [react()], base: basePath });

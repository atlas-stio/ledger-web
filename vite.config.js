import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver, VantResolver } from "unplugin-vue-components/resolvers";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const API_Endpoint = env.VITE_API_Endpoint;
    const isProd = mode === "production";

    return {
        base: "/ledger/",
        esbuild: {
            drop: isProd ? ["console", "debugger"] : [],
        },
        build: {
            outDir: "dist",
            minify: "esbuild",
            rollupOptions: {
                input: {
                    main: resolve(__dirname, "index.html"),
                },
            },
        },
        plugins: [
            vue(),
            AutoImport({
                resolvers: [ElementPlusResolver(), VantResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver(), VantResolver()],
            }),
        ],
        server: {
            host: "0.0.0.0",
            proxy: {
                "/ledger/atlas": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/ledger/, ""),
                },
                "/atlas": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                },
                "/api": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                },
                "/authui": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
        resolve: {
            alias: {
                "@": resolve(__dirname, "src"),
            },
        },
    };
});

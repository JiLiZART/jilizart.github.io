import { defineConfig } from "astro/config";
import react from "@astrojs/react";
// import preact from "@astrojs/preact";
import tailwind from "@astrojs/tailwind";

import fs from "node:fs";

const https = {
  key: fs.readFileSync("localhost-key.pem"),
  cert: fs.readFileSync("localhost.pem"),
};

export default defineConfig({
    integrations: [react(), tailwind()],
    vite: {
        css: {devSourcemap: true},
        server: {
            https,
        },
        define: {
            'import.meta.env.CF_PAGES_URL': JSON.stringify(process.env.CF_PAGES_URL),
            'import.meta.env.CF_PAGES_COMMIT_SHA': JSON.stringify(process.env.CF_PAGES_COMMIT_SHA)
        }
    }
});

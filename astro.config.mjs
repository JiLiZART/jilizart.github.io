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
    server: {
      https,
    },
  },
});

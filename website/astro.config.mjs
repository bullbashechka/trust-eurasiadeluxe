import { defineConfig } from "astro/config";
import react from "@astrojs/react";
const origin = process.env.PUBLIC_SITE_URL;
export default defineConfig({
  site: origin || undefined,
  output: "static",
  trailingSlash: "always",
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: { server: { watch: { usePolling: true, interval: 400 } } },
});

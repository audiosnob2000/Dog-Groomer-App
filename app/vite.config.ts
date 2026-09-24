import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages project-site base path. This repo publishes to
// https://<user>.github.io/dog-groomer-app/, so assets must be requested
// from that subpath. Locally (`vite`/`vite preview`) Vite ignores `base`
// for the dev server root, so this is safe for local dev too.
const BASE = process.env.VITE_BASE_PATH ?? '/dog-groomer-app/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
})

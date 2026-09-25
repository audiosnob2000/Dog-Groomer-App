import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// GitHub Pages project-site base path. GitHub Pages URLs are case-sensitive
// and match the repo name exactly — this repo is "Dog-Groomer-App" (not
// lowercase), so it publishes to https://<user>.github.io/Dog-Groomer-App/,
// and assets must be requested from that exact subpath. Locally
// (`vite`/`vite preview`) Vite ignores `base` for the dev server root, so
// this is safe for local dev too.
const BASE = process.env.VITE_BASE_PATH ?? '/Dog-Groomer-App/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
})

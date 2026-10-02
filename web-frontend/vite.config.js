import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
  ],
  /**
   * Serves the API from this origin during development, so the browser sees one origin instead
   * of two. The deployed app reaches Render through the same kind of proxy, and this keeps local
   * development honest: a session cookie set here is a first-party cookie, which is exactly what
   * production relies on being able to do.
   *
   * The keys are regular expressions, and they have to be. Vite matches a plain key such as
   * `/api` with `url.startsWith(key)`, which also matches `/api-docs` - this app's own API
   * reference page, which must render the React route and not the backend's Swagger UI. The
   * trailing slash and the anchors keep the proxy on real API paths only. Vercel's `rewrites`
   * match whole path segments, so its `/api/(.*)` never had this problem.
   */
  server: {
    proxy: {
      '^/api/': { target: 'http://localhost:5000', changeOrigin: true },
      '^/openapi\\.json$': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // For GitHub Pages with repository pages, use an absolute base
  // leading and trailing slashes required, e.g. '/<repo-name>/'
  base: '/ABIPlayground/',
  plugins: [react()],
})

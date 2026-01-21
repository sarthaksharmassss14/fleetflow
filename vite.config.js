import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    host: true // Allow access from network (for mobile testing)
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet']
  }
})

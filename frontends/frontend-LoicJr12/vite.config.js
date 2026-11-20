import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 5173 : déjà autorisé dans CORS_ORIGINS du backend (.env.example)
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})

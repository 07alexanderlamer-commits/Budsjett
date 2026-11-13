import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative stier: fungerer uansett hvilken adresse siden ligger på
export default defineConfig({
  plugins: [react()],
  base: './',
})

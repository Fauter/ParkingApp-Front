import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // <-- AGREGÁ ESTO
  server: {
    port: 3001, // Para que el dev corra en 3001
  }
});
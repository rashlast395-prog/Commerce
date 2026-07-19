import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        rider: resolve(__dirname, 'rider.html'),
        profile: resolve(__dirname, 'profile.html'),
        product: resolve(__dirname, 'product.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        commandCenter: resolve(__dirname, 'command-center.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5501,
    open: true
  }
});

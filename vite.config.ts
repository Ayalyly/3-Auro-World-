import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': 'frame-ancestors *',
          'Access-Control-Allow-Origin': '*'
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          workbox: {
            maximumFileSizeToCacheInBytes: 5000000
          },
          manifest: {
            name: 'Auro AI',
            short_name: 'AuroAI',
            description: 'Your AI companion that feels alive.',
            theme_color: '#F4F6FF',
            icons: [
              {
                src: 'https://i.ibb.co/k6KC8zyN/media-1769361739.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://i.ibb.co/k6KC8zyN/media-1769361739.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

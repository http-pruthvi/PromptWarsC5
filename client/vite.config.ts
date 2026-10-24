import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
    {
      name: 'font-preload',
      transformIndexHtml(_html, ctx) {
        if (!ctx.bundle) return []
        const tags = []
        for (const fileName of Object.keys(ctx.bundle)) {
          if (fileName.includes('cormorant-garamond-latin-600-normal') && fileName.endsWith('.woff2')) {
            tags.push({
              tag: 'link',
              attrs: {
                rel: 'preload',
                href: `/${fileName}`,
                as: 'font',
                type: 'font/woff2',
                crossorigin: 'anonymous',
              },
              injectTo: 'head' as const,
            })
          }
        }
        return tags
      },
    },
  ],
  resolve: {
    alias: {
      '@soiree/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})

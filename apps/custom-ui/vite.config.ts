import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    }),
  ],
  server: {
    port: 3002,
    host: true
  },
  define: {
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV || 'development'
    })
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress React 18 strict mode warnings from arranger-components
        if (warning.code === 'UNSAFE_COMPONENT_LIFECYCLE' || 
            warning.message?.includes('UNSAFE_componentWillReceiveProps') ||
            warning.message?.includes('key prop is being spread')) {
          return;
        }
        warn(warning);
      },
    },
  },
})



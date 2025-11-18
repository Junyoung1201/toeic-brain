import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { builtinModules } from 'module';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const buildTarget = process.env.BUILD_TARGET || 'renderer';

  // Renderer 프로세스 설정
  if (buildTarget === 'renderer') {
    return {
      plugins: [react()],
      root: 'src/renderer',
      base: './',
      build: {
        outDir: '../../dist',
        emptyOutDir: false,
        rollupOptions: {
          output: {
            entryFileNames: 'renderer.js',
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          },
        },
        minify: isProduction,
        sourcemap: true,
      },
      resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
          '@': path.resolve(__dirname, './src/renderer'),
          '@/store': path.resolve(__dirname, './src/renderer/store'),
          '@/components': path.resolve(__dirname, './src/renderer/components'),
          '@/types': path.resolve(__dirname, './src/renderer/types'),
        },
      },
      server: {
        port: 8080,
        strictPort: true,
      },
    };
  }

  // Main 프로세스 설정
  if (buildTarget === 'main') {
    return {
      build: {
        outDir: 'dist',
        lib: {
          entry: 'src/main.ts',
          formats: ['cjs'],
          fileName: () => 'main.js',
        },
        rollupOptions: {
          external: ['electron', 'path', ...builtinModules],
          output: {
            entryFileNames: '[name].js',
          },
        },
        emptyOutDir: false,
        minify: isProduction,
        sourcemap: true,
      },
      resolve: {
        extensions: ['.ts', '.js'],
      },
    };
  }

  return {};
});

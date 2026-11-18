import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// Duas páginas: o Patifaria (index.html) e Sombra no Guaíba (sombra.html).
export default defineConfig({build: {rollupOptions: {input: {main: resolve(import.meta.dirname, 'index.html'), sombra: resolve(import.meta.dirname, 'sombra.html')}}}});

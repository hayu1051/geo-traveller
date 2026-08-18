import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * base は GitHub Pages のために要る。
 *
 * 公開先が https://hayu1051.github.io/geo-traveller/ というサブパスなので、
 * これが無いとビルドした JS と CSS が /assets/... を指し、
 * ドメイン直下を取りに行って 404 になる。画面は真っ白のまま何も出ない。
 *
 * リポジトリ名を変えたら、ここも一緒に変えること。
 */

// https://vite.dev/config/
export default defineConfig({
  base: '/geo-traveller/',
  plugins: [react()],
})

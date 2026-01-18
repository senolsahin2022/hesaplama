// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react'; 


export default defineConfig({
  // ✨ Integrations dizisi HAYATİ ÖNEM TAŞIR.
  integrations: [
    tailwind({
      // ⚠️ Gerekirse config dosyanızın adını burada belirtebilirsiniz. 
      // Eğer tailwind.config.js adında ise, bu satıra gerek yoktur.
      // config: './tailwind.config.mjs',
    }), 
    react(),    
  ],
  // ... diğer ayarlar
});
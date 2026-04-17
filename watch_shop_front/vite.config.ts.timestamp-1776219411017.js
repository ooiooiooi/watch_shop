// vite.config.ts
import { defineConfig } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "");
        return path.resolve("D:\\workspace\\watch_shop\\watch_shop_front", "src/assets", filename);
      }
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve("D:\\workspace\\watch_shop\\watch_shop_front", "./src")
    }
  },
  assetsInclude: ["**/*.svg", "**/*.csv"]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG5cbmZ1bmN0aW9uIGZpZ21hQXNzZXRSZXNvbHZlcigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnZmlnbWEtYXNzZXQtcmVzb2x2ZXInLFxuICAgIHJlc29sdmVJZChpZCkge1xuICAgICAgaWYgKGlkLnN0YXJ0c1dpdGgoJ2ZpZ21hOmFzc2V0LycpKSB7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gaWQucmVwbGFjZSgnZmlnbWE6YXNzZXQvJywgJycpXG4gICAgICAgIHJldHVybiBwYXRoLnJlc29sdmUoXCJEOlxcXFx3b3Jrc3BhY2VcXFxcd2F0Y2hfc2hvcFxcXFx3YXRjaF9zaG9wX2Zyb250XCIsICdzcmMvYXNzZXRzJywgZmlsZW5hbWUpXG4gICAgICB9XG4gICAgfSxcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgZmlnbWFBc3NldFJlc29sdmVyKCksXG4gICAgcmVhY3QoKSxcbiAgICB0YWlsd2luZGNzcygpLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIC8vIEFsaWFzIEAgdG8gdGhlIHNyYyBkaXJlY3RvcnlcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKFwiRDpcXFxcd29ya3NwYWNlXFxcXHdhdGNoX3Nob3BcXFxcd2F0Y2hfc2hvcF9mcm9udFwiLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuXG4gIC8vIEZpbGUgdHlwZXMgdG8gc3VwcG9ydCByYXcgaW1wb3J0cy4gTmV2ZXIgYWRkIC5jc3MsIC50c3gsIG9yIC50cyBmaWxlcyB0byB0aGlzLlxuICBhc3NldHNJbmNsdWRlOiBbJyoqLyouc3ZnJywgJyoqLyouY3N2J10sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sVUFBVTtBQUNqQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFdBQVc7QUFHbEIsU0FBUyxxQkFBcUI7QUFDNUIsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sVUFBVSxJQUFJO0FBQ1osVUFBSSxHQUFHLFdBQVcsY0FBYyxHQUFHO0FBQ2pDLGNBQU0sV0FBVyxHQUFHLFFBQVEsZ0JBQWdCLEVBQUU7QUFDOUMsZUFBTyxLQUFLLFFBQVEsK0NBQStDLGNBQWMsUUFBUTtBQUFBLE1BQzNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLG1CQUFtQjtBQUFBLElBQ25CLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxFQUNkO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFFTCxLQUFLLEtBQUssUUFBUSwrQ0FBK0MsT0FBTztBQUFBLElBQzFFO0FBQUEsRUFDRjtBQUFBLEVBR0EsZUFBZSxDQUFDLFlBQVksVUFBVTtBQUN4QyxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

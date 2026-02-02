// vitest.config.ts
import { defineConfig } from "file:///D:/clademusic/node_modules/vitest/dist/config.js";
import react from "file:///D:/clademusic/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "D:\\clademusic";
var vitest_config_default = defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/**/*"]
  },
  resolve: {
    alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXGNsYWRlbXVzaWNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXGNsYWRlbXVzaWNcXFxcdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovY2xhZGVtdXNpYy92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVzdC9jb25maWdcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW3JlYWN0KCldLFxyXG4gIHRlc3Q6IHtcclxuICAgIGVudmlyb25tZW50OiBcImpzZG9tXCIsXHJcbiAgICBnbG9iYWxzOiB0cnVlLFxyXG4gICAgc2V0dXBGaWxlczogW1wiLi9zcmMvdGVzdC9zZXR1cC50c1wiXSxcclxuICAgIGluY2x1ZGU6IFtcInNyYy8qKi8qLnt0ZXN0LHNwZWN9Lnt0cyx0c3h9XCJdLFxyXG4gICAgZXhjbHVkZTogW1widGVzdHMvKiovKlwiXSxcclxuICB9LFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7IFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaU8sU0FBUyxvQkFBb0I7QUFDOVAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTTtBQUFBLElBQ0osYUFBYTtBQUFBLElBQ2IsU0FBUztBQUFBLElBQ1QsWUFBWSxDQUFDLHFCQUFxQjtBQUFBLElBQ2xDLFNBQVMsQ0FBQywrQkFBK0I7QUFBQSxJQUN6QyxTQUFTLENBQUMsWUFBWTtBQUFBLEVBQ3hCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPLEVBQUUsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTyxFQUFFO0FBQUEsRUFDakQ7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["./src/index.ts"],
  target: "es2020",
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: !options.watch,
  dts: true,
  silent: !options.watch,
  cjsInterop: false,
}));

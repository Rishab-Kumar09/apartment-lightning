// Ambient shim so realClient.ts (Phase 5) type-checks before the real
// @solarisdk/browser package is installed (that happens once SOLARI_API_KEY
// exists — see src/solari/realClient.ts). Delete this once the real
// package's own types are in node_modules.
declare module "@solarisdk/browser" {
  const solariBrowserModule: any
  export = solariBrowserModule
}

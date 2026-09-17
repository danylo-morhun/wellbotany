// sha256 of next-themes' inline theme-init script as emitted by the production
// build (Next minifies it, so compute from built HTML, not from source). The root
// layout can't pass a nonce without making every page dynamic, so strict-CSP
// routes allow this script by hash. tests/e2e/csp.spec.ts fails when a
// next-themes/Next upgrade or a <ThemeProvider> props change makes it drift.
export const THEME_INIT_SCRIPT_HASH = "sha256-J9cZHZf5nVZbsm7Pqxc8RsURv1AIXkMgbhfrZvoOs/A=";

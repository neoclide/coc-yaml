# Upstream review — 2026-10-03

Downstream baseline: d8f6666. Historical full import: 4c573da (2020-12-09); later Coc-specific incremental work includes schema commands and disabledPatterns in ebfe38f.
Target reviewed: redhat-developer/vscode-yaml cdfb5a6702fc71e99284b04375eda40dd67262c3.
Selected semantic port, not complete upstream parity.

- f4ac9f5a4b285530be0eb4b6efce53e8396e703e: bounded retries for HTTP 429/502/503/504 and temporary network errors, honoring Retry-After with a one-second cap. Applies both to normal retrieval and missing-cache retry after HTTP 304.
- 66fcb7383522253f9fc344727d1a72da1dab181d: return JSON-RPC ResponseError from failed content requests so the language server receives a standard error.
- Preserve Coc schema cache and content-provider integration. Correct a downstream missing await: a cached ETag with missing content must report the HTTP error, and an empty cached string is still valid content.
- Existing downstream schema selection, loadSchema, jumpToSchema and disabledPatterns implementations retained. VS Code schema status-bar UX, extension-presence automatic disable logic, web-only loading, localization and editor indentation contributions are not ported.
- Language-server bundle, language selectors, configuration defaults and editor adapter architecture remain unchanged. Other upstream formatter/language contributions require a separately verified Coc activation/filetype boundary.

Baseline findings and repairs:
- Type checking failed on undefined logToExtensionOutputChannel and unused ExtensionContext import; use console.error with contributor error isolation regression and remove the unused import.
- request-light's declarations referenced missing http-proxy-agent/https-proxy-agent types; add compatible development dependencies with npm lockfile updates.
- Existing integration tests failed because configuration updates default to workspace scope, but loadSchema documents user configuration. Specify user configuration explicitly and make test fixture setting writes use their isolated user configuration.

Validation: baseline build passed, baseline type check failed as above. After repair, production build and TypeScript check pass; complete coc-test suite passes 38/38 on Neovim and 38/38 on Vim, including actual loopback HTTP retries/errors/cache responses, real YAML language-client/schema commands, and contributor failure isolation. Local HTTP fixtures require socket access. Contract inventory reports no removed/changed public contracts; git diff --check passes. request-light emits its existing Node url.parse deprecation warning.

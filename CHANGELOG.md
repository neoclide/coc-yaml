## Unreleased

- Retry temporary remote schema failures and return standard protocol errors when schema loading fails.
- Preserve empty schema cache entries and handle stale cache metadata correctly.
- Keep schema contributor failures isolated and persist loaded schemas in user configuration.

# 1.7.1

- And `yaml.selectSchema` command.

# 1.7.0

- Add configuration `yaml.disableDefaultProperties`.
- Add status bar item support for resolved schema.
- Support cache fetched schema result by etag.
- Support show information when max items exceed.
- Support `JSONSchemaDocumentContentProvider` for custom schema: `json-schema`.

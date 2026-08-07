export type SchemaSettings = Record<string, unknown>

/**
 * Remove a file from every `yaml.schemas` association, dropping entries that
 * end up with no file pattern.
 */
export function removeFileFromSchemas(settings: SchemaSettings, fileUri: string): SchemaSettings {
  const next = Object.assign({}, settings)
  for (const key of Object.keys(next)) {
    const value = next[key]
    if (Array.isArray(value)) {
      const filtered = value.filter(v => v !== fileUri)
      if (filtered.length === 0) delete next[key]
      else next[key] = filtered
    } else if (value === fileUri) {
      delete next[key]
    }
  }
  return next
}

/**
 * Associate a file with a schema, removing the file from any other schema
 * association first. A single file is stored as a string, multiple files as an
 * array, matching the `yaml.schemas` configuration format.
 */
export function associateSchemaWithFile(settings: SchemaSettings, schemaUri: string, fileUri: string): SchemaSettings {
  const next = removeFileFromSchemas(settings, fileUri)
  const existing = next[schemaUri]
  if (Array.isArray(existing)) {
    if (!existing.includes(fileUri)) next[schemaUri] = existing.concat(fileUri)
  } else if (typeof existing === 'string' && existing !== fileUri) {
    next[schemaUri] = [existing, fileUri]
  } else {
    next[schemaUri] = fileUri
  }
  return next
}

export interface JSONSchemaRef {
  name?: string
  description?: string
  uri: string
}

export interface JumpToSchemaClient {
  sendRequest(method: string, params?: unknown): Promise<unknown>
}

/**
 * Open the schema associated with a yaml document.
 *
 * Asks the yaml language server which schemas apply to `docUri`, then runs the
 * server's `jumpToSchema` command with the first matching schema uri. The server
 * answers with a `window/showDocument` request, which coc.nvim handles by
 * opening the resource (schema content is provided by coc-yaml's `json-schema`
 * content provider).
 *
 * Returns the opened schema uri, or undefined when the server reports no schema
 * for the document.
 */
export async function jumpToSchema(client: JumpToSchemaClient, docUri: string): Promise<string | undefined> {
  const schemas = (await client.sendRequest('yaml/get/jsonSchema', docUri)) as JSONSchemaRef[] | undefined
  const schema = Array.isArray(schemas) ? schemas[0] : undefined
  if (!schema) return undefined
  await client.sendRequest('workspace/executeCommand', {
    command: 'jumpToSchema',
    arguments: [schema.uri],
  })
  return schema.uri
}

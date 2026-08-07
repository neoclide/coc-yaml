import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { jumpToSchema, type JSONSchemaRef, type JumpToSchemaClient } from '../src/jump-to-schema'

function createClient(schemas: JSONSchemaRef[] | Error): {
  client: JumpToSchemaClient
  calls: Array<{ method: string; params?: unknown }>
} {
  const calls: Array<{ method: string; params?: unknown }> = []
  const client: JumpToSchemaClient = {
    sendRequest: async (method, params) => {
      calls.push({ method, params })
      if (method === 'yaml/get/jsonSchema') {
        if (schemas instanceof Error) throw schemas
        return schemas
      }
      return null
    },
  }
  return { client, calls }
}

describe('jumpToSchema', () => {
  it('executes the server jumpToSchema command with the matching schema uri', async () => {
    const schema: JSONSchemaRef = {
      name: 'Kubernetes',
      uri: 'https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master/v1.31.1-standalone-strict/all.json',
    }
    const { client, calls } = createClient([schema])

    const opened = await jumpToSchema(client, 'file:///workspace/deploy.yaml')

    assert.equal(opened, schema.uri)
    assert.deepEqual(calls, [
      { method: 'yaml/get/jsonSchema', params: 'file:///workspace/deploy.yaml' },
      {
        method: 'workspace/executeCommand',
        params: { command: 'jumpToSchema', arguments: [schema.uri] },
      },
    ])
  })

  it('does nothing when the server reports no schema', async () => {
    const { client, calls } = createClient([])

    assert.equal(await jumpToSchema(client, 'file:///workspace/plain.yaml'), undefined)
    assert.deepEqual(calls, [{ method: 'yaml/get/jsonSchema', params: 'file:///workspace/plain.yaml' }])
  })

  it('propagates a client error', async () => {
    const { client } = createClient(new Error('client is not running'))

    await assert.rejects(() => jumpToSchema(client, 'file:///workspace/deploy.yaml'), /client is not running/)
  })
})

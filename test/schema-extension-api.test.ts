import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { LanguageClient } from 'coc.nvim'
import { MODIFICATION_ACTIONS, SchemaExtensionAPI } from '../src/schema-extension-api'

describe('SchemaExtensionAPI', () => {
  it('registers a contributor only once', () => {
    const { api } = createApi()
    assert.equal(api.registerContributor('test-schema', () => 'test-schema://x', () => '{}'), true)
    assert.equal(api.hasProvider('test-schema'), true)
    assert.equal(api.registerContributor('test-schema', () => 'test-schema://x', () => '{}'), false)
  })

  it('rejects a contributor without requestSchema', () => {
    const { api } = createApi()
    assert.throws(() => api.registerContributor('bad', undefined as never, () => '{}'))
  })

  it('returns schema uri matches for registered contributors', () => {
    const { api } = createApi()
    api.registerContributor('demo', () => 'demo://schema', () => '{}')
    assert.deepEqual(api.requestCustomSchema('file:///a.yaml'), ['demo://schema'])
  })

  it('returns no matches when no contributor claims the resource', () => {
    const { api } = createApi()
    api.registerContributor('demo', () => '', () => '{}')
    assert.deepEqual(api.requestCustomSchema('file:///a.yaml'), [])
  })

  it('continues after a contributor throws', () => {
    const { api } = createApi()
    api.registerContributor('broken', () => { throw new Error('broken contributor') }, () => '{}')
    api.registerContributor('working', () => 'working://schema', () => '{}')
    assert.deepEqual(api.requestCustomSchema('file:///a.yaml'), ['working://schema'])
  })

  it('provides custom schema content by uri scheme', () => {
    const { api } = createApi()
    api.registerContributor('demo', () => 'demo://schema', uri => `content:${uri}`)
    assert.equal(api.requestCustomSchemaContent('demo://schema'), 'content:demo://schema')
    assert.equal(api.requestCustomSchemaContent('unknown://schema'), undefined)
  })

  it('sends schema modifications to the yaml client', async () => {
    const { api, sent } = createApi()
    const modification = {
      schema: 'demo://schema',
      action: MODIFICATION_ACTIONS.add,
      path: '/',
      key: 'title',
      content: 'Demo',
    }
    await api.modifySchemaContent(modification)
    assert.deepEqual(sent, [modification])
  })
})

function createApi(): { api: SchemaExtensionAPI; sent: unknown[] } {
  const sent: unknown[] = []
  const client = {
    sendRequest: async (_type: unknown, params: unknown): Promise<unknown> => {
      sent.push(params)
    },
  } as unknown as LanguageClient
  return { api: new SchemaExtensionAPI(client), sent }
}

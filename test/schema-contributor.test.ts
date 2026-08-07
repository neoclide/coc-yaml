import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CUSTOM_CONTENT_REQUEST,
  CUSTOM_SCHEMA_REQUEST,
  schemaContributor,
} from '../src/schema-contributor'

describe('schemaContributor', () => {
  it('registers a contributor and requests custom schemas', () => {
    const uri = 'demo://schema'
    assert.equal(schemaContributor.registerContributor('demo', () => uri, u => `content:${u}`), true)
    assert.equal(schemaContributor.requestCustomSchema('file:///a.yaml'), uri)
    assert.equal(schemaContributor.requestCustomSchemaContent(uri), `content:${uri}`)
  })

  it('rejects duplicate registration', () => {
    assert.equal(schemaContributor.registerContributor('demo', () => '', () => ''), false)
  })

  it('exposes protocol constants', () => {
    assert.equal(CUSTOM_SCHEMA_REQUEST, 'custom/schema/request')
    assert.equal(CUSTOM_CONTENT_REQUEST, 'custom/schema/content')
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { associateSchemaWithFile, removeFileFromSchemas } from '../src/schema-config'

describe('schema config helpers', () => {
  it('associates a single file as a string', () => {
    const next = associateSchemaWithFile({}, 'file:///schema.json', 'file:///a.yaml')
    assert.deepEqual(next, { 'file:///schema.json': 'file:///a.yaml' })
  })

  it('keeps existing patterns when associating another file', () => {
    const next = associateSchemaWithFile(
      { 'file:///schema.json': 'file:///a.yaml' },
      'file:///schema.json',
      'file:///b.yaml'
    )
    assert.deepEqual(next, { 'file:///schema.json': ['file:///a.yaml', 'file:///b.yaml'] })
  })

  it('moves the file away from other schemas', () => {
    const next = associateSchemaWithFile(
      { 'file:///old.json': 'file:///a.yaml', 'file:///new.json': 'file:///b.yaml' },
      'file:///new.json',
      'file:///a.yaml'
    )
    assert.deepEqual(next, { 'file:///new.json': ['file:///b.yaml', 'file:///a.yaml'] })
  })

  it('removes a file from every schema association', () => {
    const next = removeFileFromSchemas(
      {
        'file:///a.json': ['file:///x.yaml', 'file:///y.yaml'],
        'file:///b.json': 'file:///x.yaml',
        'file:///c.json': 'file:///z.yaml',
      },
      'file:///x.yaml'
    )
    assert.deepEqual(next, {
      'file:///a.json': ['file:///y.yaml'],
      'file:///c.json': 'file:///z.yaml',
    })
  })

  it('preserves unrelated empty arrays that mask lower-scope associations', () => {
    const settings = { 'file:///masked.json': [], 'file:///old.json': 'file:///a.yaml' }
    assert.deepEqual(removeFileFromSchemas(settings, 'file:///a.yaml'), { 'file:///masked.json': [] })
    assert.deepEqual(settings, { 'file:///masked.json': [], 'file:///old.json': 'file:///a.yaml' })
  })
})

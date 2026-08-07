import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'
import type { Memento } from 'coc.nvim'
import { JSONSchemaCache } from '../src/schema-cache'

describe('JSONSchemaCache', () => {
  it('round-trips schema content with etag', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coc-yaml-cache-'))
    try {
      const cache = new JSONSchemaCache(dir, new TestMemento(), () => {})
      assert.equal(cache.getETag('file:///schema.json'), undefined)
      await cache.putSchema('file:///schema.json', 'etag-1', '{"a":1}')
      assert.equal(cache.getETag('file:///schema.json'), 'etag-1')
      assert.equal(await cache.getSchema('file:///schema.json'), '{"a":1}')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  it('returns undefined for missing cached content', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coc-yaml-cache-'))
    try {
      const cache = new JSONSchemaCache(dir, new TestMemento(), () => {})
      assert.equal(await cache.getSchema('file:///missing.json'), undefined)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

class TestMemento implements Memento {
  private values = new Map<string, unknown>()

  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.values.has(key) ? (this.values.get(key) as T) : defaultValue
  }

  async update(key: string, value: unknown): Promise<void> {
    this.values.set(key, value)
  }
}

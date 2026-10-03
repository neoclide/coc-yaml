import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { after, before, describe, it } from 'node:test'
import { ResponseError } from 'coc.nvim'
import { getJsonSchemaContent, type IJSONSchemaCache } from '../src/content-provider'

const cache = (content?: string): IJSONSchemaCache => ({
  getETag: () => 'test-etag',
  putSchema: async () => {},
  getSchema: async () => content,
})

describe('remote schema content', () => {
  let server: http.Server
  let base: string
  let attempts = 0
  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/retry' && ++attempts < 3) {
        res.writeHead(503, { 'retry-after': '0' }).end('temporary')
      } else if (req.url === '/retry') {
        res.writeHead(200).end('{"type":"object"}')
      } else if (req.url === '/reset' && ++attempts < 3) {
        req.socket.destroy()
      } else if (req.url === '/reset') {
        res.writeHead(200).end('{}')
      } else if (req.url === '/missing-cache' && req.headers['if-none-match']) {
        res.writeHead(304).end()
      } else if (req.url === '/missing-cache' && ++attempts < 3) {
        req.socket.destroy()
      } else if (req.url === '/missing-cache') {
        res.writeHead(200).end('{}')
      } else if (req.url === '/cached') {
        res.writeHead(304).end()
      } else {
        res.writeHead(404).end('missing schema')
      }
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    base = `http://127.0.0.1:${(server.address() as any).port}`
  })
  after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) })

  it('retries the actual content request and recovers after transient failures', async () => {
    attempts = 0
    assert.equal(await getJsonSchemaContent(`${base}/retry`, cache()), '{"type":"object"}')
    assert.equal(attempts, 3)
  })
  it('returns a ResponseError when a cached etag exists but the content is missing', async () => {
    await assert.rejects(getJsonSchemaContent(`${base}/missing`, cache()), error => {
      assert.ok(error instanceof ResponseError)
      assert.equal(error.code, 404)
      assert.equal(error.message, 'missing schema')
      return true
    })
  })
  it('retries connection resets in the content provider and after a missing cached 304', async () => {
    for (const path of ['/reset', '/missing-cache']) {
      attempts = 0
      assert.equal(await getJsonSchemaContent(`${base}${path}`, cache()), '{}')
      assert.equal(attempts, 3)
    }
  })
  it('preserves cached content for 304 and an empty cached response on failure', async () => {
    assert.equal(await getJsonSchemaContent(`${base}/cached`, cache('{}')), '{}')
    assert.equal(await getJsonSchemaContent(`${base}/missing`, cache('')), '')
  })
})

import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { after, before, describe, it } from 'node:test'
import { xhr, type XHROptions } from 'request-light'
import { requestSchema } from '../src/schema-request'
import { requestWithRetry } from '../src/schema-request-retry'

describe('request-light network error adapter', () => {
  let server: http.Server
  let base: string
  let attempts = 0
  before(async () => {
    server = http.createServer((req, res) => {
      attempts++
      if (req.url === '/reset' || (req.url === '/recover' && attempts < 3)) {
        req.socket.destroy()
      } else if (req.url === '/recover') {
        res.end('{}')
      } else if (req.url === '/aborted') {
        res.writeHead(200, { 'Content-Length': '100' })
        res.write('{')
        setImmediate(() => res.destroy())
      } else {
        // No automatic Date header: even a headerless HTTP response must not be
        // mistaken for request-light's synthetic network error response.
        res.sendDate = false
        res.writeHead(req.url === '/500' ? 500 : 404)
        res.end(`Unable to connect to ${base}. Error: socket hang up`)
      }
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    base = `http://127.0.0.1:${(server.address() as any).port}`
  })
  after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) })

  // An explicit agent keeps loopback fixtures independent of HTTP_PROXY.
  const options = (path: string): XHROptions => ({
    url: `${base}${path}`,
    agent: new http.Agent({ keepAlive: false }) as XHROptions['agent'],
  })
  const noDelay = { delay: async () => {} }

  it('reproduces the lost code in real xhr and restores ECONNRESET', async () => {
    attempts = 0
    await assert.rejects(requestWithRetry(() => xhr(options('/reset')), {
      delay: async () => assert.fail('raw xhr unexpectedly preserved the retryable error'),
    }), error => {
      assert.equal((error as any).status, 404)
      assert.equal((error as any).code, undefined)
      assert.match((error as any).responseText, /socket hang up/)
      return true
    })
    assert.equal(attempts, 1)
    await assert.rejects(requestSchema(options('/reset')), error => {
      assert.equal((error as any).status, 404)
      assert.equal((error as any).code, 'ECONNRESET')
      return true
    })
  })

  it('retries real connection resets and recovers on the third attempt', async () => {
    attempts = 0
    const response = await requestWithRetry(() => requestSchema(options('/recover')), noDelay)
    assert.equal(response.responseText, '{}')
    assert.equal(attempts, 3)
  })

  it('bounds retries and preserves the final reset error', async () => {
    attempts = 0
    await assert.rejects(requestWithRetry(() => requestSchema(options('/reset')), noDelay), error => {
      assert.equal((error as any).code, 'ECONNRESET')
      assert.equal((error as any).status, 404)
      assert.match((error as any).responseText, /socket hang up/)
      return true
    })
    assert.equal(attempts, 3)
  })

  it('restores a reset that occurs while reading the response', async () => {
    attempts = 0
    await assert.rejects(requestWithRetry(() => requestSchema(options('/aborted')), noDelay), error => {
      assert.equal((error as any).code, 'ECONNRESET')
      assert.equal((error as any).status, 500)
      assert.equal((error as any).body.toString(), '{')
      return true
    })
    assert.equal(attempts, 3)
  })

  it('does not retry actual HTTP 404 or 500 responses that resemble network errors', async () => {
    for (const path of ['/404', '/500']) {
      attempts = 0
      await assert.rejects(requestWithRetry(() => requestSchema(options(path)), {
        delay: async () => assert.fail('unexpected retry of an HTTP error'),
      }), error => {
        assert.equal((error as any).status, Number(path.slice(1)))
        assert.equal((error as any).code, undefined)
        return true
      })
      assert.equal(attempts, 1)
    }
  })
})

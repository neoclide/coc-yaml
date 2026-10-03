import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getRetryDelay, isRetryableError, parseRetryAfter, requestWithRetry } from '../src/schema-request-retry'

describe('schema request retries', () => {
  it('retries temporary failures at most twice and returns a successful result', async () => {
    let attempts = 0
    const delays: number[] = []
    const result = await requestWithRetry(async () => {
      if (++attempts < 3) throw { status: 503, headers: { 'retry-after': '8' } }
      return 'schema'
    }, { delay: async ms => { delays.push(ms) } })
    assert.equal(result, 'schema')
    assert.equal(attempts, 3)
    assert.deepEqual(delays, [1000, 1000])
  })

  it('preserves the final error after retry exhaustion', async () => {
    const error = { code: 'ECONNRESET' }
    let attempts = 0
    await assert.rejects(requestWithRetry(async () => { attempts++; throw error }, { delay: async () => {} }), value => value === error)
    assert.equal(attempts, 3)
  })

  it('does not retry 304, 404 or non-network errors', async () => {
    for (const error of [{ status: 304 }, { status: 404 }, new Error('invalid schema')]) {
      let attempts = 0
      await assert.rejects(requestWithRetry(async () => { attempts++; throw error }, { delay: async () => assert.fail('unexpected delay') }), value => value === error)
      assert.equal(attempts, 1)
    }
  })

  it('recognizes retryable statuses and parses bounded retry-after values', () => {
    for (const status of [429, 502, 503, 504]) assert.equal(isRetryableError({ status }), true)
    assert.equal(parseRetryAfter({ 'Retry-After': '2' }, 0), 2000)
    assert.equal(parseRetryAfter({ 'retry-after': 'Thu, 01 Jan 1970 00:00:01 GMT' }, 0), 1000)
    assert.equal(parseRetryAfter({ 'retry-after': '-1' }, 0), undefined)
    assert.equal(getRetryDelay({ headers: { 'retry-after': '999' } }, 0), 1000)
  })
})

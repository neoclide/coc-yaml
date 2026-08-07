import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildDisabledSelector, buildExcludedSelector } from '../src/disabled-patterns'

describe('disabled patterns', () => {
  it('builds a selector from positive patterns and ignores negation patterns', () => {
    assert.deepEqual(buildDisabledSelector(['**/*.yaml', '!**/values.yaml', '']), [
      { pattern: '**/*.yaml' },
    ])
  })

  it('extracts negation patterns', () => {
    assert.deepEqual(buildExcludedSelector(['**/*.yaml', '!**/values.yaml', '!']), [
      { pattern: '**/values.yaml' },
    ])
  })
})

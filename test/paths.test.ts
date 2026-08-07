import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Uri } from 'coc.nvim'
import { joinPath, normalizePath } from '../src/paths'

describe('paths', () => {
  it('normalizes dot segments', () => {
    assert.equal(normalizePath(['a', '.', 'b']), 'a/b')
    assert.equal(normalizePath(['a', '..', 'b']), 'b')
    assert.equal(normalizePath(['a', 'b', '..']), 'a')
    assert.equal(normalizePath(['', 'a', 'b']), '/a/b')
  })

  it('joins relative paths onto a uri', () => {
    const uri = Uri.file('/home/user/project/yaml/foo.yaml')
    assert.equal(joinPath(uri, '../bar.yaml').path, '/home/user/project/yaml/bar.yaml')
    assert.equal(joinPath(uri, 'sub', 'baz.yaml').path, '/home/user/project/yaml/foo.yaml/sub/baz.yaml')
  })
})

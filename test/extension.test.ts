import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { commands, services, workspace, type Document } from 'coc.nvim'
import extension from '../lib/index.js'

beforeEach(async () => {
  await workspace.nvim.command('enew!')
})

describe('coc-yaml extension', () => {
  it('loads the extension module', () => {
    assert.equal(typeof extension.activate, 'function')
  })

  it('registers the yaml.selectSchema command', () => {
    assert.equal(commands.has('yaml.selectSchema'), true)
  })

  it('registers the yaml language service', () => {
    const service = services.getService('yaml')
    assert.ok(service)
    assert.equal(service.id, 'yaml')
    assert.ok(service.client)
  })

  it('communicates with the editor', async () => {
    assert.equal(await workspace.nvim.eval('1 + 1'), 2)
  })

  it('starts the yaml language client for a yaml document', async () => {
    const service = services.getService('yaml')
    assert.ok(service.client)
    await workspace.nvim.command('enew!')
    const doc = await waitForCurrentDocument()
    // The coc.nvim test vimrc does not enable filetype detection, set it
    // explicitly so the document opens with languageId "yaml" in both Vim
    // and Neovim. Wait for the document to exist first: a FileType event that
    // arrives before the buffer document is created is dropped by coc.nvim.
    await workspace.nvim.command('setf yaml')
    await waitForDocumentLanguageId(doc, 'yaml')
    assert.equal(doc.languageId, 'yaml')
    await waitForClientStarted(service.client)
    assert.equal(service.client.started, true)
  })
})

function waitForClientStarted(client: { started: boolean; onReady(): Promise<void> }, timeoutMs = 30000): Promise<void> {
  if (client.started) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('yaml language client did not start in time')), timeoutMs)
    client.onReady().then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

function waitForCurrentDocument(timeoutMs = 15000): Promise<Document> {
  const current = workspace.getDocument(workspace.bufnr)
  if (current) return Promise.resolve(current)
  return new Promise<Document>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('current document did not open in time')), timeoutMs)
    const disposable = workspace.onDidOpenTextDocument(() => {
      const doc = workspace.getDocument(workspace.bufnr)
      if (!doc || doc.bufnr !== workspace.bufnr) return
      clearTimeout(timer)
      disposable.dispose()
      resolve(doc)
    })
  })
}

function waitForDocumentLanguageId(doc: Document, expected: string, timeoutMs = 15000): Promise<void> {
  if (doc.languageId === expected) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`document languageId did not become ${expected}`)), timeoutMs)
    const disposable = workspace.onDidOpenTextDocument(() => {
      if (doc.languageId !== expected) return
      clearTimeout(timer)
      disposable.dispose()
      resolve()
    })
  })
}

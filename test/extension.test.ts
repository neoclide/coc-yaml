import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, it } from 'node:test'
import { commands, services, Uri, workspace, type Document, type LinesTextDocument } from 'coc.nvim'
import extension from '../lib/index.js'

beforeEach(async () => {
  await workspace.nvim.command('enew!')
})

describe('coc-yaml extension', () => {
  it('loads the extension module', () => {
    assert.equal(typeof extension.activate, 'function')
  })

  it('registers yaml commands', () => {
    assert.equal(commands.has('yaml.selectSchema'), true)
    assert.equal(commands.has('yaml.jumpToSchema'), true)
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

  it('opens the schema of the current yaml document', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'coc-yaml-jump-'))
    const schemaFile = path.join(dir, 'schema.json')
    const yamlFile = path.join(dir, 'deploy.yaml')
    const schemaUri = Uri.file(schemaFile).toString()
    fs.writeFileSync(schemaFile, '{"type":"object","properties":{"version":{"type":"string"}}}\n')
    fs.writeFileSync(yamlFile, `# yaml-language-server: $schema=${schemaUri}\nversion: v1.0\n`)
    try {
      const service = services.getService('yaml')
      assert.ok(service.client)
      await waitForClientStarted(service.client)
      await workspace.nvim.command(`edit ${yamlFile}`)
      const doc = await waitForCurrentDocument()
      await workspace.nvim.command('setf yaml')
      await waitForDocumentLanguageId(doc, 'yaml')
      await waitForAttached(doc)
      const schemas = await waitForSchema(service.client, doc.uri)
      assert.ok(schemas.length > 0)

      const opened = waitForDocumentUri(schemaUri)
      await commands.executeCommand('yaml.jumpToSchema')
      const schemaDoc = await opened
      assert.ok(schemaDoc.getText().includes('"type"'))
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
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

function waitForAttached(doc: Document, timeoutMs = 15000): Promise<void> {
  if (doc.attached) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('document did not attach in time')), timeoutMs)
    const disposable = workspace.onDidOpenTextDocument(() => {
      const current = workspace.getDocument(doc.bufnr)
      if (!current || !current.attached) return
      clearTimeout(timer)
      disposable.dispose()
      resolve()
    })
  })
}

function waitForSchema(
  client: { sendRequest(method: string, params?: unknown): Promise<unknown> },
  docUri: string,
  timeoutMs = 15000
): Promise<unknown[]> {
  const startedAt = Date.now()
  return new Promise<unknown[]>((resolve, reject) => {
    const check = async (): Promise<void> => {
      try {
        const schemas = await client.sendRequest('yaml/get/jsonSchema', docUri)
        if (Array.isArray(schemas) && schemas.length > 0) {
          resolve(schemas)
          return
        }
      } catch {
        // Server may not be ready yet.
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('schema did not resolve in time'))
        return
      }
      setTimeout(check, 50)
    }
    void check()
  })
}

function waitForDocumentUri(uri: string, timeoutMs = 15000): Promise<LinesTextDocument> {
  const current = workspace.getDocument(workspace.bufnr)
  if (current && current.uri === uri) return Promise.resolve(current.textDocument)
  return new Promise<LinesTextDocument>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`document ${uri} did not open in time`)), timeoutMs)
    const disposable = workspace.onDidOpenTextDocument(doc => {
      if (doc.uri !== uri) return
      clearTimeout(timer)
      disposable.dispose()
      resolve(doc)
    })
  })
}

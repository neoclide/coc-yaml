import { workspace, disposeAll, RequestType, events, Document, StatusBarItem, window, LanguageClient, Disposable, ExtensionContext } from 'coc.nvim'

type FileUri = string
export interface JSONSchema {
  name?: string
  description?: string
  uri: string
}

// eslint-disable-next-line @typescript-eslint/ban-types
const getSchema: RequestType<FileUri, JSONSchema[], {}> = new RequestType('yaml/get/jsonSchema')

export default class StatusBar implements Disposable {
  private item: StatusBarItem
  private text: string
  private disposables: Disposable[] = []
  private attached = false
  constructor(private client: LanguageClient) {
    this.item = window.createStatusBarItem(99, {})
    let config = workspace.getConfiguration('yaml')
    this.text = config.statusText ?? 'yaml'
    events.on('BufEnter', bufnr => {
      let doc = workspace.getDocument(bufnr)
      if (doc) void this.checkDocument(doc)
    }, null, this.disposables)
    workspace.onDidOpenTextDocument(e => {
      let doc = workspace.getDocument(workspace.bufnr)
      if (doc) void this.checkDocument(doc)
    }, null, this.disposables)
  }

  public init(): void {
    this.attached = true
    let doc = workspace.getDocument(workspace.bufnr)
    if (doc) void this.checkDocument(doc)
  }

  private async checkDocument(doc: Document): Promise<void> {
    if (!doc || !doc.attached || !this.attached) return
    const item = this.item
    if (!this.client.started) {
      item.hide()
      return
    }
    if (doc.languageId === 'yaml') {
      // get schema info there
      const schema = await this.client.sendRequest(getSchema, doc.uri)
      if (workspace.bufnr != doc.bufnr) return
      if (!schema || schema.length === 0) {
        item.text = `${this.text} No JSON Schema`
      } else if (schema.length === 1) {
        item.text = this.text + ' ' + (schema[0].name ?? schema[0].uri)
      } else {
        item.text = `${this.text} Multiple JSON Schemas...`
      }
      item.show()
    } else {
      item.hide()
    }
  }

  public dispose(): void {
    disposeAll(this.disposables)
    this.item.dispose()
  }
}

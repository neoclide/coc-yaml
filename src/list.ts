import { CancellationToken, IList, LanguageClient, ListAction, ListContext, ListItem, RequestType, workspace } from 'coc.nvim'
import { JSONSchema } from './status-item'
import { associateSchemaWithFile, removeFileFromSchemas } from './schema-config'
import style from 'ansi-styles'

interface MatchingJSONSchema extends JSONSchema {
  usedForCurrentFile: boolean
  fromStore: boolean
}

const getJSONSchemas: RequestType<string, MatchingJSONSchema[], {}> = new RequestType('yaml/get/all/jsonSchemas')

function yellow(str: string): string {
  return `${style.yellow.open}${str}${style.yellow.close}`
}

function gray(str: string): string {
  return `${style.gray.open}${str}${style.gray.close}`
}

export default class SchemaList implements IList {
  public readonly description = 'Select associate yaml schema with current file'
  public readonly name = 'yamlschemas'
  public readonly defaultAction = 'choose'
  public actions: ListAction[] = []
  constructor(
    private client: LanguageClient
  ) {
    this.actions.push({
      name: 'choose',
      execute: (item) => {
        const { uri, schema } = (Array.isArray(item) ? item[0] : item).data
        if (!schema) {
          clearSchemaForFile(uri)
          return
        }
        this.update(uri, schema)
      },
      multiple: false
    })
  }

  private update(fileUri: string, schema: JSONSchema): void {
    const settings: Record<string, unknown> = workspace.getConfiguration('yaml').get('schemas') ?? {}
    const newSettings = associateSchemaWithFile(settings, schema.uri, fileUri)
    void workspace.getConfiguration('yaml').update('schemas', newSettings)
  }

  public async loadItems(context: ListContext, token: CancellationToken): Promise<ListItem[]> {
    const { client } = this
    let items: ListItem[] = []
    if (!client.started) {
      throw new Error('yaml language client not running')
    }
    let doc = workspace.getDocument(context.buffer.id)
    if (!doc || !doc.attached) {
      throw new Error('current buffer not attached')
    }
    if (doc.languageId !== 'yaml') {
      throw new Error('current buffer filetype is not yaml')
    }
    const schemas = await client.sendRequest(getJSONSchemas, doc.uri)
    if (token.isCancellationRequested) return
    for (const val of schemas) {
      let label = val.name ?? val.uri
      if (val.usedForCurrentFile) label = yellow(label)
      if (val.description) label = label + ` ${gray(val.description)}`

      const item = {
        label,
        data: {
          schema: val,
          uri: doc.uri
        }
      }
      items.push(item)
    }

    items.sort((a, b) => {
      if (a.data.schema?.usedForCurrentFile) {
        return -1
      }
      if (b.data.schema?.usedForCurrentFile) {
        return 1
      }
      return a.label.localeCompare(b.label)
    })
    items.push({
      label: gray('No schema (disable for current file)'),
      data: {
        schema: null,
        uri: doc.uri
      }
    })
    return items
  }
}

function clearSchemaForFile(fileUri: string): void {
  const settings: Record<string, unknown> = workspace.getConfiguration('yaml').get('schemas') ?? {}
  const newSettings = removeFileFromSchemas(settings, fileUri)
  void workspace.getConfiguration('yaml').update('schemas', newSettings)
}

import { ExtensionContext, extensions, LanguageClient, LanguageClientOptions, ServerOptions, services, TransportKind, workspace } from 'coc.nvim'
import fs from 'fs'
import path from 'path'
import { NotificationType } from 'vscode-jsonrpc'
import { CUSTOM_CONTENT_REQUEST, CUSTOM_SCHEMA_REQUEST, schemaContributor } from './schema-contributor'
import Uri from 'vscode-uri'

export interface ISchemaAssociations {
  [pattern: string]: string[]
}

namespace SchemaAssociationNotification {
  export const type: NotificationType<ISchemaAssociations, any> = new NotificationType('json/schemaAssociations')
}

namespace DynamicCustomSchemaRequestRegistration {
  export const type: NotificationType<{}, {}> = new NotificationType('yaml/registerCustomSchemaRequest')
}

export async function activate(context: ExtensionContext): Promise<void> {
  let { subscriptions } = context
  const config = workspace.getConfiguration('NAME')
  let file = context.asAbsolutePath(path.join('node_modules', 'yaml-language-server', 'out', 'server', 'src', 'server.js'))
  if (!fs.existsSync(file)) {
    file = context.asAbsolutePath(path.join('..', 'yaml-language-server', 'out', 'server', 'src', 'server.js'))
  }
  if (!fs.existsSync(file)) {
    workspace.showMessage(`Can't resolve yarml-language-server`, 'error')
    return
  }

  let serverOptions: ServerOptions = {
    module: file,
    args: ['--node-ipc'],
    transport: TransportKind.ipc,
    options: {
      cwd: workspace.root,
      execArgv: config.get<string[]>('execArgv', [])
    }
  }

  let clientOptions: LanguageClientOptions = {
    documentSelector: [
      { language: 'yaml', scheme: 'file' },
      { language: 'yaml', scheme: 'untitled' }
    ],
    synchronize: {
      // Synchronize the setting section 'languageServerExample' to the server
      configurationSection: ['yaml', 'http.proxy', 'http.proxyStrictSSL'],
      // Notify the server about file changes to '.clientrc files contain in the workspace
      fileEvents: [
        workspace.createFileSystemWatcher('**/*.?(e)y?(a)ml'),
        workspace.createFileSystemWatcher('**/*.json')
      ]
    },
    outputChannelName: 'yaml'
  }

  let client = new LanguageClient('yaml', 'yaml server', serverOptions, clientOptions)

  client.onReady().then(() => {
    client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociation(context))
    client.sendNotification(DynamicCustomSchemaRequestRegistration.type)
    client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource) => {
      return schemaContributor.requestCustomSchema(resource)
    })
    client.onRequest(CUSTOM_CONTENT_REQUEST, (uri) => {
      return schemaContributor.requestCustomSchemaContent(uri)
    })
  }, e => {
    // tslint:disable-next-line:no-console
    console.error(`yaml server start failed: ${e.message}`)
  })

  subscriptions.push(services.registLanguageClient(client))
}

function getSchemaAssociation(_context: ExtensionContext): ISchemaAssociations {
  let associations: ISchemaAssociations = {}
  extensions.all.forEach(extension => {
    let packageJSON = extension.packageJSON
    if (packageJSON && packageJSON.contributes && packageJSON.contributes.yamlValidation) {
      let yamlValidation = packageJSON.contributes.yamlValidation
      if (Array.isArray(yamlValidation)) {
        yamlValidation.forEach(jv => {
          let { fileMatch, url } = jv
          if (fileMatch && url) {
            if (url[0] === '.' && url[1] === '/') {
              url = Uri.file(path.join(extension.extensionPath, url)).toString()
            }
            if (fileMatch[0] === '%') {
              fileMatch = fileMatch.replace(/%APP_SETTINGS_HOME%/, '/User')
              fileMatch = fileMatch.replace(/%APP_WORKSPACES_HOME%/, '/Workspaces')
            } else if (fileMatch.charAt(0) !== '/' && !fileMatch.match(/\w+:\/\//)) {
              fileMatch = '/' + fileMatch
            }
            let association = associations[fileMatch]
            if (!association) {
              association = []
              associations[fileMatch] = association
            }
            association.push(url)
          }
        })
      }
    }
  })
  return associations
}

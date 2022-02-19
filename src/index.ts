/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import path from 'path'
import { workspace, services, window, commands, NotificationType, RequestType, ExtensionContext, Uri, TransportKind, extensions, LanguageClient, LanguageClientOptions, ServerOptions, RevealOutputChannelOn } from 'coc.nvim'
import { CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST, SchemaExtensionAPI } from './schema-extension-api'
import { joinPath } from './paths'
import StatusItem from './status-item'
import { JSONSchemaCache } from './schema-cache'
import { IJSONSchemaCache, getJsonSchemaContent } from './content-provider'
import { promisify } from 'util'
import fs from 'fs'

export interface ISchemaAssociations {
  [pattern: string]: string[]
}

export interface ISchemaAssociation {
  fileMatch: string[]
  uri: string
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SettingIds {
  export const maxItemsComputed = 'yaml.maxItemsComputed'
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace StorageIds {
  export const maxItemsExceededInformation = 'yaml.maxItemsExceededInformation'
}

namespace SchemaAssociationNotification {
  export const type: NotificationType<ISchemaAssociations | ISchemaAssociation[]> = new NotificationType(
    'json/schemaAssociations'
  )
}

namespace FSReadFile {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: RequestType<string, string, {}> = new RequestType('fs/readFile')
}

namespace VSCodeContentRequestRegistration {
  export const type: NotificationType<{}> = new NotificationType('yaml/registerVSCodeContentRequest')
}

namespace VSCodeContentRequest {
  export const type: RequestType<string, string, any> = new RequestType('vscode/content')
}

namespace DynamicCustomSchemaRequestRegistration {
  export const type: NotificationType<{}> = new NotificationType('yaml/registerCustomSchemaRequest')
}

namespace ResultLimitReachedNotification {
  export const type: NotificationType<string> = new NotificationType('yaml/resultLimitReached')
}

export namespace SchemaSelectionRequests {
  export const type: NotificationType<void> = new NotificationType('yaml/supportSchemaSelection')
  export const schemaStoreInitialized: NotificationType<void> = new NotificationType('yaml/schema/store/initialized')
}

export function activate(context: ExtensionContext): SchemaExtensionAPI {
  // The YAML language server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('node_modules', 'yaml-language-server', 'out', 'server', 'src', 'server.js')
  )

  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] }

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
  }

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for on disk and newly created YAML documents
    documentSelector: [{ language: 'yaml' }],
    synchronize: {
      // Notify the server about file changes to YAML and JSON files contained in the workspace
      fileEvents: [workspace.createFileSystemWatcher('**/*.?(e)y?(a)ml'), workspace.createFileSystemWatcher('**/*.json')],
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never,
  }

  // Create the language client and start it
  const client = new LanguageClient('yaml', 'YAML Support', serverOptions, clientOptions)
  // const disposable = client.start()

  const schemaExtensionAPI = new SchemaExtensionAPI(client)
  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(services.registLanguageClient(client))

  const schemaCache = new JSONSchemaCache(context.storagePath, context.globalState, msg => {
    client.outputChannel.appendLine(msg)
  })
  const statusBarItem = new StatusItem(client)
  context.subscriptions.push(statusBarItem)

  client.onReady().then(() => {
    // Send a notification to the server with any YAML schema associations in all extensions
    client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociations())

    // If the extensions change, fire this notification again to pick up on any association changes
    extensions.onDidActiveExtension(() => {
      client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociations())
    })
    extensions.onDidUnloadExtension(() => {
      client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociations())
    })

    // Tell the server that the client supports schema selection requests
    client.sendNotification(SchemaSelectionRequests.type)
    // Tell the server that the client is ready to provide custom schema content
    client.sendNotification(DynamicCustomSchemaRequestRegistration.type)
    // Tell the server that the client supports schema requests sent directly to it
    client.sendNotification(VSCodeContentRequestRegistration.type)
    // If the server asks for custom schema content, get it and send it back
    client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource: string) => {
      return schemaExtensionAPI.requestCustomSchema(resource)
    })
    client.onRequest(CUSTOM_CONTENT_REQUEST, (uri: string) => {
      return schemaExtensionAPI.requestCustomSchemaContent(uri)
    })
    client.onRequest(FSReadFile.type, (fsPath: string) => {
      return promisify(fs.readFile)(fsPath, 'utf8')
    })

    client.onRequest(VSCodeContentRequest.type, (uri: string) => {
      return getJsonSchemaContent(uri, schemaCache)
    })

    client.onNotification(SchemaSelectionRequests.schemaStoreInitialized, () => {
      statusBarItem.init()
    })
    client.onNotification(ResultLimitReachedNotification.type, async (message) => {
      const shouldPrompt = context.globalState.get<boolean>(StorageIds.maxItemsExceededInformation) !== false
      if (shouldPrompt) {
        const ok = 'Ok'
        const openSettings = 'Open Settings'
        const neverAgain = "Don't Show Again"
        const pick = await window.showInformationMessage(
          `${message}\nUse setting '${SettingIds.maxItemsComputed}' to configure the limit.`,
          ok,
          openSettings,
          neverAgain
        )
        if (pick === neverAgain) {
          await context.globalState.update(StorageIds.maxItemsExceededInformation, false)
        } else if (pick === openSettings) {
          const { nvim } = workspace
          nvim.command('CocConfig', true)
        }
      }
    })
  })
  return schemaExtensionAPI
}

function getSchemaAssociations(): ISchemaAssociation[] {
  const associations: ISchemaAssociation[] = []
  extensions.all.forEach((extension) => {
    const packageJSON = extension.packageJSON
    if (packageJSON && packageJSON.contributes && packageJSON.contributes.yamlValidation) {
      const yamlValidation = packageJSON.contributes.yamlValidation
      if (Array.isArray(yamlValidation)) {
        yamlValidation.forEach((jv) => {
          // eslint-disable-next-line prefer-const
          let { fileMatch, url } = jv
          if (typeof fileMatch === 'string') {
            fileMatch = [fileMatch]
          }
          if (Array.isArray(fileMatch) && typeof url === 'string') {
            let uri: string = url
            if (uri[0] === '.' && uri[1] === '/') {
              uri = joinPath(Uri.file(extension.extensionPath), uri).toString()
            }
            fileMatch = fileMatch.map((fm) => {
              if (fm[0] === '%') {
                fm = fm.replace(/%APP_SETTINGS_HOME%/, '/User')
                fm = fm.replace(/%MACHINE_SETTINGS_HOME%/, '/Machine')
                fm = fm.replace(/%APP_WORKSPACES_HOME%/, '/Workspaces')
              } else if (!fm.match(/^(\w+:\/\/|\/|!)/)) {
                fm = '/' + fm
              }
              return fm
            })
            associations.push({ fileMatch, uri })
          }
        })
      }
    }
  })
  return associations
}

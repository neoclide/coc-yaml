import { workspace } from 'coc.nvim'
import { xhr, configure as configureHttpRequests, getErrorStatusDescription, XHRResponse } from 'request-light'

export interface IJSONSchemaCache {
  getETag(schemaUri: string): string | undefined
  putSchema(schemaUri: string, eTag: string, schemaContent: string): Promise<void>
  getSchema(schemaUri: string): Promise<string | undefined>
}

export async function getJsonSchemaContent(uri: string, schemaCache: IJSONSchemaCache): Promise<string> {
  const cachedETag = schemaCache.getETag(uri)

  const httpSettings = workspace.getConfiguration('http')
  configureHttpRequests(httpSettings.http && httpSettings.http.proxy, httpSettings.http && httpSettings.http.proxyStrictSSL)

  const headers: { [key: string]: string } = { 'Accept-Encoding': 'gzip, deflate' }
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag
  }
  return xhr({ url: uri, followRedirects: 5, headers })
    .then(async (response) => {
      // cache only if server supports 'etag' header
      const etag = response.headers['etag']
      if (typeof etag === 'string') {
        await schemaCache.putSchema(uri, etag, response.responseText)
      }
      return response.responseText
    })
    .then((text) => {
      return text
    })
    .catch(async (error: XHRResponse) => {
      // content not changed, return cached
      if (error.status === 304) {
        const content = await schemaCache.getSchema(uri)
        // ensure that we return content even if cache doesn't have it
        if (content === undefined) {
          console.error(`Cannot read cached content for: ${uri}, trying to load again`)
          delete headers['If-None-Match']
          return xhr({ url: uri, followRedirects: 5, headers })
            .then((response) => {
              return response.responseText
            })
            .catch((err: XHRResponse) => {
              return createReject(err)
            })
        }
        return content
      }
      // in case of some error, like internet connection issue, check if cached version exist and return it
      if (schemaCache.getETag(uri)) {
        const content = schemaCache.getSchema(uri)
        if (content) {
          return content
        }
      }
      return createReject(error)
    })
}

function createReject(error: XHRResponse): Promise<string> {
  return Promise.reject(error.responseText || getErrorStatusDescription(error.status) || error.toString())
}

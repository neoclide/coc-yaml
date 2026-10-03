import { xhr, type XHROptions, type XHRResponse } from 'request-light'

/** Preserve request-light's response shape while restoring retryable Node errors. */
export async function requestSchema(options: XHROptions): Promise<XHRResponse> {
  try {
    return await xhr(options)
  } catch (error) {
    const response = error as XHRResponse & { code?: string }
    // request-light discards the original error, replacing it with a synthetic
    // 404 (connection) or 500 (stream) response. Real HTTP responses, including
    // ones whose bodies look like error messages, always have matching body/text.
    if (response && !response.code && (response.status === 404 || response.status === 500)
      && response.headers && Object.keys(response.headers).length === 0
      && Buffer.isBuffer(response.body) && typeof response.responseText === 'string'
      && response.body.toString() !== response.responseText) {
      const delimiter = '. Error: '
      const start = response.responseText.lastIndexOf(delimiter)
      const message = start < 0 ? undefined : response.responseText.slice(start + delimiter.length)
      if (message === 'socket hang up' || message === 'aborted') {
        response.code = 'ECONNRESET'
      } else if (message) {
        // Node's network messages start with an optional syscall and an error
        // code. Do not infer a code from a URL or other arbitrary message text.
        const code = /^(?:\w+ )?(E[A-Z_]+)\b/.exec(message)?.[1]
        if (code) response.code = code
      }
    }
    throw error
  }
}

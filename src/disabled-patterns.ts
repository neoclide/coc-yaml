import { workspace, type LinesTextDocument } from 'coc.nvim'

export interface DocumentPattern {
  pattern: string
}

/**
 * Patterns that disable the yaml language server for matching documents.
 * `!`-prefixed patterns exclude documents from an earlier pattern.
 */
export function buildDisabledSelector(patterns: string[]): DocumentPattern[] {
  return patterns
    .filter(p => typeof p === 'string' && p.length > 0 && !p.startsWith('!'))
    .map(p => ({ pattern: p }))
}

export function buildExcludedSelector(patterns: string[]): DocumentPattern[] {
  return patterns
    .filter(p => typeof p === 'string' && p.startsWith('!') && p.length > 1)
    .map(p => ({ pattern: p.slice(1) }))
}

/**
 * Whether the yaml language server should be disabled for a document.
 * The server is disabled when the document matches at least one pattern and no
 * `!`-prefixed exclusion pattern.
 */
export function isDisabledByPatterns(patterns: string[], document: LinesTextDocument): boolean {
  const positive = buildDisabledSelector(patterns)
  if (positive.length === 0) return false
  if (!positive.some(selector => workspace.match(selector, document) > 0)) return false
  const excluded = buildExcludedSelector(patterns)
  return !excluded.some(selector => workspace.match(selector, document) > 0)
}

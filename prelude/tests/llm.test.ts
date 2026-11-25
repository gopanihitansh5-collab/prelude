import { describe, expect, it } from 'vitest'
import { extractJsonObject, llmConfigured, resolveLlmConfig } from '../src/lib/llm.ts'

describe('resolveLlmConfig', () => {
  it('returns null when no key is set', () => {
    expect(resolveLlmConfig({})).toBeNull()
  })

  it('defaults to TokenRouter and the flash model', () => {
    const config = resolveLlmConfig({ LLM_API_KEY: 'k' })
    expect(config).toEqual({
      baseUrl: 'https://api.tokenrouter.com/v1',
      apiKey: 'k',
      model: 'deepseek/deepseek-v4.1-flash-1017-free',
    })
  })

  it('prefers LLM_* over the legacy OPENROUTER_API_KEY', () => {
    const config = resolveLlmConfig({ LLM_API_KEY: 'new', OPENROUTER_API_KEY: 'old' })
    expect(config?.apiKey).toBe('new')
  })

  it('falls back to the legacy key when LLM_API_KEY is absent', () => {
    expect(resolveLlmConfig({ OPENROUTER_API_KEY: 'old' })?.apiKey).toBe('old')
  })

  it('strips trailing slashes from the base url', () => {
    const config = resolveLlmConfig({ LLM_API_KEY: 'k', LLM_BASE_URL: 'https://x.test/v1///' })
    expect(config?.baseUrl).toBe('https://x.test/v1')
  })

  it('honours a custom model', () => {
    expect(resolveLlmConfig({ LLM_API_KEY: 'k', LLM_MODEL: 'other/model' })?.model).toBe('other/model')
  })
})

describe('llmConfigured', () => {
  it('is false without a key and true with one', () => {
    expect(llmConfigured({})).toBe(false)
    expect(llmConfigured({ LLM_API_KEY: 'k' })).toBe(true)
  })
})

describe('extractJsonObject', () => {
  it('parses a bare object', () => {
    expect(extractJsonObject('{"action":"reply","text":"hi"}')).toEqual({ action: 'reply', text: 'hi' })
  })

  it('parses an object wrapped in prose', () => {
    expect(extractJsonObject('Sure! Here you go: {"a":1} hope that helps')).toEqual({ a: 1 })
  })

  it('parses an object inside a fenced block', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it('handles nested objects', () => {
    expect(extractJsonObject('{"a":{"b":{"c":2}}}')).toEqual({ a: { b: { c: 2 } } })
  })

  it('does not stop at a brace inside a string', () => {
    expect(extractJsonObject('{"text":"a } b"}')).toEqual({ text: 'a } b' })
  })

  it('handles an escaped quote inside a string', () => {
    expect(extractJsonObject('{"text":"say \\"hi\\""}')).toEqual({ text: 'say "hi"' })
  })

  it('returns null for no object', () => {
    expect(extractJsonObject('no json here')).toBeNull()
  })

  it('returns null for malformed json', () => {
    expect(extractJsonObject('{"a":')).toBeNull()
  })

  it('returns null for a top-level array', () => {
    expect(extractJsonObject('[1,2,3]')).toBeNull()
  })
})

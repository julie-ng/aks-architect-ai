import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleChatError } from './handle-chat-error'

// Mock Nitro's createError global
const createErrorMock = vi.fn((opts) => {
  const err = new Error(opts.statusMessage) as Error & { statusCode: number, data?: unknown }
  err.statusCode = opts.statusCode
  err.data = opts.data
  return err
})

vi.stubGlobal('createError', createErrorMock)

const baseConfig = {
  provider: 'ollama',
  azureEndpoint: 'https://my-azure.openai.azure.com',
  ollamaHost: 'http://localhost:11434',
  retrievalApiHost: 'http://localhost:8000',
  appEnvironment: 'production',
}

describe('handleChatError', () => {
  beforeEach(() => {
    createErrorMock.mockClear()
  })

  it('re-throws errors that already have a statusCode', () => {
    const existing = { statusCode: 400, message: 'Bad Request' }
    expect(() => handleChatError(existing, baseConfig)).toThrow()
    expect(createErrorMock).not.toHaveBeenCalled()
  })

  it('throws 502 for fetch-related errors (retrieval API down)', () => {
    const fetchError = new Error('fetch failed')
    expect(() => handleChatError(fetchError, baseConfig)).toThrow()
    expect(createErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 502,
        statusMessage: 'Retrieval service unavailable',
      }),
    )
  })

  it('throws 500 for unknown errors in production (no details)', () => {
    const unknownError = new Error('something broke')
    expect(() => handleChatError(unknownError, baseConfig)).toThrow()
    expect(createErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      }),
    )
    const callArg = createErrorMock.mock.calls[0][0]
    expect(callArg.data).toBeUndefined()
  })

  it('includes error details in development mode', () => {
    const devConfig = { ...baseConfig, appEnvironment: 'development' }
    const unknownError = new Error('something broke')
    expect(() => handleChatError(unknownError, devConfig)).toThrow()
    const callArg = createErrorMock.mock.calls[0][0]
    expect(callArg.data).toEqual({ error: 'something broke' })
  })
})

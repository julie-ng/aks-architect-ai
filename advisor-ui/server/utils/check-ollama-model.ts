/**
 * Verifies that an Ollama model is available before streaming.
 * Throws a Nitro `createError()` with a 502 status if the host is
 * unreachable or the model is not found.
 */
export async function checkOllamaModel (host: string, model: string): Promise<void> {
  let res
  try {
    res = await $fetch.raw(`${host}/api/show`, {
      method: 'POST',
      body: { model },
      ignoreResponseError: true,
    })
  }
  catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'LLM host unreachable',
      data: { error: `Cannot connect to model at ${host}. Is it running?` },
    })
  }
  if (res.status === 404) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Model not found',
      data: { error: `Model "${model}" not found on ${host}.` },
    })
  }
  if (!res.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'LLM provider error',
      data: { error: `LLM provider returned ${res.status} at ${host}. Is it running?` },
    })
  }
}

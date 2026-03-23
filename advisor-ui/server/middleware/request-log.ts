export default defineEventHandler((event) => {
  // Only log /api routes
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api')) return

  const method = event.method
  const start = Date.now()

  event.node.res.on('finish', () => {
    const duration = Date.now() - start
    const status = event.node.res.statusCode

    logger.info({
      method,
      path,
      status,
      duration,
    })
  })
})

export default defineEventHandler(async (event) => {
  const entries = await queryCollection(event, 'requirements')
    .select('id', 'title', 'meta', 'spec', 'path', 'navigation', 'stem')
    .all()
  return entries
})

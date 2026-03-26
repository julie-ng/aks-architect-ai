export default defineNuxtPlugin(() => {
  document.addEventListener('click', (e) => {
    const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    if (anchor.hostname !== window.location.hostname) {
      e.preventDefault()
      window.open(anchor.href, '_blank', 'noopener')
    }
  })
})

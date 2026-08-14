export default (request: Request): Response => {
  return new Response('Service ready. Try /img/300x200', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}

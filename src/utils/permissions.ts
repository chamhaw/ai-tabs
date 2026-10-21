/** Request only the user-configured endpoint's origin, during the save click. */
export async function requestEndpointPermission(endpoint: string): Promise<boolean> {
  const url = new URL(endpoint.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Endpoint must use HTTP or HTTPS');
  return chrome.permissions.request({ origins: [`${url.protocol}//${url.hostname}/*`] });
}

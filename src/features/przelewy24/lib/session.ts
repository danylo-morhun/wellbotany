// P24 needs a fresh sessionId for every payment attempt. The first attempt uses
// the order number; a retry appends "-p<base36 ms>" so the notification still
// leads back to the order.
const RETRY_SUFFIX = /-p[0-9a-z]+$/;

export function retrySessionId(orderNumber: string, now = Date.now()): string {
  return `${orderNumber}-p${now.toString(36)}`;
}

export function orderNumberFromSession(sessionId: string): string {
  return sessionId.replace(RETRY_SUFFIX, "");
}

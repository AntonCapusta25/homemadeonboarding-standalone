/**
 * Meta Conversions API (CAPI) tracking utility
 */

const CAPI_ENDPOINT = 'https://metacapi3.vercel.app/api/meta-capi';

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

function getTrackingParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    fbp: urlParams.get('fbp') || getCookie('_fbp'),
    fbc: urlParams.get('fbc') || getCookie('_fbc'),
  };
}

function generateEventId(eventName: string): string {
  return eventName.toLowerCase() + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function sendCapiEvent(eventName: string, eventId: string, additionalData: Record<string, unknown> = {}) {
  const trackingParams = getTrackingParams();
  
  const payload = {
    eventName,
    eventSourceUrl: window.location.href,
    fbp: trackingParams.fbp,
    fbc: trackingParams.fbc,
    userAgent: navigator.userAgent,
    eventId,
    ...additionalData,
  };

  try {
    const response = await fetch(CAPI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('CAPI Response:', result);
    return result;
  } catch (error) {
    console.error('CAPI Error:', error);
    return null;
  }
}

export function trackMetaCapiEvent(eventName: string, additionalData: Record<string, unknown> = {}) {
  const eventId = generateEventId(eventName);
  
  // Fire browser pixel event with deduplication ID
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, {}, { eventID: eventId });
    console.log('Pixel event fired:', eventName, eventId);
  }
  
  // Fire CAPI event with same deduplication ID
  sendCapiEvent(eventName, eventId, additionalData);
}

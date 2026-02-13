const MATON_API_KEY = process.env.MATON_API_KEY
const GATEWAY_URL = 'https://gateway.maton.ai'

export async function matonFetch(appName: string, path: string, options: RequestInit = {}) {
  if (!MATON_API_KEY) {
    throw new Error('MATON_API_KEY non configurée')
  }

  const url = `${GATEWAY_URL}/${appName}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${MATON_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    let message: string
    try {
      const json = JSON.parse(text)
      message = json.error?.message || json.message || text
    } catch {
      message = text
    }
    throw new Error(`Maton ${appName} error ${res.status}: ${message}`)
  }

  return res.json()
}

// Gmail helpers
export const gmail = {
  listMessages: (query = '', maxResults = 20) =>
    matonFetch('google-mail', `/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`),

  getMessage: (id: string) =>
    matonFetch('google-mail', `/gmail/v1/users/me/messages/${id}?format=full`),

  getProfile: () =>
    matonFetch('google-mail', '/gmail/v1/users/me/profile'),
}

// Calendar helpers
export const calendar = {
  listEvents: (timeMin?: string, timeMax?: string, maxResults = 50) => {
    const params = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', maxResults: String(maxResults) })
    if (timeMin) params.set('timeMin', timeMin)
    if (timeMax) params.set('timeMax', timeMax)
    return matonFetch('google-calendar', `/calendar/v3/calendars/primary/events?${params}`)
  },

  getEvent: (id: string) =>
    matonFetch('google-calendar', `/calendar/v3/calendars/primary/events/${id}`),

  createEvent: (event: { summary: string; description?: string; start: { dateTime: string; timeZone?: string }; end: { dateTime: string; timeZone?: string }; attendees?: { email: string }[] }) =>
    matonFetch('google-calendar', '/calendar/v3/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  updateEvent: (id: string, event: Record<string, unknown>) =>
    matonFetch('google-calendar', `/calendar/v3/calendars/primary/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(event),
    }),

  deleteEvent: (id: string) =>
    matonFetch('google-calendar', `/calendar/v3/calendars/primary/events/${id}`, {
      method: 'DELETE',
    }),
}

// Drive helpers
export const drive = {
  listFiles: (query = '', pageSize = 30) => {
    const params = new URLSearchParams({
      pageSize: String(pageSize),
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink,parents)',
      orderBy: 'modifiedTime desc',
    })
    if (query) params.set('q', query)
    return matonFetch('google-drive', `/drive/v3/files?${params}`)
  },

  getFile: (id: string) =>
    matonFetch('google-drive', `/drive/v3/files/${id}?fields=*`),

  createFolder: (name: string, parentId?: string) =>
    matonFetch('google-drive', '/drive/v3/files', {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    }),
}

// Google Docs helpers
export const docs = {
  getDocument: (id: string) =>
    matonFetch('google-docs', `/v1/documents/${id}`),

  createDocument: (title: string) =>
    matonFetch('google-docs', '/v1/documents', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  batchUpdate: (id: string, requests: unknown[]) =>
    matonFetch('google-docs', `/v1/documents/${id}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    }),
}

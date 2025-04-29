addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// Simpan token di environment variable
const validTokens = ['TOKEN_RAHASIA_1', 'TOKEN_RAHASIA_2']

async function handleRequest(request) {
  if (request.method === 'POST') {
    const { subdomain, ip, token } = await request.json()
    
    // 1. Cek token
    if (!validTokens.includes(token)) {
      return responseError('Token tidak valid!')
    }
    
    // 2. Validasi input
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return responseError('Subdomain hanya boleh huruf kecil, angka, dan dash')
    }
    
    // 3. Create DNS record
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'A',
          name: subdomain,
          content: ip,
          ttl: 1,
          proxied: false
        })
      }
    )
    
    const data = await response.json()
    return new Response(JSON.stringify({
      success: data.success,
      error: data.errors?.[0]?.message
    }))
  }
  
  return new Response('OK')
}

function responseError(message) {
  return new Response(JSON.stringify({ success: false, error: message }))
}

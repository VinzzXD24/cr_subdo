const { firestore } = require('./firebase-admin');
const axios = require('axios');

module.exports = async (req, res) => {
  // Validasi method
  if(req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subdomain, ip, token } = req.body;

    // 1. Validasi Input
    if(!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.status(400).json({ error: 'Subdomain hanya boleh huruf kecil, angka, dan dash' });
    }

    if(!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
      return res.status(400).json({ error: 'Format IP tidak valid' });
    }

    // 2. Cek Token di Firebase
    const tokenRef = firestore.collection('tokens').doc(token);
    const tokenDoc = await tokenRef.get();
    
    if(!tokenDoc.exists) {
      return res.status(401).json({ error: 'Token tidak valid' });
    }

    if(tokenDoc.data().used) {
      return res.status(401).json({ error: 'Token sudah digunakan' });
    }

    // 3. Create Subdomain via Vercel API
    const response = await axios.post(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
      {
        name: `${subdomain}.${process.env.ROOT_DOMAIN}`, // Contoh: dev.domainku.com
        redirect: ip,
        zoneId: process.env.CLOUDFLARE_ZONE_ID
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 4. Tandai Token sebagai Used
    await tokenRef.update({
      used: true,
      subdomain: `${subdomain}.${process.env.ROOT_DOMAIN}`,
      createdAt: new Date().toISOString()
    });

    res.status(200).json({
      message: 'Subdomain created successfully',
      record: response.data
    });

  } catch(error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data?.error?.message || 'Internal server error' 
    });
  }
};

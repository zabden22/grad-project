const https = require('https');
const url = 'https://jajoznoeoewigkpbuzzx.supabase.co/rest/v1/admins';
const options = {
    method: 'PATCH',
    headers: {
        'apikey': 'sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE',
        'Authorization': 'Bearer sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE',
        'Content-Type': 'application/json'
    }
};
const req = https.request(url, options, (res) => {
    console.log('Update Status:', res.statusCode);
});
req.on('error', (err) => console.log('Error:', err));
req.write(JSON.stringify({ status: 'active' }));
req.end();

const https = require('https');
const url = 'https://jajoznoeoewigkpbuzzx.supabase.co/rest/v1/admins';
const options = {
    headers: {
        'apikey': 'sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE',
        'Authorization': 'Bearer sb_publishable_zNYeNGu6L5zd2pi_Eigl4g_LyCdk2uE'
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('DATA:', json.map(a => ({ name: a.full_name, status: a.status })));
        } catch (e) {
            console.log('Error parsing:', data);
        }
    });
}).on('error', (err) => console.log('Error:', err));

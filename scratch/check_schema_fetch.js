const https = require('https');
const url = 'https://jajoznoeoewigkpbuzzx.supabase.co/rest/v1/admins?limit=1';
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
            if (json[0]) {
                console.log('KEYS:', Object.keys(json[0]));
                console.log('SAMPLE:', json[0]);
            } else {
                console.log('No data');
            }
        } catch (e) {
            console.log('Error parsing:', data);
        }
    });
}).on('error', (err) => console.log('Error:', err));

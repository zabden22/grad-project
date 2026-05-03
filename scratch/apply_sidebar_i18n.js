const fs = require('fs');
const path = require('path');

const files = [
    'dashboard.html', 'map.html', 'admins.html', 'buses.html', 
    'drivers.html', 'stations.html', 'tickets.html', 'routes.html', 
    'reports.html', 'users.html', 'settings.html'
];

const mappings = [
    { text: 'Dashboard', key: 'dashboard' },
    { text: 'Live Map', key: 'live_map' },
    { text: 'Admins', key: 'admins' },
    { text: 'Buses', key: 'buses' },
    { text: 'Drivers', key: 'drivers' },
    { text: 'Stations', key: 'stations' },
    { text: 'Tickets', key: 'tickets' },
    { text: 'Routes', key: 'routes' },
    { text: 'Reports', key: 'reports' },
    { text: 'Users', key: 'users' },
    { text: 'Settings', key: 'settings' },
    { text: 'Log Out', key: 'logout' }
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    mappings.forEach(m => {
        // Regex to match a link containing the text and icon, and add data-i18n if not present
        const regex = new RegExp(`(<a [^>]*class="nav-link[^"]*"[^>]*>)(<i [^>]*></i>\\s*${m.text})(</a>)`, 'g');
        content = content.replace(regex, (match, p1, p2, p3) => {
            if (p1.includes('data-i18n=')) return match;
            return `${p1.replace('class="nav-link', `data-i18n="${m.key}" class="nav-link`)}${p2}${p3}`;
        });
    });
    fs.writeFileSync(file, content);
    console.log(`Processed ${file}`);
});

document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#themeToggle, #headerThemeToggle');
        if (btn) {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('siteTheme', newTheme);
            
            const icon = btn.querySelector('i');
            if (icon) {
                if (newTheme === 'dark') {
                    icon.classList.replace('fa-moon', 'fa-sun');
                    icon.style.color = '#f1c40f';
                } else {
                    icon.classList.replace('fa-sun', 'fa-moon');
                    icon.style.color = 'var(--text-main)';
                }
            }
        }
    });

    
    const initialTheme = document.documentElement.getAttribute('data-theme');
    const existingBtns = document.querySelectorAll('#themeToggle, #headerThemeToggle');
    existingBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            if (initialTheme === 'dark') {
                icon.classList.replace('fa-moon', 'fa-sun');
                icon.style.color = '#f1c40f';
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
                icon.style.color = 'var(--text-main)';
            }
        }
    });
});

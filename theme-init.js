document.addEventListener('DOMContentLoaded', () => {
    const adminName = localStorage.getItem('activeAdminName') || 'Admin';
    if (document.getElementById('topBarName')) document.getElementById('topBarName').innerText = adminName;

    const currentTheme = localStorage.getItem('siteTheme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    // Global listener for theme toggle (handles dynamically injected buttons)
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

    // Initial icon sync
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

    // --- NEURAL BACKGROUND LOGIC (Floating Green Particles) ---
    window.injectNeuralBackground = function() {
        const particlesEnabled = localStorage.getItem('particlesEnabled') !== 'false';
        const existingBg = document.querySelector('.neural-bg');
        
        if (!particlesEnabled) {
            if (existingBg) existingBg.remove();
            return;
        }

        const baseColor = '#10b981';
        const rgbColor = '16, 185, 129';

        if (existingBg) {
            const particles = existingBg.querySelectorAll('.neural-particle');
            particles.forEach(p => {
                const glowIntensity = p.dataset.glowIntensity || (Math.random() * 15 + 10);
                const secondaryGlow = glowIntensity * 2;
                const opacity = p.dataset.opacity || (Math.random() * 0.5 + 0.3);
                
                p.style.backgroundColor = baseColor;
                p.style.boxShadow = `0 0 ${glowIntensity}px ${baseColor}, 0 0 ${secondaryGlow}px rgba(${rgbColor}, ${opacity})`;
            });
            return;
        }

        if (!document.getElementById('neural-keyframes')) {
            const style = document.createElement('style');
            style.id = 'neural-keyframes';
            style.innerHTML = `
                @keyframes neuralFloatVar1 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(40px, -60px) scale(1.3); } 66% { transform: translate(-30px, -120px) scale(0.8); } 100% { transform: translate(0, -180px) scale(1); } }
                @keyframes neuralFloatVar2 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(-50px, -50px) scale(1.2); } 66% { transform: translate(40px, -100px) scale(0.9); } 100% { transform: translate(0, -160px) scale(1); } }
                @keyframes neuralFloatVar3 { 0% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -70px) scale(1.1); } 66% { transform: translate(-40px, -140px) scale(0.85); } 100% { transform: translate(0, -200px) scale(1); } }
            `;
            document.head.appendChild(style);
        }

        const bg = document.createElement('div');
        bg.className = 'neural-bg';
        bg.style.position = 'fixed';
        bg.style.inset = '0';
        bg.style.pointerEvents = 'none';
        bg.style.zIndex = '-1';
        bg.style.overflow = 'hidden';
        
        const particleCount = 40;
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'neural-particle';
            p.style.position = 'absolute';
            p.style.borderRadius = '50%';
            
            const size = Math.random() * 10 + 2;
            const animIndex = Math.floor(Math.random() * 3) + 1;
            const duration = (Math.random() * 20 + 25) + 's';
            const delay = (Math.random() * -40) + 's';
            const blur = Math.random() * 2 + 1;
            
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = Math.random() * 100 + 'vw';
            p.style.top = Math.random() * 100 + 'vh';
            p.style.filter = `blur(${blur}px)`;
            p.style.animation = `neuralFloatVar${animIndex} ${duration} linear infinite ${delay}`;
            
            const glowIntensity = (Math.random() * 15 + 10);
            const secondaryGlow = glowIntensity * 2;
            const opacity = (Math.random() * 0.5 + 0.3);
            
            p.dataset.glowIntensity = glowIntensity;
            p.dataset.opacity = opacity;
            
            p.style.backgroundColor = baseColor;
            p.style.boxShadow = `0 0 ${glowIntensity}px ${baseColor}, 0 0 ${secondaryGlow}px rgba(${rgbColor}, ${opacity})`;
            
            bg.appendChild(p);
        }
        
        document.body.appendChild(bg);
    };

    // Initialize background
    window.injectNeuralBackground();
});

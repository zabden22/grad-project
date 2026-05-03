function refreshUserName() {    const savedName = localStorage.getItem('activeAdminName') || 'Moscow Admin';    const nameElements = document.querySelectorAll('.user-info span, #adminNameDisplay, .welcome-msg b');

    nameElements.forEach(el => {        if (el.classList.contains('welcome-msg')) {
            el.innerHTML = `Hello, ${savedName}`;
        } else {
            el.innerText = savedName;
        }
    });
}document.addEventListener('DOMContentLoaded', refreshUserName);
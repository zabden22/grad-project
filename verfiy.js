function handleVerifyAndRedirect() {    const inputs = document.querySelectorAll('.otp-input');
    let fullCode = "";
    inputs.forEach(input => {
        fullCode += input.value;
    });    if (fullCode.length < 6) {
        alert("Please enter the full 6-digit code.");
        return;
    }    localStorage.setItem('otpCode', fullCode);    console.log("Code Verified: ", fullCode);
    alert("Code Verified Successfully!");    window.location.href = "change.html"; 
}document.querySelectorAll('.otp-input').forEach((input, index, array) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && index < array.length - 1) {
            array[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
            array[index - 1].focus();
        }
    });
});
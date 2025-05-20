document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');

    // --- SIMULATED PASSWORDS - DO NOT USE IN PRODUCTION ---
    // In a real application, these would be checked on the backend.
    // The backend would then issue a session token or similar.
    const ADMIN_PASSWORD = "mystery"; // Board member password
    const VIEW_PASSWORD = "mystery";   // Org member password
    // ----------------------------------------------------

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const enteredPassword = passwordInput.value;
            errorMessage.textContent = ''; // Clear previous errors

            // --- SIMULATED LOGIN LOGIC ---
            // In a real app, you'd send 'enteredPassword' to a backend /login endpoint.
            // The backend would validate and respond with success/failure and user role.
            if (enteredPassword === ADMIN_PASSWORD) {
                // Simulate successful admin login
                localStorage.setItem('exodusUserRole', 'admin');
                localStorage.setItem('exodusLoggedIn', 'true');
                window.location.href = 'index.html'; // Redirect to calendar
            } else if (enteredPassword === VIEW_PASSWORD) {
                // Simulate successful view-only login
                localStorage.setItem('exodusUserRole', 'viewer');
                localStorage.setItem('exodusLoggedIn', 'true');
                window.location.href = 'index.html'; // Redirect to calendar
            } else {
                // Simulate failed login
                errorMessage.textContent = 'Invalid password. Please try again.';
                passwordInput.value = ''; // Clear password field
                localStorage.removeItem('exodusUserRole');
                localStorage.removeItem('exodusLoggedIn');
            }
            // --- END SIMULATED LOGIN LOGIC ---
        });
    }

    // Redirect to login if not logged in and trying to access calendar page
    // This check might be better placed in calendar.js or as a general redirect script
    if (!window.location.pathname.endsWith('login.html') && localStorage.getItem('exodusLoggedIn') !== 'true') {
        // window.location.href = 'login.html'; // Uncomment if you want forced redirect
    }
});

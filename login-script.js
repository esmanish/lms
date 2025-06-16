// Login functionality for VR LMS
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const userTypeOptions = document.querySelectorAll('.user-type-option');
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.querySelector('.login-btn');
    const errorMessage = document.getElementById('errorMessage');
    
    let selectedUserType = 'student'; // Default selection
    
    // Credentials
    const credentials = {
        student: { username: 'user', password: 'student' },
        facilitator: { username: 'user', password: 'trainer' }
    };
    
    // User type selection
    userTypeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            userTypeOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Update selected user type
            selectedUserType = this.getAttribute('data-type');
            
            // Clear form
            clearForm();
            hideError();
        });
    });
    
    // Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Enter key handling
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    });
    
    // Login handler
    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // Basic validation
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }
        
        // Show loading state
        setLoadingState(true);
        
        // Simulate authentication delay
        setTimeout(() => {
            authenticateUser(username, password);
        }, 1000);
    }
    
    // Authentication logic
    function authenticateUser(username, password) {
        const userCreds = credentials[selectedUserType];
        
        if (username === userCreds.username && password === userCreds.password) {
            // Successful login
            showSuccess();
            
            // Store user session
            sessionStorage.setItem('userType', selectedUserType);
            sessionStorage.setItem('username', username);
            sessionStorage.setItem('loginTime', new Date().toISOString());
            
            // Redirect to appropriate dashboard
            setTimeout(() => {
                if (selectedUserType === 'student') {
                    window.location.href = 'student-dashboard.html';
                } else {
                    window.location.href = 'facilitator-dashboard.html';
                }
            }, 1500);
            
        } else {
            // Failed login
            setLoadingState(false);
            showError('Invalid username or password');
            
            // Clear password field
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
    
    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(hideError, 5000);
    }
    
    // Hide error message
    function hideError() {
        errorMessage.classList.remove('show');
    }
    
    // Show success state
    function showSuccess() {
        setLoadingState(false);
        loginBtn.style.background = 'var(--success)';
        loginBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Login Successful
        `;
    }
    
    // Loading state management
    function setLoadingState(isLoading) {
        if (isLoading) {
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
        } else {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    }
    
    // Clear form
    function clearForm() {
        usernameInput.value = '';
        passwordInput.value = '';
        hideError();
    }
    
    // Auto-fill demo credentials (for development/demo purposes)
    function autoFillCredentials() {
        const userCreds = credentials[selectedUserType];
        usernameInput.value = userCreds.username;
        passwordInput.value = userCreds.password;
    }
    
    // Double-click on user type to auto-fill (development helper)
    userTypeOptions.forEach(option => {
        option.addEventListener('dblclick', function() {
            autoFillCredentials();
        });
    });
    
    // Check if user is already logged in
    function checkExistingSession() {
        const userType = sessionStorage.getItem('userType');
        if (userType) {
            // Redirect to appropriate dashboard if session exists
            if (userType === 'student') {
                window.location.href = 'student-dashboard.html';
            } else {
                window.location.href = 'facilitator-dashboard.html';
            }
        }
    }
    
    // Initialize
    checkExistingSession();
    
    // Focus username input on load
    usernameInput.focus();
});
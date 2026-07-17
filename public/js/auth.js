// Run immediately to protect pages
(function() {
  const token = localStorage.getItem('token');
  const path = window.location.pathname;
  const isAuthPage = path.endsWith('index.html') || path.endsWith('signup.html') || path === '/' || path === '';

  // If not logged in and trying to access dashboard/report, redirect to login
  if (!token && !isAuthPage) {
    window.location.href = 'index.html';
    return;
  }

  // Populate header information if elements exist and user is logged in
  if (token) {
    document.addEventListener('DOMContentLoaded', () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const usernameEl = document.getElementById('nav-username');
        const roleEl = document.getElementById('nav-role');

        if (usernameEl) usernameEl.textContent = user.username;
        if (roleEl) {
          roleEl.textContent = user.role === 'admin' ? 'Admin / Municipality' : 'Reporter';
          if (user.role === 'admin') {
            roleEl.classList.add('admin');
          }
        }
      }

      // Logout handler
      const logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = 'index.html';
        });
      }
    });
  }
})();

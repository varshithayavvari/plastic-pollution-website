document.addEventListener('DOMContentLoaded', () => {
  const reportsGrid = document.getElementById('reports-grid');
  const sectionTitle = document.getElementById('section-title');
  const statTotal = document.getElementById('stat-total');
  const statPending = document.getElementById('stat-pending');
  const statCleaned = document.getElementById('stat-cleaned');
  const toast = document.getElementById('toast');

  let currentUser = null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    currentUser = JSON.parse(userStr);
  }

  // Set title based on role
  if (currentUser) {
    if (currentUser.role === 'admin') {
      sectionTitle.textContent = 'All Submitted Waste Issues';
    } else {
      sectionTitle.textContent = 'Your Reported Issues';
    }
  }

  function showToast(message, type = 'success') {
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }

  // Fetch reports from API
  async function fetchReports() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const reports = await response.json();
      updateStatistics(reports);
      renderReportsGrid(reports);

    } catch (err) {
      console.error(err);
      reportsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-circle-exclamation empty-icon" style="color: var(--danger-color);"></i>
          <h3>Error Loading Reports</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  // Update statistics dashboard
  function updateStatistics(reports) {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'Pending').length;
    const cleaned = reports.filter(r => r.status === 'Cleaned').length;

    statTotal.textContent = total;
    statPending.textContent = pending;
    statCleaned.textContent = cleaned;
  }

  // Format timestamp nicely
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Render report list cards
  function renderReportsGrid(reports) {
    if (reports.length === 0) {
      reportsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-folder-open empty-icon"></i>
          <h3>No Reports Found</h3>
          <p>${currentUser?.role === 'admin' 
            ? 'There are currently no reports filed in the system.' 
            : 'You have not reported any waste. Click "New Report" to start!'}</p>
        </div>
      `;
      return;
    }

    reportsGrid.innerHTML = ''; // Clear loading spinner

    reports.forEach(report => {
      const card = document.createElement('div');
      card.className = 'report-card glass-container';

      // Determine status classes
      const statusClass = report.status.toLowerCase();
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;

      // Admin detail rendering (shows phone and reporter name)
      const adminDetailsHTML = currentUser?.role === 'admin' ? `
        <div class="report-reporter">
          <i class="fa-solid fa-user-circle"></i> Reported By: <span>${report.reportedBy?.username || 'Unknown'}</span>
        </div>
        <div class="report-phone">
          <i class="fa-solid fa-phone"></i> Contact Phone: <span>${report.phoneNumber}</span>
        </div>
      ` : `
        <div class="report-phone">
          <i class="fa-solid fa-phone"></i> Saved Phone: <span>${report.phoneNumber}</span>
        </div>
      `;

      // Status change button for admin
      let adminActionHTML = '';
      if (currentUser?.role === 'admin') {
        const nextStatus = report.status === 'Pending' ? 'Cleaned' : 'Pending';
        const buttonText = report.status === 'Pending' ? 'Mark Cleaned' : 'Mark Pending';
        const buttonClass = report.status === 'Pending' ? 'btn-status-toggle' : 'btn-status-toggle pending';
        const icon = report.status === 'Pending' ? 'fa-circle-check' : 'fa-clock';

        adminActionHTML = `
          <button class="${buttonClass}" data-id="${report._id}" data-status="${nextStatus}">
            <i class="fa-solid ${icon}"></i> ${buttonText}
          </button>
        `;
      }

      card.innerHTML = `
        <div class="report-image-container">
          <img class="report-image" src="${report.imageUrl}" alt="${report.wasteType} Waste" onerror="this.src='https://placehold.co/400x250/222/00b570?text=Waste+Image+Unavailable'">
          <span class="status-badge ${statusClass}">${report.status}</span>
        </div>
        <div class="report-body">
          <div>
            <div class="report-meta">
              <span class="waste-type">${report.wasteType}</span>
              <span class="report-date">${formatDate(report.createdAt)}</span>
            </div>
            ${adminDetailsHTML}
          </div>
          <div class="report-actions">
            <a href="${mapUrl}" target="_blank" class="btn-map">
              <i class="fa-solid fa-map-location-dot"></i> View on Map
            </a>
            ${adminActionHTML}
          </div>
        </div>
      `;

      reportsGrid.appendChild(card);
    });

    // Add status toggle click event listeners for Admins
    if (currentUser?.role === 'admin') {
      const toggleButtons = reportsGrid.querySelectorAll('.btn-status-toggle');
      toggleButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const reportId = btn.getAttribute('data-id');
          const newStatus = btn.getAttribute('data-status');
          await updateReportStatus(reportId, newStatus, btn);
        });
      });
    }
  }

  // Update status function (Admin exclusive)
  async function updateReportStatus(id, status, button) {
    const token = localStorage.getItem('token');
    if (!token) return;

    button.disabled = true;
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update report status');
      }

      showToast(`Status updated to ${status}!`, 'success');
      
      // Reload reports to refresh metrics and UI
      await fetchReports();

    } catch (err) {
      showToast(err.message, 'error');
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  }

  // Load dashboard items
  fetchReports();
});

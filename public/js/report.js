document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const imagePreview = document.getElementById('image-preview');
  const uploadInstruction = document.getElementById('upload-instruction');
  const btnGetLocation = document.getElementById('btn-get-location');
  const geoStatus = document.getElementById('geo-status');
  const latitudeInput = document.getElementById('latitude');
  const longitudeInput = document.getElementById('longitude');
  const reportForm = document.getElementById('report-form');
  const submitBtn = document.getElementById('btn-submit-report');
  const toast = document.getElementById('toast');

  // Helper to show toasts
  function showToast(message, type = 'success') {
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }

  // --- Image Upload Drag & Drop & Click Handling ---
  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFilePreview(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFilePreview(fileInput.files[0]);
    }
  });

  function handleFilePreview(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file!', 'error');
      fileInput.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit!', 'error');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
      uploadInstruction.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  // --- HTML5 Geolocation Handling ---
  btnGetLocation.addEventListener('click', () => {
    if (!navigator.geolocation) {
      geoStatus.className = 'geo-status error';
      geoStatus.textContent = 'Geolocation not supported by your browser';
      showToast('Geolocation not supported by browser', 'error');
      return;
    }

    geoStatus.className = 'geo-status';
    geoStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching location...';
    btnGetLocation.disabled = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy.toFixed(1);

        latitudeInput.value = lat.toFixed(6);
        longitudeInput.value = lng.toFixed(6);

        geoStatus.className = 'geo-status success';
        geoStatus.innerHTML = `<i class="fa-solid fa-check-circle"></i> Accuracy: ±${accuracy}m`;
        btnGetLocation.disabled = false;
        showToast('Location fetched successfully!', 'success');
      },
      (error) => {
        console.error(error);
        geoStatus.className = 'geo-status error';
        btnGetLocation.disabled = false;
        
        let msg = 'Failed to fetch location';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please enter manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location position unavailable. Please enter manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location fetch timeout. Please enter manually.';
        }
        
        geoStatus.textContent = msg;
        showToast(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });

  // --- Form Submit Handling ---
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Authentication required. Log in again.', 'error');
      return;
    }

    // Verify fields
    const file = fileInput.files[0];
    const lat = latitudeInput.value.trim();
    const lng = longitudeInput.value.trim();
    const wasteType = document.getElementById('waste-type').value;
    const phone = document.getElementById('phone-number').value.trim();

    if (!file) {
      showToast('Please upload an image!', 'error');
      return;
    }
    if (!lat || !lng) {
      showToast('Latitude and Longitude are required!', 'error');
      return;
    }
    if (!wasteType) {
      showToast('Please select a waste category!', 'error');
      return;
    }
    if (!phone) {
      showToast('Please enter a phone number!', 'error');
      return;
    }

    // Prepare Multipart Form Data
    const formData = new FormData();
    formData.append('image', file);
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('wasteType', wasteType);
    formData.append('phoneNumber', phone);

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Report...';

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Submission failed');
      }

      showToast('Report submitted successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);

    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right: 0.5rem;"></i> Submit Waste Report';
    }
  });
});

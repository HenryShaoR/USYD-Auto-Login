document.addEventListener('DOMContentLoaded', function() {
  const title = document.getElementById('title');
  const passwordInput = document.getElementById('password');
  const qrUpload = document.getElementById('qr-upload');
  const qrPreview = document.getElementById('qr-preview');
  const totpSecretEl = document.getElementById('totp-secret');
  const saveButton = document.getElementById('save-btn');
  const statusMessage = document.getElementById('status-message');
  const totpDisplay = document.getElementById('totp-display');
  const totpCodeEl = document.getElementById('totp-code');
  const totpTimerProgress = document.getElementById('totp-timer-progress');
  const totpSecondsEl = document.getElementById('totp-seconds');
  
  let totpSecret = null;
  let totpUpdateInterval = null;

  // Load saved credentials
  chrome.storage.sync.get(['uniKey', 'password', 'totpSecret'], function(data) {
    if (data.uniKey) title.innerText = `hello, ${data.uniKey}`.toUpperCase();
    if (data.totpSecret) {
      totpSecret = data.totpSecret;
      totpSecretEl.textContent = 'TOTP Secret: ' + ((data.totpSecret.length > 4) ? (data.totpSecret.slice(0, 2) + "*".repeat(data.totpSecret.length - 4) + data.totpSecret.slice(-2)) : "*".repeat(data.totpSecret.length - 1) + data.totpSecret.slice(-1));
      totpSecretEl.style.display = 'block';
      
      // Start displaying the TOTP
      startTOTPDisplay();
    }
  });

  // Handle QR code upload
  qrUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      qrPreview.src = event.target.result;
      qrPreview.style.display = 'block';
      
      // Create an image to process with jsQR
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0, img.width, img.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Decode QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          try {
            // Parse the otpauth URL from the QR code
            const url = new URL(code.data);
            if (url.protocol === 'otpauth:') {
              const params = new URLSearchParams(url.search);
              const secret = params.get('secret');
              const uniKeyMatches = code.data.toLowerCase().match(/otpauth:\/\/totp\/[^:]+:([^?]+)/);
              if (secret && uniKeyMatches) {
                totpSecret = secret;
                totpSecretEl.textContent = 'TOTP Secret: ' + ((secret.length > 4) ? ("*".repeat(secret.length - 4) + secret.slice(-4)) : "*".repeat(secret.length - 1) + secret.slice(-1));
                totpSecretEl.style.display = 'block';

                const uniKey = uniKeyMatches[1];
                title.innerText = `hello, ${uniKey}`.toUpperCase();

                chrome.storage.sync.set({
                  uniKey: uniKey,
                  totpSecret: secret
                });

                showStatus('TOTP info extracted successfully!', 'success');
                
                // Start displaying the TOTP
                startTOTPDisplay();
              }
            }
          } catch (error) {
            showStatus('Failed to parse QR code: ' + error.message, 'error');
          }
        } else {
          showStatus('No QR code found in the image', 'error');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Save credentials
  saveButton.addEventListener('click', function() {
    const password = passwordInput.value.trim();
    
    if (!password) {
      showStatus('Please enter your password', 'error');
      return;
    }
    
    chrome.storage.sync.set({
      password: password
    }, function() {
      showStatus('Credentials saved successfully!', 'success');
    });

    passwordInput.value = '';
  });
  
  // Function to start displaying TOTP codes
  function startTOTPDisplay() {
    if (!totpSecret) return;
    
    // Show the TOTP display area
    totpDisplay.style.display = 'block';
    
    // Clear any existing interval
    if (totpUpdateInterval) {
      clearInterval(totpUpdateInterval);
    }
    
    // Update immediately
    updateTOTP();
    
    // Then update every second
    totpUpdateInterval = setInterval(updateTOTP, 1000);
  }

  // Function to generate TOTP
  function generateTOTP(secret) {
    try {
      // Check if OTPAuth is available
      if (typeof OTPAuth === 'undefined') {
        console.error('OTPAuth library not loaded');
        return 'ERROR';
      }

      // Create a new TOTP instance
      const totp = new OTPAuth.TOTP({
        issuer: 'sso.sydney.edu.au',
        label: 'USYD Login',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
      });

      // Generate the token
      return totp.generate();
    } catch (error) {
      console.error('TOTP generation error:', error);
      return 'ERROR';
    }
  }
  
  // Function to update the TOTP display
  function updateTOTP() {
    if (!totpSecret) return;
    
    try {
      // Generate and display the TOTP code
      totpCodeEl.textContent = generateTOTP(totpSecret);
      
      // Update timer
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = 30 - (now % 30);
      const percentage = (secondsRemaining / 30) * 100;
      
      totpTimerProgress.style.width = percentage + '%';
      totpSecondsEl.textContent = secondsRemaining;
      
      // Change color when close to expiring
      if (secondsRemaining <= 5) {
        totpTimerProgress.style.backgroundColor = '#dc3545';
      } else {
        totpTimerProgress.style.backgroundColor = '#0056b3';
      }
    } catch (error) {
      console.error('Error updating TOTP:', error);
      totpCodeEl.textContent = 'Error';
    }
  }
  
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status ' + type;
    statusMessage.style.display = 'block';
    
    setTimeout(function() {
      statusMessage.style.display = 'none';
    }, 3000);
  }
}); 
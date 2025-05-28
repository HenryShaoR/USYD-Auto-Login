function sleep(ms = 200) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getElementBy(method, selector) {
  switch (method.toLowerCase()) {
    case 'class':
      return document.getElementsByClassName(selector)[0];
    case 'name':
      return document.getElementsByName(selector)[0];
  }
}

function next() {
  getElementBy("class", "button button-primary").click();
}

// Check if we're on the SSO login page
if (window.location.href.startsWith('https://sso.sydney.edu.au/')) {
  // Get credentials from storage
  chrome.storage.sync.get(['uniKey', 'password', 'totpSecret'], function(data) {
    let missing = false;
    if (!data.uniKey) {
      console.log('Missing uniKey');
      missing = true;
    }
    if (!data.password) {
      console.log('Missing password');
      missing = true;
    }
    if (!data.totpSecret) {
      console.log('Missing TOTP secret');
      missing = true;
    }
    if (missing) return;

    // Function to generate TOTP
    function generateTOTP(secret) {
      try {
        // Check if OTPAuth is available
        if (typeof OTPAuth === 'undefined') {
          console.log('OTPAuth library not loaded');
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
        console.log('TOTP generation error:', error);
        return 'ERROR';
      }
    }

    async function fillUniKey() {
      element = getElementBy("name", "identifier");
      if (element) {
        element.value = data.uniKey;
        element.dispatchEvent(new Event('input', { bubbles: true }));

        next();
        while (getElementBy("name", "identifier")) {
          await sleep();
        }
      }
      fillPassword().then();
    }

    async function fillPassword() {
      element = getElementBy("class", "password-with-toggle");
      if (element) {
        element.value = data.password;
        element.dispatchEvent(new Event('input', { bubbles: true }));

        next();
        while (getElementBy("class", "password-with-toggle")) {
          await sleep();
        }
      }
      select2FA().then();
    }

    async function select2FA() {
      const elements = document.getElementsByClassName("authenticator-row clearfix");
      let found = false;
      for (const element1 of Array.from(elements)) {
        if (element1.getElementsByClassName("factor-icon authenticator-icon mfa-google-auth")) {
          found = true;
          element1.getElementsByTagName("a")[0].click();
          break;
        }
      }
      if (!found) {
        element = getElementBy("class", "link js-switchAuthenticator");
        if (element && !getElementBy("class", "bg-helper auth-beacon auth-beacon-factor mfa-google-auth")) {
          element.click();
          while (getElementBy("class", "link js-switchAuthenticator")) {
            await sleep();
          }
          select2FA().then();
          return;
        }
      }
      while (getElementBy("class", "authenticator-row clearfix")) {
        await sleep();
      }
      fillTOTP();
    }

    function fillTOTP() {
      element = getElementBy("name", "credentials.passcode");
      if (element && getElementBy("class", "bg-helper auth-beacon auth-beacon-factor mfa-google-auth")) {
        let totpCode;

        if (data.totpSecret) {
          totpCode = generateTOTP(data.totpSecret);
        } else {
          console.log("No TOTP method available");
          return;
        }

        element.value = totpCode;
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Click login button
        next();
      }
    }

    // Begin the login process
    async function performLogin() {
      while (!getElementBy("class", "auth-org-logo")) {
        await sleep();
      }
      await sleep();
      
      try {
        element = getElementBy("class", "link js-cancel-authenticator-challenge");
        if (element) {
          element.click();
          while (getElementBy("class", "link js-cancel-authenticator-challenge")) {
            await sleep();
          }
        }
        fillUniKey().then();
      } catch (error) {
        console.log("Error during auto-login:", error);
      }
    }

    let element;
    performLogin().then();
  });
} 
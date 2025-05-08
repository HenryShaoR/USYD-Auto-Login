// Check if we're on the SSO login page
const timeout = 1000;
if (window.location.href.startsWith('https://sso.sydney.edu.au/')) {
  // Get credentials from storage
  chrome.storage.sync.get(['uniKey', 'password', 'totpSecret'], function(data) {
    if (!data.uniKey || !data.password) {
      console.log('USYD Auto Login: Credentials not found');
      return;
    }

    // Helper function to get element by XPath
    function getElementByXPath(xpath) {
      return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    }

    // XPath selectors
    const cancelSelector = '/html/body/div[2]/main/div[2]/div/div/div[3]/div/a';
    const uniKeySelector = '/html/body/div[2]/main/div[2]/div/div/div[2]/form/div[1]/div[3]/div[1]/div[2]/span/input';
    const nextButtonSelector = '/html/body/div[2]/main/div[2]/div/div/div[2]/form/div[2]/input';
    const passwordSelector = '/html/body/div[2]/main/div[2]/div/div/div[2]/form/div[1]/div[4]/div/div[2]/span/input';
    const verifyButtonSelector = '/html/body/div[2]/main/div[2]/div/div/div[2]/form/div[2]/input';
    const otherVerifyOptionsSelector = '/html/body/div[2]/main/div[2]/div/div/div[3]/div/a[1]';
    const totpInputSelector = '/html/body/div[2]/main/div[2]/div/div/div[2]/form/div[1]/div[4]/div/div[2]/span/input';
    const loginButtonSelector = '/html/body/div[2]/main/div[2]/div/div/div[2]/form/div[2]/input';

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

    async function fillUniKey() {
      element = getElementByXPath(uniKeySelector);
      if (element) {
        console.log(element)
        console.log("Found UniKey field");
        element.value = data.uniKey;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        console.log("UniKey filled");

        let nextButton = getElementByXPath(nextButtonSelector);
        nextButton.click();
        console.log("Next button clicked");
        setTimeout(fillPassword, timeout);
      } else {
        console.log("UniKey field not found");
        fillPassword().then();
      }
    }

    async function fillPassword() {
      element = getElementByXPath(passwordSelector);
      if (element && !document.body.textContent.includes("Verify with Google Authenticator")) {
        console.log("Found password field");
        element.value = data.password;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        console.log("Password filled");

        let verifyButton = getElementByXPath(verifyButtonSelector);
        verifyButton.click();
        console.log("Verify button clicked");
        setTimeout(select2FA, timeout);
      } else {
        console.log("Password field not found");
        select2FA().then();
      }
    }

    async function select2FA() {
      const elements = document.getElementsByClassName("authenticator-description");
      let found = false;
      Array.from(elements).forEach(element => {
        console.log(element);
        if (element.innerHTML.includes("Google Authenticator")) {
          found = true;
          element.getElementsByTagName("a")[0].click();
          console.log("Google Authenticator selected");
          setTimeout(fillTOTP, timeout);
        }
      })
      if (!found) {
        console.log("Google Authenticator btn not found");

        element = getElementByXPath(otherVerifyOptionsSelector);
        if (element && element.innerHTML.includes("Verify with something else") && !document.body.textContent.includes("Verify with Google Authenticator")) {
          element.click();
          console.log("Verify with something else clicked");
          setTimeout(select2FA, timeout);
          return;
        }
        fillTOTP().then();
      }
    }

    async function fillTOTP() {
      element = getElementByXPath(totpInputSelector);
      if (element && document.body.textContent.includes('Verify with Google Authenticator')) {
        console.log("Found TOTP input field");
        let totpCode;

        if (data.totpSecret) {
          totpCode = generateTOTP(data.totpSecret);
          console.log("Generated dynamic TOTP code:", totpCode);
        } else {
          console.error("No TOTP method available");
          return;
        }

        element.value = totpCode;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        console.log("TOTP code entered");

        // Click login button
        let loginButton = getElementByXPath(loginButtonSelector);
        loginButton.click();
        console.log("Login button clicked");
      } else {
        console.log("TOTP input field not found");
      }
    }
    
    // Begin the login process
    async function performLogin() {
      try {
        try {
          element = getElementByXPath(cancelSelector);
          if (element && element.innerHTML.includes("Cancel and take me to sign in")) {
            element.click();
            console.log("Cancel and take me to sign in clicked");
          }
        } catch (error) {
          //
        } finally {
          setTimeout(fillUniKey, timeout);
        }
      } catch (error) {
        console.error("Error during auto-login:", error);
      }
    }

    let element;
    // Wait a moment for the page to fully load before starting
    setTimeout(performLogin, timeout);
  });
} 
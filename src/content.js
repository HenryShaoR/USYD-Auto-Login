// Check if we're on the SSO login page
const timeout = 1000;

function sleep(ms = 200) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (window.location.href.startsWith('https://sso.sydney.edu.au/')) {
  // Get credentials from storage
  chrome.storage.sync.get(['uniKey', 'password', 'totpSecret'], function(data) {
    let missing = false;
    if (!data.uniKey) {
      console.error('Missing uniKey');
      missing = true;
    }
    if (!data.password) {
      console.error('Missing password');
      missing = true;
    }
    if (!data.totpSecret) {
      console.error('Missing TOTP secret');
      missing = true;
    }
    if (missing) return;

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
        element.value = data.uniKey;
        element.dispatchEvent(new Event('input', { bubbles: true }));

        let nextButton = getElementByXPath(nextButtonSelector);
        nextButton.click();
        while (getElementByXPath(uniKeySelector)) {
          await sleep();
        }
      }
      fillPassword().then();
    }

    async function fillPassword() {
      element = getElementByXPath(passwordSelector);
      if (element && !document.body.textContent.includes("Verify with Google Authenticator")) {
        element.value = data.password;
        element.dispatchEvent(new Event('input', { bubbles: true }));

        let verifyButton = getElementByXPath(verifyButtonSelector);
        verifyButton.click();
        while (getElementByXPath(passwordSelector) && document.body.textContent.includes("Verify with your password")) {
          await sleep();
        }
      }
      select2FA().then();
    }

    async function select2FA() {
      const elements = document.getElementsByClassName("authenticator-description");
      let found = false;
      for (const element1 of Array.from(elements)) {
        if (element1.innerHTML.includes("Google Authenticator")) {
          found = true;
          element1.getElementsByTagName("a")[0].click();
        }
      }
      if (!found) {
        element = getElementByXPath(otherVerifyOptionsSelector);
        if (element && element.innerHTML.includes("Verify with something else") && !document.body.textContent.includes("Verify with Google Authenticator")) {
          element.click();
          while (getElementByXPath(otherVerifyOptionsSelector) && getElementByXPath(otherVerifyOptionsSelector).innerHTML.includes("Verify with something else")) {
            await sleep();
          }
          select2FA().then();
          return;
        }
      }
      while (!document.body.textContent.includes("Verify with Google Authenticator")) {
        await sleep();
      }
      fillTOTP();
    }

    function fillTOTP() {
      element = getElementByXPath(totpInputSelector);
      if (element && document.body.textContent.includes('Verify with Google Authenticator')) {
        let totpCode;

        if (data.totpSecret) {
          totpCode = generateTOTP(data.totpSecret);
        } else {
          console.error("No TOTP method available");
          return;
        }

        element.value = totpCode;
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Click login button
        let loginButton = getElementByXPath(loginButtonSelector);
        loginButton.click();
      }
    }

    // Begin the login process
    async function performLogin() {
      try {
        element = getElementByXPath(cancelSelector);
        if (element && element.innerHTML.includes("Cancel and take me to sign in")) {
          element.click();
          while (getElementByXPath(cancelSelector) && getElementByXPath(cancelSelector).innerHTML.includes("Cancel and take me to sign in")) {
            await sleep();
          }
        }
        fillUniKey().then();
      } catch (error) {
        console.error("Error during auto-login:", error);
      }
    }

    let element;
    // Wait a moment for the page to fully load before starting
    setTimeout(performLogin, timeout);
  });
} 
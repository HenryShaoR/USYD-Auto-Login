# USYD Auto Login Chrome Extension

This Chrome extension automatically logs you into the University of Sydney's Single Sign-On (SSO) system.

## Features

- Automatically fills in your UniKey and password
- Handles 2FA authentication using TOTP (Time-based One-Time Password)
- Supports QR code scanning to set up TOTP authentication
- Displays current TOTP code in the popup for manual login or authenticator setup

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the directory containing this extension

## Setup

1. Click on the extension icon in your browser toolbar
2. Enter your UniKey and password
3. Upload your 2FA QR code:
   - Take a screenshot of your TOTP QR code from the USYD 2FA setup page
   - Click "Choose File" and select the QR code image
   - The extension will extract the TOTP secret key and display the current code
4. Click "Save Credentials" to store your information securely in the browser

## Usage

Once set up, the extension will automatically:
1. Fill in your UniKey and password
2. Select the TOTP verification method
3. Generate and enter the verification code
4. Complete the login process

You can also click the extension icon at any time to view the current TOTP code for manual login or setting up other authenticator apps.

## How It Works

The extension detects when you are on the SSO login page and automatically:

1. Enters your UniKey on the first page and clicks "Next"
2. Enters your password on the second page and clicks "Verify"
3. Selects the TOTP verification method
4. Generates a TOTP code using your secret key and enters it
5. Clicks the login button to complete the process

## Security Considerations

- Your credentials are stored locally in your browser using Chrome's secure storage API
- They are not sent to any external servers
- Anyone with access to your computer and Chrome profile could potentially access your SSO account
- Use this extension with caution and ensure your computer is secure

## Project Structure

```
USYD-Auto-Login/
│
├── manifest.json          - Extension configuration
├── popup/
│   ├── popup.html        - Extension popup interface
│   └── popup.js          - Popup functionality
│
└── src/
    ├── background.js     - Background service worker
    ├── content.js        - Content script for auto-filling
    ├── jsqr.js           - QR code scanning library
    └── otpauth.js        - TOTP generation library
```

## License

This project is for personal use only. 
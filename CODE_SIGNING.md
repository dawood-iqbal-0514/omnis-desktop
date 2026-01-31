# Code Signing Setup for Production

## The Problem

Electron-builder is trying to extract macOS signing tools that require symlinks, which need administrator privileges on Windows.

## Solution Options

### Option 1: Run Build as Administrator (Recommended for Testing)

1. **Close your current PowerShell/terminal**

2. **Right-click PowerShell** → **Run as Administrator**

3. **Navigate to project:**
   ```powershell
   cd "D:\omnis reach\omnis-desktop"
   ```

4. **Run build:**
   ```powershell
   npm run build
   ```

This will allow electron-builder to create the necessary symlinks.

### Option 2: Use Environment Variables (Skip Problematic Extraction)

Set environment variables to skip auto-discovery:

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run build
```

This tells electron-builder to skip downloading/extracting signing tools automatically.

### Option 3: Production Code Signing Certificate

For **real production code signing**, you need:

1. **Get a Code Signing Certificate:**
   - Purchase from a Certificate Authority (CA) like:
     - DigiCert
     - Sectigo
     - GlobalSign
   - Or create a self-signed certificate (for testing only)

2. **Set Environment Variables:**

   ```powershell
   # Path to your .p12 or .pfx certificate file
   $env:CSC_LINK="C:\path\to\your\certificate.p12"
   
   # Password for the certificate
   $env:CSC_KEY_PASSWORD="your-certificate-password"
   
   # Optional: Certificate name (if using Windows certificate store)
   # $env:CSC_NAME="Your Certificate Name"
   ```

3. **Run Build:**
   ```powershell
   npm run build
   ```

### Option 4: Use Windows Certificate Store

If you have a certificate installed in Windows Certificate Store:

1. **Open Certificate Manager:**
   - Press `Win + R`
   - Type `certmgr.msc`
   - Press Enter

2. **Find your code signing certificate** in:
   - Personal → Certificates

3. **Set environment variable:**
   ```powershell
   $env:CSC_NAME="Your Certificate Name"
   npm run build
   ```

## Self-Signed Certificate (For Testing)

If you want to create a self-signed certificate for testing:

```powershell
# Create a self-signed certificate
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Omnis Reach" -CertStoreLocation Cert:\CurrentUser\My

# Export to .pfx file
$password = ConvertTo-SecureString -String "YourPassword123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath ".\omnis-reach-cert.pfx" -Password $password

# Set environment variables
$env:CSC_LINK=".\omnis-reach-cert.pfx"
$env:CSC_KEY_PASSWORD="YourPassword123"
```

**Note:** Self-signed certificates will show a warning to users. For production, use a certificate from a trusted CA.

## Current Configuration

The `electron-builder.config.js` is now configured to:
- ✅ Enable code signing (`signAndEditExecutable: true`)
- ✅ Skip DLL signing (`signDlls: false`) to avoid symlink issues
- ✅ Use automatic certificate detection from Windows store

## Quick Start (No Certificate - Testing)

If you just want to build without signing (users will see "Unknown Publisher" warning):

1. Run PowerShell **as Administrator**
2. Run `npm run build`

The symlink error will be resolved with admin privileges, and the build will complete (unsigned).

## Production Release

For production releases to end users:

1. **Purchase a code signing certificate** from a trusted CA
2. **Set `CSC_LINK` and `CSC_KEY_PASSWORD`** environment variables
3. **Run build** (can be done without admin if using environment variables)
4. **Test the signed executable** - it should show your publisher name

## Troubleshooting

### Still Getting Symlink Errors?

- **Run PowerShell as Administrator** (Option 1)
- Or set `CSC_IDENTITY_AUTO_DISCOVERY=false` (Option 2)

### Certificate Not Found?

- Check certificate path in `CSC_LINK`
- Verify certificate password in `CSC_KEY_PASSWORD`
- For Windows store: Check certificate name in `CSC_NAME`

### Build Succeeds But Executable Shows "Unknown Publisher"?

- Certificate not properly configured
- Using self-signed certificate (expected behavior)
- Need to purchase certificate from trusted CA


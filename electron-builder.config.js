module.exports = {
  appId: 'com.omnisreach.app',
  productName: 'Omnis Reach',
  directories: {
    output: 'release',
    buildResources: 'build',
  },
  files: [
    'dist/**/*',
    'package.json',
    'node_modules/**/*',
  ],
  asar: true,
  electronDownload: {
    mirror: 'https://github.com/electron/electron/releases/download/v'
  },
  win: {
    target: [
      {
        target: 'dir', // Just create directory output, skip portable for now
        arch: ['x64'],
      },
    ],
    signAndEditExecutable: true,
    signDlls: false, 
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'build/icon.icns',
    category: 'public.app-category.productivity',
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
    ],
    icon: 'build/icon.png',
    category: 'Utility',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  // Code signing configuration
  // For production: Set CSC_LINK (path to .p12/.pfx) and CSC_KEY_PASSWORD environment variables
  // Or use Windows certificate store (automatic detection)
};


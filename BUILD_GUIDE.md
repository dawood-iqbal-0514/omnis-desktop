# Build Guide - Omnis Reach Desktop Application

This guide explains how to build the Omnis Reach desktop application for distribution.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher) - Required for building
3. **PyInstaller** - Install with: `pip install pyinstaller`
4. **Python Dependencies** - Install all required packages:
   ```bash
   pip install DrissionPage
   ```

## Build Commands

The build process is simple - just run these two commands:

```bash
# Step 1: Convert all Python scripts to .exe files
npm run build:python

# Step 2: Build Electron app with bundled executables
npm run build
```

That's it! The build process will:
1. Convert all `.py` files to standalone `.exe` files
2. Bundle them with the Electron application
3. Create the final installer for distribution

---

## Build Output Location

After running `npm run build`, the final application will be in:

**For Distribution (Share this with users):**
```
release/@omnis-reachdesktop Setup {version}.exe
```

**Example full path:**
```
D:\omnis reach\omnis-desktop\release\@omnis-reachdesktop Setup 1.0.0.exe
```

**Portable Version (Alternative):**
```
release/win-unpacked/@omnis-reachdesktop.exe
```

**Recommended:** Share the **Installer** file (`@omnis-reachdesktop Setup {version}.exe`) - it's self-contained and includes everything users need.

---

## Development vs Production

### Development Mode

**Just run:**
```bash
npm run dev
```

- Uses Python directly (no build needed)
- Python must be installed on your machine

### Production Build

**Run these commands:**
```bash
npm run build:python  # Converts .py to .exe
npm run build         # Builds Electron app
```

- Creates standalone executables
- No Python needed for end users

---

## Troubleshooting

**Build fails:**
- Make sure PyInstaller is installed: `pip install pyinstaller`
- Check Python dependencies are installed: `pip install DrissionPage`
- Clear and rebuild: `rm -rf dist release && npm run build:python && npm run build`

**Executable not found:**
- Make sure you ran `npm run build:python` before `npm run build`
- Check that Python scripts are in `src/automation/platforms/`

---

## Summary

**To build for distribution:**
```bash
npm run build:python  # Step 1: Convert .py to .exe
npm run build         # Step 2: Build Electron app
```

**Final executable location:**
```
release/@omnis-reachdesktop Setup {version}.exe
```

**For development:**
```bash
npm run dev  # No build needed, uses Python directly
```
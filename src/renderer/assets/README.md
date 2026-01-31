# Assets Folder

This folder contains all UI assets (logos, images, icons) used in the renderer process.

## Structure

```
assets/
├── logos/          # App logos and branding
├── images/         # General images
├── icons/          # UI icons (if not using icon library)
└── fonts/          # Custom fonts (if any)
```

## Usage

Import assets in your components:

```jsx
import logo from '../assets/logos/logo.png';
import icon from '../assets/icons/icon.svg';

// Then use in JSX
<img src={logo} alt="Logo" />
```

## Recommended Formats

- **Logos**: PNG (with transparency) or SVG
- **Images**: PNG, JPG, or WebP
- **Icons**: SVG (scalable) or PNG
- **Favicon**: ICO or PNG (16x16, 32x32, 48x48)


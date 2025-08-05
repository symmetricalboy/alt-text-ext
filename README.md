# Alt Text Generator - Browser Extension

Cross-browser extension for generating accessible alt text and captions directly within Bluesky using Google Gemini AI. Built with the WXT.dev framework for maximum compatibility across Chrome, Firefox, and Safari.

## 🌟 Features

- **🤖 Seamless Bluesky Integration:** Adds a ✨ button next to alt text fields on bsky.app
- **📹 Advanced Video Processing:** FFmpeg.wasm integration with multi-codec support (H.264, VP8, VP9)
- **🔄 Smart Compression:** Automatic video compression with adaptive quality settings
- **💾 Large File Handling:** IndexedDB-based processing for files over 80MB
- **🎯 Real-time Feedback:** Toast notifications and progress indicators
- **🔒 Privacy-Focused:** Local processing with secure API communication

## 🚀 Quick Start

### Installation

**From Browser Stores:**
- **Chrome:** [Chrome Web Store](https://chromewebstore.google.com/detail/bdgpkmjnfildfjhpjagjibfnfpdieddp)
- **Firefox:** [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/bluesky-alt-text-generator/)
- **Safari:** Coming soon to App Store

### Usage

1. Install the extension from your browser's store
2. Visit [bsky.app](https://bsky.app) and create a new post
3. Upload an image or video
4. Click the ✨ button next to the alt text field
5. Review and edit the generated text before posting

## 🏗️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/symmetricalboy/alt-text-ext.git
cd alt-text-ext

# Install dependencies
npm install

# Start development server
npm run dev:chrome    # For Chrome
npm run dev:firefox   # For Firefox  
npm run dev:safari    # For Safari
```

### Building
```bash
# Build for production
npm run build:chrome
npm run build:firefox
npm run build:safari

# Create distribution packages
npm run package:all
```

## 🔧 Technical Architecture

### Framework & Technologies
- **WXT.dev:** Cross-browser extension framework
- **TypeScript:** Type-safe development
- **FFmpeg.wasm v0.11.x:** Client-side video processing
- **Manifest V3:** Modern extension architecture

### Key Components
- **Background Service Worker:** API communication and coordination
- **Content Scripts:** DOM manipulation and UI injection  
- **Offscreen Document:** Isolated video processing environment
- **Web Accessible Resources:** FFmpeg assets and processing scripts

### Video Processing Pipeline
```
Upload → Size Check → Compression Strategy → FFmpeg Processing → API Upload → AI Generation → Result Display
```

## 🌐 Related Repositories

This extension is part of a larger ecosystem:

- **🏠 [gen-alt-text](https://github.com/symmetricalboy/gen-alt-text)** - Main project hub and documentation
- **⚙️ [alt-text-server](https://github.com/symmetricalboy/alt-text-server)** - Backend API server  
- **🖥️ [alt-text-web](https://github.com/symmetricalboy/alt-text-web)** - Web application (https://alttext.symm.app)

## 📊 Current Status

| Browser | Store Version | Dev Version | Status |
|---------|---------------|-------------|--------|
| **Chrome** | 0.3.1 | 1.0.0 | ⚠️ Update pending |
| **Firefox** | 0.3.1 | 1.0.0 | ⚠️ Update pending |
| **Safari** | - | 1.0.0 | 🚧 In development |

## 🐛 Known Issues & Roadmap

### Current Limitations
- Store versions (0.3.1) missing advanced video processing features
- VTT caption formatting occasionally needs refinement
- High FPS videos (76+) may require additional processing time

### Coming Soon
- **Auto Mode:** Automatic alt text generation without manual clicks
- **Enhanced Review Workflow:** Built-in editing and correction interface
- **Safari Store Release:** Complete Safari App Store submission

## 🤝 Contributing

We welcome contributions! For extension-specific issues:

1. **Bug Reports:** [Extension Issues](https://github.com/symmetricalboy/alt-text-ext/issues)
2. **Feature Requests:** [Main Project Issues](https://github.com/symmetricalboy/gen-alt-text/issues)
3. **Development:** See [Development Guide](https://github.com/symmetricalboy/gen-alt-text/blob/main/docs/development-guide.md)

## 📖 Documentation

Comprehensive documentation is available in the main project:
- **[Technical Architecture](https://github.com/symmetricalboy/gen-alt-text/blob/main/docs/technical-architecture.md)**
- **[Development Guide](https://github.com/symmetricalboy/gen-alt-text/blob/main/docs/development-guide.md)**
- **[Browser Extension Details](https://github.com/symmetricalboy/gen-alt-text/blob/main/docs/browser-extension.md)**

## 📜 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🔗 Links

- **🌐 Web Version:** [alttext.symm.app](https://alttext.symm.app)
- **📱 Bluesky:** [@symm.app](https://bsky.app/profile/symm.app)
- **🏠 Main Project:** [gen-alt-text](https://github.com/symmetricalboy/gen-alt-text)

---

*Part of the Bluesky Alt Text Generator ecosystem - making the web more accessible! 🌟*

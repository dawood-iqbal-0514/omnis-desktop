# LLM Model Setup

## Installation Issues?

If `npm install` fails with error `code 3221225477` (node-llama-cpp crash), try:

```bash
npm install --ignore-scripts
```

Then manually run the postinstall:
```bash
npm rebuild
```

If it still crashes, the `.npmrc` file should prevent GPU detection during install.

## Download AI Model

The AI model (1.5GB) is not included in the repository. You must download it before running the app.

### Option 1: PowerShell (Recommended)
```powershell
cd src/llm/models
Invoke-WebRequest -Uri "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf" -OutFile "qwen2.5-1.5b-instruct-q4_k_m.gguf"
cd ../../..
```

### Option 2: Manual Download
1. Visit: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF
2. Download: `qwen2.5-1.5b-instruct-q4_k_m.gguf` (~1.61GB)
3. Place in: `src/llm/models/qwen2.5-1.5b-instruct-q4_k_m.gguf`

## Verify Installation
Check that the file exists and is approximately 1.61GB in size.

## Run the App
```bash
npm run dev
```

The LLM will initialize on first use (takes 5-7 seconds).

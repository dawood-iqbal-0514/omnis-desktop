# Local LLM Module

This folder contains the local LLM integration for Omnis Reach.

## Overview

We use Qwen3 1.8B (quantized to Q4) running locally via llama.cpp bindings.
This provides ~1.5GB model size with excellent performance for:
- Natural language understanding
- Intent extraction
- Task planning
- Response generation

## File Structure

```
src/llm/
├── index.js          # Main export
├── modelManager.js   # Load/unload model, memory management
├── inference.js      # Run inference, chat completion
├── prompts/          # Prompt templates
│   ├── system.js     # System prompts
│   ├── intents.js    # Intent detection prompts
│   └── tasks.js      # Task generation prompts
└── schemas/          # JSON schemas for structured outputs
    ├── intent.js     # Intent schema
    └── task.js       # Task schema
```

## Model Details

- **Model**: Qwen3 1.8B Q4_K_M
- **Size**: ~1.5GB
- **RAM**: ~3GB when loaded
- **Context**: 4096 tokens
- **Backend**: llama-node or node-llama-cpp

## Usage

```javascript
const { llmManager } = require('./llm');

// Load model
await llmManager.load();

// Chat completion
const response = await llmManager.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Send a message to John on LinkedIn' }
  ]
});

// Extract structured intent
const intent = await llmManager.extractIntent(userMessage);
// Returns: { platform: 'linkedin', action: 'sendMessage', params: { recipient: 'John' } }
```

## Notes

- Model is downloaded separately after app install (~1.5GB download)
- Uses staged download with resume capability
- Model stored in userData/models/ directory
- Memory is released when model is unloaded

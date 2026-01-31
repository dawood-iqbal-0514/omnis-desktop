const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let getLlama, LlamaModel, LlamaContext, LlamaChatSession;
let jsonrepair;

async function loadDependencies() {
  if (!LlamaModel) {
    // Don't set binaries path - let node-llama-cpp auto-detect
    // It will find them in node_modules correctly
    
    const llamaModule = await import('node-llama-cpp');
    getLlama = llamaModule.getLlama;
    LlamaModel = llamaModule.LlamaModel;
    LlamaContext = llamaModule.LlamaContext;
    LlamaChatSession = llamaModule.LlamaChatSession;
    
    const jsonrepairModule = await import('jsonrepair');
    jsonrepair = jsonrepairModule.jsonrepair;
  }
}

class WorkflowLLMService {
  constructor() {
    this.llama = null;
    this.model = null;
    this.context = null;
    this.chatSession = null;
    this.isLoaded = false;
    this.chatHistory = [];
    this.systemPrompt = '';
  }

  async initialize() {
    if (this.isLoaded) return;

    console.log('🤖 Loading dependencies...');
    await loadDependencies();

    console.log('🤖 Initializing llama bindings (CPU-only mode)...');
    
    this.llama = await getLlama({
      build: 'never', // Don't try to build, use pre-built binaries
    });

    console.log('🤖 Loading Qwen2.5-1.5B model...');

    const modelFilename = 'qwen2.5-1.5b-instruct-q4_k_m.gguf';
    
    // Primary: extraResources location (resources/llm/models/)
    const extraResourcesPath = path.join(process.resourcesPath, 'llm', 'models', modelFilename);
    
    // Alternative: unpacked asar location
    const bundledDir = __dirname.replace('app.asar', 'app.asar.unpacked');
    const bundledModelPath = path.join(bundledDir, 'models', modelFilename);
    
    const appPath = app.getAppPath();
    const unpackedBase = appPath.replace('app.asar', 'app.asar.unpacked');
    const alternativeModelPath = path.join(unpackedBase, 'src', 'llm', 'models', modelFilename);
    
    // Fallback to userData location (user downloaded separately)
    const userDataModelPath = path.join(app.getPath('userData'), 'models', modelFilename);
    
    console.log('🔍 Checking extraResources path:', extraResourcesPath);
    console.log('🔍 Checking bundled path:', bundledModelPath);
    console.log('🔍 Checking alternative path:', alternativeModelPath);
    console.log('🔍 Checking userData path:', userDataModelPath);
    
    let modelPath;
    if (fs.existsSync(extraResourcesPath)) {
      console.log('📦 Using model from extraResources');
      modelPath = extraResourcesPath;
    } else if (fs.existsSync(bundledModelPath)) {
      console.log('📦 Using bundled model (primary path)');
      modelPath = bundledModelPath;
    } else if (fs.existsSync(alternativeModelPath)) {
      console.log('📦 Using bundled model (alternative path)');
      modelPath = alternativeModelPath;
    } else if (fs.existsSync(userDataModelPath)) {
      console.log('📁 Using model from userData');
      modelPath = userDataModelPath;
    } else {
      throw new Error(`Model not found at:\n- ${extraResourcesPath}\n- ${bundledModelPath}\n- ${alternativeModelPath}\n- ${userDataModelPath}\nPlease download the model first.`);
    }

    this.model = await this.llama.loadModel({
      modelPath: modelPath,
    });

    this.context = await this.model.createContext({
      sequences: 2,
      contextSize: 4096,
    });

    console.log('✅ Model loaded successfully');
    this.isLoaded = true;
  }

  startChat() {
    if (!this.isLoaded) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const systemPrompt = `You are a professional requirements analyst for automation workflows. 
Your goal is to gather information from the user to create an automation.

You must collect:
- Platform (linkedin, notion, email, etc.)
- Trigger event (what starts the automation)
- Actions to perform (messages, tasks, delays, etc.)
- Any conditions or timing requirements

Ask concise, one-at-a-time questions. Be friendly and clear.
Once you have all required information, respond with exactly: [COMPLETE]`;

    const sequence = this.context.getSequence();
    this.chatSession = new LlamaChatSession({
      contextSequence: sequence,
    });

    this.chatHistory = [];
    this.systemPrompt = systemPrompt;
    console.log('🎯 Chat session started');
  }

  async sendMessage(userMessage) {
    if (!this.chatSession) {
      throw new Error('Chat not started. Call startChat() first.');
    }

    this.chatHistory.push({ role: 'user', content: userMessage });

    // Include system prompt in first message
    const promptText = this.chatHistory.length === 1 
      ? `${this.systemPrompt}\n\nUser: ${userMessage}`
      : userMessage;

    const response = await this.chatSession.prompt(promptText, {
      maxTokens: 500,
      temperature: 0.7,
      topP: 0.9,
    });

    this.chatHistory.push({ role: 'assistant', content: response });

    const isComplete = response.includes('[COMPLETE]');

    return {
      message: response.replace('[COMPLETE]', '').trim(),
      isComplete: isComplete,
    };
  }

  async extractWorkflowJSON() {
    if (!this.chatHistory || this.chatHistory.length === 0) {
      throw new Error('No chat history to extract from');
    }

    console.log('🔍 Extracting workflow JSON...');

    // Create a fresh context for JSON generation to avoid chat context bleeding
    const sequence = this.context.getSequence();
    const extractionSession = new LlamaChatSession({
      contextSequence: sequence,
    });

    const conversationSummary = this.chatHistory
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const extractionPrompt = `Extract automation workflow from conversation:

${conversationSummary}

Generate valid JSON workflow. Structure:
{
  "workflow": {
    "id": "workflow_123",
    "trigger": {"platform": "linkedin", "event": "schedule"},
    "steps": [{"id": "step_1", "type": "simple", "action": "post", "params": {"content": "text"}}]
  }
}

Output ONLY valid JSON:`;

    const grammarPath = path.join(__dirname, 'grammars', 'workflow.gbnf');
    let grammarText = null;

    if (fs.existsSync(grammarPath)) {
      grammarText = fs.readFileSync(grammarPath, 'utf-8');
      console.log('✅ Using GBNF grammar for constrained generation');
    }

    try {
      const options = {
        maxTokens: 2000,
        temperature: 0.1,
        topP: 0.9,
      };

      if (grammarText) {
        options.grammar = grammarText;
      }

      const jsonResponse = await extractionSession.prompt(extractionPrompt, options);
      console.log('🔍 Raw JSON response:', jsonResponse);

      // Clean response (remove markdown code blocks if present)
      let cleaned = jsonResponse.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      try {
        const parsed = JSON.parse(cleaned);
        console.log('✅ Successfully parsed JSON');
        return parsed;
      } catch (parseError) {
        console.warn('⚠️ Parse failed, attempting repair...');
        const repaired = jsonrepair(cleaned);
        return JSON.parse(repaired);
      }
    } catch (error) {
      console.error('❌ JSON extraction failed:', error);
      throw new Error('Failed to extract workflow JSON: ' + error.message);
    }
  }

  validateRequirements() {
    const conversation = this.chatHistory
      .map((msg) => msg.content)
      .join(' ')
      .toLowerCase();

    const hasplatform =
      conversation.includes('linkedin') ||
      conversation.includes('notion') ||
      conversation.includes('email');

    const hasAction =
      conversation.includes('send') ||
      conversation.includes('create') ||
      conversation.includes('message');

    return {
      complete: hasPlatform && hasAction,
      missing: {
        platform: !hasPlatform,
        action: !hasAction,
      },
    };
  }

  getChatHistory() {
    return this.chatHistory;
  }

  reset() {
    this.chatSession = null;
    this.chatHistory = [];
  }

  async shutdown() {
    if (this.context) {
      await this.context.dispose();
    }
    if (this.model) {
      await this.model.dispose();
    }
    this.isLoaded = false;
    console.log('🛑 LLM service shutdown');
  }
}

module.exports = { WorkflowLLMService: new WorkflowLLMService() };

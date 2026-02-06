import React, { useState, useRef, useEffect } from 'react';
import Confetti from 'react-confetti';
import { ButtonPlain, ButtonIconed } from '../components/Button';
import { LoaderSmall } from '../components/Loader';
import { ExecutionPlanCard, ExecutionLogs } from '../components/Chat';
import { PlatformSelectionModal } from '../components/Modal';
import usePlatformStore from '../store/platformStore';
import { formatTimeLocal12Hour } from '../utils/date';

const Chat = () => {
  const selectedPlatform = usePlatformStore((state) => state.selectedPlatform);
  const setSelectedPlatform = usePlatformStore((state) => state.setSelectedPlatform);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  
  const getWelcomeMessage = () => {
    if (selectedPlatform) {
      return `Oh great, another human. 🙄 I'm Omnis Assistant. You've selected ${selectedPlatform.name} - because clicking buttons is too hard? What do you want to automate?`;
    }
    return 'Oh great, another human. 🙄 I\'m Omnis Assistant. What platform are we automating today?';
  };

  const [messages, setMessages] = useState([{
    id: 1,
    type: 'bot',
    content: 'Oh great, another human. 🙄 I\'m Omnis Assistant. What platform are we automating today?',
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if platform is selected when component mounts or when selectedPlatform changes
  useEffect(() => {
    if (!selectedPlatform) {
      setPlatformModalOpen(true);
    } else {
      // Update welcome message when platform is selected
      const welcomeMsg = selectedPlatform
        ? `Oh great, another human. 🙄 I'm Omnis Assistant. You've selected ${selectedPlatform.name} - because apparently clicking buttons is too hard - What do you want me to automate?`
        : 'Oh great, another human. 🙄 I\'m Omnis Assistant. What platform are we doing today?';
      
      setMessages(prev => prev.map((msg, idx) =>
        idx === 0 && msg.type === 'bot'
          ? { ...msg, content: welcomeMsg }
          : msg
      ));
    }
  }, [selectedPlatform]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    const userInput = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      // Get chat history (excluding system message)
      const chatHistory = messages.filter(m => m.type !== 'bot' || !m.content.includes('Hello! I\'m your automation assistant'));
      
      // Check if user wants to execute (after plan is shown)
      const wantsToExecute = ['yes implement it', 'implement it', 'execute', 'go ahead', 'do it', 'run it'].some(
        phrase => userInput.toLowerCase().includes(phrase)
      );

      if (wantsToExecute && pendingPlan) {
        // User wants to execute, trigger approval flow
        await handleApprovePlan();
        return;
      }

      // Call Cerebras API with platform info
      const result = await window.cerebrasAPI.sendMessage(userInput, chatHistory, selectedPlatform?.name);

      console.log('📨 Chat response:', result);

      if (result.success) {
        const responseType = result.data.type || 'message';
        console.log('📨 Response type:', responseType);
        console.log('📨 Plan data:', result.data.plan);

        if (responseType === 'plan') {
          // Execution plan ready - show confetti
          console.log('🎉 Showing confetti and plan card');
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000); // Hide after 3 seconds

          const planData = result.data.plan || {
            message: result.data.message,
            actions: []
          };

          const planMessage = {
            id: messages.length + 2,
            type: 'plan',
            content: result.data.message || 'Here\'s your execution plan:',
            plan: planData,
            timestamp: new Date().toISOString(),
          };

          setPendingPlan(planData);
          
          setMessages(prev => [...prev, planMessage]);
        } else if (responseType === 'execute') {
          // Execution JSON ready, start execution
          await handleExecute(result.data.executionJSON);
        } else {
          // Regular message
          const botMessage = {
            id: messages.length + 2,
            type: 'bot',
            content: result.data.message || 'Processing...',
            timestamp: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, botMessage]);
        }
      } else {
        throw new Error(result.error || 'Failed to get response from Cerebras API');
      }
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      // Extract user-friendly error message
      let errorMsg = 'Sorry, I encountered an error. Please try again.';
      if (error.message) {
        if (error.message.includes('500')) {
          errorMsg = 'The AI service encountered an internal error. Please try again in a moment.';
        } else if (error.message.includes('503')) {
          errorMsg = 'The AI service is temporarily unavailable. Please try again in a few moments.';
        } else if (error.message.includes('timeout') || error.message.includes('aborted') || error.message.includes('cancelled')) {
          errorMsg = 'The request was cancelled or timed out. This might be due to a slow connection. Please try again.';
        } else if (error.message.includes('getaddrinfo') || error.message.includes('EAI_AGAIN') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          errorMsg = 'Cannot connect to the AI service. Please check your internet connection and try again.';
        } else {
          errorMsg = error.message;
        }
      }
      
      console.error('❌ Full error:', error);
      
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: errorMsg,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };


  const handleApprovePlan = async () => {
    if (!pendingPlan) return;

    try {
      setIsTyping(true);
      
      // Send approve message
      const chatHistory = messages.filter(m => m.type !== 'bot' || !m.content.includes('Hello!'));
      const result = await window.cerebrasAPI.sendMessage('APPROVE', chatHistory, selectedPlatform?.name);

      if (result.success && result.data.type === 'execute') {
        await handleExecute(result.data.executionJSON);
      }
    } catch (error) {
      console.error('❌ Failed to approve plan:', error);
      const errorMessage = {
        id: messages.length + 1,
        type: 'bot',
        content: error.message || 'Failed to approve plan. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setPendingPlan(null);
    }
  };

  const handleEditPlan = async () => {
    setPendingPlan(null);
    
    const editMessage = {
      id: messages.length + 1,
      type: 'user',
      content: 'EDIT',
      timestamp: new Date().toISOString(),
    };

      setMessages(prev => [...prev, editMessage]);

    // Send edit message
    try {
      setIsTyping(true);
      const chatHistory = messages.filter(m => m.type !== 'bot' || !m.content.includes('Hello!'));
      const result = await window.cerebrasAPI.sendMessage('EDIT', chatHistory, selectedPlatform?.name);

      if (result.success) {
        const botMessage = {
          id: messages.length + 2,
          type: 'bot',
          content: result.data.message || 'What would you like to change?',
          timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('❌ Failed to edit plan:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecute = async (executionJSON) => {
    setIsExecuting(true);
    setExecutionLogs([]);

    // Add execution start message
    const executionStartMessage = {
      id: messages.length + 1,
      type: 'bot',
      content: '🚀 Starting execution...',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, executionStartMessage]);

    try {
      const logs = [];
      
      // Execute each step
      for (const step of executionJSON.steps) {
        // Add running log
        const runningLog = {
          step: step.order,
          type: step.type,
          status: 'running',
          message: `Step ${step.order}: ${step.description || step.action}...`,
          timestamp: new Date().toISOString(),
        };

        logs.push(runningLog);
        setExecutionLogs([...logs]);

        try {
          // Simulate execution delay
          await new Promise(resolve => setTimeout(resolve, 1000));

          if (step.type === 'api') {
            try {
              // Call backend API
              const response = await fetch(`http://localhost:4000${step.apiConfig.endpoint}`, {
                method: step.apiConfig.method || 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('omnis-reach-token')}`
                },
                body: JSON.stringify(step.parameters)
              });

              const data = await response.json();

              if (response.ok && data.success) {
                logs.push({
                  step: step.order,
                  type: step.type,
                  status: 'success',
                  message: `${step.description || step.action} completed successfully`,
                  timestamp: new Date().toISOString(),
                  details: data.data
                });
              } else {
                throw new Error(data.error || 'API call failed');
              }
            } catch (apiError) {
              // If API is not available, show mock execution
              console.warn('⚠️ API not available, showing mock execution:', apiError.message);
              logs.push({
                step: step.order,
                type: step.type,
                status: 'success',
                message: `${step.description || step.action} completed (mock execution - API not integrated)`,
                timestamp: new Date().toISOString(),
                details: { 
                  mock: true, 
                  message: 'This is a mock execution. API integration pending.',
                  parameters: step.parameters 
                }
              });
            }
          } else if (step.type === 'automation') {
            try {
              // Call automation via IPC
              const result = await window.automationAPI.executeTask({
                platform: executionJSON.platform,
                action: step.action || step.actionId,
                parameters: step.parameters,
                script: step.automationConfig?.script
              });

              if (result.success) {
                logs.push({
                  step: step.order,
                  type: step.type,
                  status: 'success',
                  message: `${step.description || step.action} completed successfully`,
                  timestamp: new Date().toISOString(),
                  details: result.result
                });
              } else {
                // Script not found or execution failed
                throw new Error(result.error || 'Automation failed');
              }
            } catch (automationError) {
              console.error('❌ Automation execution error:', automationError.message);
              
              // Check if error is about script not being available
              const isScriptNotFound = automationError.message.includes('not available') || 
                                       automationError.message.includes('not found');
              
              logs.push({
                step: step.order,
                type: step.type,
                status: 'error',
                message: isScriptNotFound 
                  ? `Script not available: ${automationError.message}`
                  : `${step.description || step.action} failed: ${automationError.message}`,
                timestamp: new Date().toISOString(),
                details: { 
                  error: automationError.message,
                  script: step.automationConfig?.script,
                  action: step.action
                }
              });
            }
          }

          setExecutionLogs([...logs]);
        } catch (error) {
          logs.push({
            step: step.order,
            type: step.type,
            status: 'error',
            message: `Failed: ${error.message}`,
            timestamp: new Date().toISOString(),
          });
          setExecutionLogs([...logs]);
          break; // Stop on error
        }
      }

      // Add completion message
      const allSuccess = logs.every(log => log.status !== 'error');
      const hasMockExecution = logs.some(log => log.details?.mock === true);
      
      let completionMessage = '';
      if (hasMockExecution) {
        completionMessage = allSuccess
          ? '✅ Execution completed (mock mode - APIs not integrated yet). All steps would have been executed successfully.'
          : '❌ Execution completed with errors (mock mode).';
      } else {
        completionMessage = allSuccess
          ? '✅ All tasks completed successfully!'
          : '❌ Execution completed with errors. Please check the logs.';
      }

      const completionMsg = {
        id: messages.length + 2,
        type: 'bot',
        content: completionMessage,
        timestamp: new Date().toISOString(),
      };

      // Add execution logs as a persistent message in chat
      if (logs.length > 0) {
        const logsMessage = {
          id: messages.length + 3,
          type: 'execution-logs',
          logs: logs,
          timestamp: new Date().toISOString(),
        };

      setMessages(prev => [...prev, logsMessage, completionMsg]);
      } else {
        setMessages(prev => [...prev, completionMsg]);
      }

      // Reset chatbot role to gatherer for next task
      try {
        await window.cerebrasAPI.resetChatbot();
        console.log('✅ Chatbot role reset to gatherer');
      } catch (error) {
        console.error('❌ Failed to reset chatbot role:', error);
      }
    } catch (error) {
      console.error('❌ Execution error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: `Execution failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);

      // Reset chatbot role even on error
      try {
        await window.cerebrasAPI.resetChatbot();
      } catch (resetError) {
        console.error('❌ Failed to reset chatbot role:', resetError);
      }
    } finally {
      setIsExecuting(false);
      // Don't clear logs immediately - let them persist
      setTimeout(() => setExecutionLogs([]), 5000);
    }
  };



  return (
    <div className="flex h-full bg-base-background relative">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Chat Header */}
        <div className="bg-[var(--color-base-background-light)] border-b border-border-muted px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-accent flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Omnis Assistant</h2>
              <p className="text-sm text-text-secondary">AI-powered task automation</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'plan' ? (
                <ExecutionPlanCard
                  plan={message.plan || message.content}
                  onApprove={handleApprovePlan}
                  onEdit={handleEditPlan}
                />
              ) : message.type === 'execution-logs' ? (
                <ExecutionLogs logs={message.logs || []} />
              ) : (
                <div
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-primary-accent text-white'
                        : 'bg-[var(--color-base-background-light)] text-text-primary border border-border-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-white/70' : 'text-text-muted'
                      }`}
                    >
                      {formatTimeLocal12Hour(message.timestamp)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Show execution logs if executing or if logs exist */}
          {(isExecuting || executionLogs.length > 0) && (
            <ExecutionLogs logs={executionLogs} />
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-[var(--color-base-background-light)] rounded-lg px-4 py-3 border border-border-muted">
                <LoaderSmall />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-[var(--color-base-background-light)] border-t border-border-muted p-4">
          {!selectedPlatform ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-muted cursor-not-allowed">
                Please select a platform to start chatting
              </div>
              <ButtonPlain variant="primary" onClick={() => setPlatformModalOpen(true)}>
                Select Platform
              </ButtonPlain>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isExecuting ? "Executing tasks..." : "Type your message..."}
                className="flex-1 bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
                disabled={isTyping || isExecuting}
              />
              <ButtonIconed
                type="submit"
                variant="primary"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                }
                disabled={!input.trim() || isTyping || isExecuting}
              >
                Send
              </ButtonIconed>
            </form>
          )}
        </div>
      </div>

      {/* Platform Selection Modal */}
      <PlatformSelectionModal
        isOpen={platformModalOpen}
        onClose={() => {
          setPlatformModalOpen(false);
        }}
        onSelect={(platform) => {
          setSelectedPlatform(platform);
          setPlatformModalOpen(false);
        }}
      />
    </div>
  );
};

export default Chat;
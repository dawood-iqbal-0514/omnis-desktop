import React, { useState, useRef, useEffect } from 'react';
import Confetti from 'react-confetti';
import { ButtonPlain, ButtonIconed } from '../components/Button';
import { LoaderSmall } from '../components/Loader';
import { ExecutionPlanCard, ExecutionLogs, ResultRenderer, ChoiceCard } from '../components/Chat';
import { PlatformSelectionModal } from '../components/Modal';
import usePlatformStore from '../store/platformStore';
import { formatTimeLocal12Hour } from '../utils/date';
import { crmAPI } from '../services/api/crm';

const Chat = ({ setActivePage }) => {
  const selectedPlatform = usePlatformStore((state) => state.selectedPlatform);
  const setSelectedPlatform = usePlatformStore((state) => state.setSelectedPlatform);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  
  const [messages, setMessages] = useState([{
    id: 1,
    type: 'bot',
    content: 'Oh great, another human. 🙄 I\'m Omnis Assistant. Tell me what you want to automate — I\'ll figure out the rest.',
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [waitingForAIResponse, setWaitingForAIResponse] = useState(false);
  const [isSubmittingAIResponse, setIsSubmittingAIResponse] = useState(false);
  // Active disambiguation: { candidates, total, start, count, query, followUp, userQuestion, loadingMore }
  const [activeChoice, setActiveChoice] = useState(null);
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

  // Platform selection is now optional — pipeline auto-detects platform

  // Listen for HubSpot AI questions
  useEffect(() => {
    if (!window.automationAPI || !window.automationAPI.onHubSpotAIQuestion) {
      return;
    }

    const handleHubSpotAIQuestion = (event, data) => {
      if (data && data.question) {
        const aiQuestionMessage = {
          id: Date.now(),
          type: 'bot',
          content: `⚙️ System Question: ${data.question}`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiQuestionMessage]);
        setWaitingForAIResponse(true);
      }
    };

    window.automationAPI.onHubSpotAIQuestion(handleHubSpotAIQuestion);

    return () => {
      // Cleanup listener
    };
  }, []);

  const handleHubSpotAIResponse = async (response) => {
    setIsSubmittingAIResponse(true);
    try {
      const result = await window.automationAPI.submitHubSpotAIResponse(response);
      if (result.success) {
        setWaitingForAIResponse(false);
      } else {
        console.error('Failed to submit HubSpot AI response:', result.error);
      }
    } catch (error) {
      console.error('Error submitting HubSpot AI response:', error);
    } finally {
      setIsSubmittingAIResponse(false);
    }
  };

  // Platform selection is optional — pipeline auto-detects from message

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    const userInput = input.trim();
    setInput('');
    inputRef.current?.focus();

    // If waiting for AI response, route input there instead of normal chat
    if (waitingForAIResponse) {
      await handleHubSpotAIResponse(userInput);
      return;
    }

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

      // Get list of actually connected platforms from store
      const connections = usePlatformStore.getState().connections || [];
      const connectedPlatformNames = connections
        .filter(c => c.isConnected)
        .map(c => c.platform);

      // Call pipeline with connected platforms info
      const result = await window.cerebrasAPI.sendMessage(userInput, chatHistory, selectedPlatform?.name, connectedPlatformNames);

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

    const executionStartMessage = {
      id: messages.length + 1,
      type: 'bot',
      content: '🚀 Starting execution...',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, executionStartMessage]);

    try {
      const logs = [];

      // Use crmAPI.executeplan to route steps properly:
      //   API steps    → POST /api/crm/execute (backend middleware chain)
      //   Automation   → window.automationAPI.executeTask (Electron IPC)
      const { results, allSuccess, authError, linkedinChallenge } = await crmAPI.executeplan(executionJSON, {
        onStepStart: (step) => {
          logs.push({
            step: step.order,
            type: step.type,
            status: 'running',
            message: `Step ${step.order}: ${step.description || step.action}...`,
            timestamp: new Date().toISOString(),
          });
          setExecutionLogs([...logs]);
        },
        onStepDone: (step, result) => {
          // Successful steps no longer carry `details` — the ResultRenderer card
          // below shows the data in a properly typed component, so dumping raw
          // fields here would just be noise.
          logs.push({
            step: step.order,
            type: step.type,
            status: 'success',
            message: `${step.description || step.action} completed successfully`,
            timestamp: new Date().toISOString(),
          });
          setExecutionLogs([...logs]);
        },
        onStepError: (step, error) => {
          logs.push({
            step: step.order,
            type: step.type,
            status: 'error',
            message: `${step.description || step.action} failed: ${error.message}`,
            timestamp: new Date().toISOString(),
            details: {
              error: error.message,
              script: step.automationConfig?.script,
              action: step.action,
            },
          });
          setExecutionLogs([...logs]);
        },
      });

      // ── LinkedIn challenge intercept ───────────────────────────────────
      // If any step failed because LinkedIn issued a checkpoint challenge,
      // open the inline verification window, save fresh cookies, then
      // re-fire the WHOLE plan from the top. We exit handleExecute here so
      // the original error doesn't propagate to the result-spec rendering.
      if (linkedinChallenge?.challengeUrl) {
        if (logs.length > 0) {
          setMessages((prev) => [...prev, {
            id: Date.now(),
            type: 'execution-logs',
            logs,
            timestamp: new Date().toISOString(),
          }]);
        }
        const ok = await resolveLinkedInChallenge(linkedinChallenge.challengeUrl);
        setIsExecuting(false);
        setExecutionLogs([]);
        if (ok) {
          // Re-run the plan from scratch with the now-refreshed cookie jar.
          await handleExecute(executionJSON);
        }
        return;
      }

      const newMessages = [];

      if (logs.length > 0) {
        newMessages.push({
          id: Date.now(),
          type: 'execution-logs',
          logs,
          timestamp: new Date().toISOString(),
        });
      }

      // ── Disambiguation gate ────────────────────────────────────────────
      // If the plan carried a `followUp` (e.g. "search_people THEN send_invite")
      // and the last successful step returned a `candidates` array, pause
      // here and show the ChoiceCard. The followUp action will fire after
      // the user picks a candidate via handleChoicePick().
      const lastResult = results[results.length - 1];
      const hasCandidates =
        executionJSON.followUp
        && lastResult?.status === 'success'
        && Array.isArray(lastResult?.data?.candidates)
        && lastResult.data.candidates.length > 0;

      if (allSuccess && hasCandidates) {
        const lastUserMsg = [...messages].reverse().find((m) => m.type === 'user');
        const requested = lastResult.data.candidates.length || 5;
        setActiveChoice({
          candidates:   lastResult.data.candidates,
          total:        lastResult.data.total ?? null,
          start:        lastResult.data.start ?? 0,
          count:        requested,
          // Default to true when ambiguous — better UX to show "Show more" and
          // let the user discover there's nothing left than to hide it falsely.
          hasMore:      lastResult.data.hasMore ?? (lastResult.data.candidates.length >= requested),
          searchAction: executionJSON.steps[executionJSON.steps.length - 1],
          followUp:     executionJSON.followUp,
          platform:     executionJSON.platform,
          userQuestion: lastUserMsg?.content || '',
          loadingMore:  false,
        });
        // newMessages already has the execution-logs entry from above (line
        // 379-386). Just commit those and exit — the ChoiceCard renders
        // below based on activeChoice state.
        setMessages((prev) => [...prev, ...newMessages]);
        return;  // setExecutionLogs([]) runs in finally
      }

      if (authError) {
        // Session expired — show re-login prompt
        newMessages.push({
          id: Date.now() + 1,
          type: 'auth-error',
          content: `Session expired for ${selectedPlatform?.name || executionJSON.platform}. Please re-login to continue.`,
          platform: executionJSON.platform,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Build a structured render spec from the action result(s) and push it
        // as a `result` typed message — the chat renders it via <ResultRenderer/>.
        let resultSpec = null;
        if (allSuccess) {
          const successResults = results
            .filter((r) => r.status === 'success' && r.data)
            .map((r) => ({
              platform: executionJSON.platform,
              actionId: r.step.action,
              data: r.data,
            }));
          const lastUserMsg = [...messages].reverse().find((m) => m.type === 'user');
          const userQuestion = lastUserMsg?.content || '';

          if (successResults.length > 0 && typeof window.cerebrasAPI?.presentResult === 'function') {
            try {
              const res = await window.cerebrasAPI.presentResult(userQuestion, successResults);
              if (res?.success && res?.data?.spec) {
                resultSpec = res.data.spec;
              } else {
                console.warn('[Presenter] no spec returned:', res?.error);
              }
            } catch (err) {
              console.error('[Presenter] threw:', err);
            }
          }
        }

        if (resultSpec) {
          newMessages.push({
            id: Date.now() + 1,
            type: 'result',
            spec: resultSpec,
            timestamp: new Date().toISOString(),
          });
        } else {
          newMessages.push({
            id: Date.now() + 1,
            type: 'bot',
            content: allSuccess
              ? '✅ All tasks completed successfully!'
              : '❌ Execution completed with errors. Please check the logs.',
            timestamp: new Date().toISOString(),
          });
        }
      }

      setMessages(prev => [...prev, ...newMessages]);

      // Reset chatbot role to gatherer for next task
      try {
        await window.cerebrasAPI.resetChatbot();
      } catch (err) {
        console.error('Failed to reset chatbot role:', err);
      }
    } catch (error) {
      console.error('Execution error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        content: `Execution failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);

      try {
        await window.cerebrasAPI.resetChatbot();
      } catch (resetError) {
        console.error('Failed to reset chatbot role:', resetError);
      }
    } finally {
      setIsExecuting(false);
      // The live panel is only useful WHILE executing — once we've pushed the
      // permanent `execution-logs` message into chat above, clear the live state
      // immediately so the same panel doesn't render twice.
      setExecutionLogs([]);
    }
  };

  // ── LinkedIn challenge resolution (inline BrowserWindow) ───────────────────

  /**
   * Open the LinkedIn checkpoint URL in a modal Electron BrowserWindow,
   * let the user verify, capture the resulting cookie jar, and persist it
   * to the backend. Returns true on success, false on cancellation/error.
   *
   * Pattern: backend signals a challenge by attaching `linkedinChallenge:
   * {challengeUrl}` to the error response; this function recovers the
   * session in-app so the next action call works without prompting the
   * user to leave the app.
   */
  const resolveLinkedInChallenge = async (challengeUrl) => {
    if (!window.automationAPI?.resolveLinkedinChallenge) {
      return false;
    }
    setMessages((prev) => [...prev, {
      id: Date.now(),
      type: 'bot',
      content: '🔐 LinkedIn requires verification — opening the verification window…',
      timestamp: new Date().toISOString(),
    }]);

    let currentCookies = {};
    try { currentCookies = await crmAPI.getLinkedinCookies(); } catch {}

    const result = await window.automationAPI.resolveLinkedinChallenge({ challengeUrl, currentCookies });
    if (!result?.success || !result?.cookies) {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `❌ Verification window closed without completing. ${result?.error || 'Try again when ready.'}`,
        timestamp: new Date().toISOString(),
      }]);
      return false;
    }

    try {
      await crmAPI.updateLinkedinCookies(result.cookies);
      // Refresh the platform store so the LinkedIn card flips back to "Work".
      try { await usePlatformStore.getState().fetchUserPlatforms(); } catch {}
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `❌ Verified, but couldn't save the new session: ${err.message}`,
        timestamp: new Date().toISOString(),
      }]);
      return false;
    }

    setMessages((prev) => [...prev, {
      id: Date.now(),
      type: 'bot',
      content: '✅ Verification complete — retrying your action.',
      timestamp: new Date().toISOString(),
    }]);
    return true;
  };

  // ── Disambiguation handlers ────────────────────────────────────────────────

  /**
   * User picked a candidate from the ChoiceCard. Fire the deferred followUp
   * action with the selected profileUrn injected into its parameters.
   */
  const handleChoicePick = async (candidate) => {
    if (!activeChoice) return;
    const { followUp, platform, userQuestion } = activeChoice;
    const slot = followUp.paramSlot || 'profileUrn';
    const params = { ...(followUp.parameters || {}), [slot]: candidate.profileUrn };

    setActiveChoice(null);
    setIsExecuting(true);

    try {
      const res = await crmAPI.executeAction(platform, followUp.actionId, params);

      // Build a confirmation message + result spec.
      let resultSpec = null;
      if (res?.success !== false && typeof window.cerebrasAPI?.presentResult === 'function') {
        try {
          const presented = await window.cerebrasAPI.presentResult(userQuestion, [{
            platform,
            actionId: followUp.actionId,
            data: res?.data ?? res,
          }]);
          if (presented?.success && presented?.data?.spec) resultSpec = presented.data.spec;
        } catch {}
      }
      setMessages((prev) => [
        ...prev,
        resultSpec
          ? { id: Date.now(), type: 'result', spec: resultSpec, timestamp: new Date().toISOString() }
          : {
              id: Date.now(),
              type: 'bot',
              content: res?.success === false
                ? `❌ ${followUp.description} failed: ${res?.error || 'unknown error'}`
                : `✅ ${followUp.description} — ${candidate.name || 'selected person'}`,
              timestamp: new Date().toISOString(),
            },
      ]);
    } catch (err) {
      // LinkedIn checkpoint challenge → resolve inline + retry once.
      if (err.linkedinChallenge?.challengeUrl) {
        const ok = await resolveLinkedInChallenge(err.linkedinChallenge.challengeUrl);
        if (ok) {
          try {
            const retry = await crmAPI.executeAction(platform, followUp.actionId, params);
            setMessages((prev) => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: retry?.success === false
                ? `❌ ${followUp.description} failed: ${retry?.error || 'unknown error'}`
                : `✅ ${followUp.description} — ${candidate.name || 'selected person'}`,
              timestamp: new Date().toISOString(),
            }]);
            setIsExecuting(false);
            return;
          } catch (retryErr) {
            setMessages((prev) => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: `❌ ${followUp.description} failed after verification: ${retryErr.message}`,
              timestamp: new Date().toISOString(),
            }]);
            setIsExecuting(false);
            return;
          }
        }
        // ok===false: user closed/aborted; fall through to generic error message.
      }
      setMessages((prev) => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `❌ ${followUp.description} failed: ${err.message}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Fetch the next page of search results (Show 5 more button).
   * Re-fires the same search step with start += count, appends to candidates.
   */
  const handleChoiceShowMore = async () => {
    if (!activeChoice || activeChoice.loadingMore) return;
    setActiveChoice((prev) => ({ ...prev, loadingMore: true }));
    try {
      const { searchAction, platform, start, count } = activeChoice;
      const nextStart = start + count;
      const nextParams = {
        ...(searchAction.parameters || {}),
        start: nextStart,
        count,
      };
      const res = await crmAPI.executeAction(platform, searchAction.action, nextParams);
      const newCandidates = res?.data?.candidates || [];
      // hasMore: trust the server's flag if it reports one, otherwise infer
      // from "did we get a full page back?" — empty/short page = end of list.
      const reportedHasMore = res?.data?.hasMore;
      const inferredHasMore = newCandidates.length >= count;
      setActiveChoice((prev) => ({
        ...prev,
        candidates:  [...prev.candidates, ...newCandidates],
        start:       res?.data?.start ?? nextStart,
        count:       count,
        total:       res?.data?.total ?? prev.total,
        hasMore:     reportedHasMore != null ? reportedHasMore : inferredHasMore,
        loadingMore: false,
      }));
    } catch (err) {
      console.error('Show more failed:', err);
      setActiveChoice((prev) => prev ? { ...prev, loadingMore: false } : null);
    }
  };

  const handleChoiceCancel = () => {
    setMessages((prev) => [...prev, {
      id: Date.now(),
      type: 'bot',
      content: 'Cancelled — no action taken.',
      timestamp: new Date().toISOString(),
    }]);
    setActiveChoice(null);
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
              ) : message.type === 'result' ? (
                <ResultRenderer spec={message.spec} />
              ) : message.type === 'auth-error' ? (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400 mb-3">{message.content}</p>
                    <button
                      onClick={() => {
                        if (setActivePage) setActivePage('dashboard');
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Re-Login
                    </button>
                    <p className="text-xs text-text-muted mt-2">
                      {formatTimeLocal12Hour(message.timestamp)}
                    </p>
                  </div>
                </div>
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

          {/* Live execution panel — only while executing. Once execution
              finishes we push a permanent `execution-logs` message into chat
              (rendered above), so this transient panel must disappear. */}
          {isExecuting && executionLogs.length > 0 && (
            <ExecutionLogs logs={executionLogs} />
          )}

          {/* Disambiguation choice card — appears when a plan's search step
              returned multiple candidates and we need the user to pick one
              before firing the deferred followUp action (send_invite, etc.). */}
          {activeChoice && (
            <ChoiceCard
              candidates={activeChoice.candidates}
              total={activeChoice.total}
              hasMore={activeChoice.hasMore}
              loadingMore={activeChoice.loadingMore}
              followUpLabel={activeChoice.followUp?.description || 'Continue'}
              onPick={handleChoicePick}
              onShowMore={handleChoiceShowMore}
              onCancel={handleChoiceCancel}
            />
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
            <form onSubmit={handleSend} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isExecuting ? "Executing tasks..." : waitingForAIResponse ? "Type your answer to the system question..." : "Type your message..."}
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
        onNavigateToDashboard={() => {
          setPlatformModalOpen(false);
          if (setActivePage) {
            setActivePage('dashboard');
          }
        }}
      />

    </div>
  );
};

export default Chat;
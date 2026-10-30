import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ChatWorkspace from './components/chat/ChatWorkspace';
import CameraGestureMonitor from './components/vision/CameraGestureMonitor';
import CommandPalette from './components/common/CommandPalette';
import LoadingSpinner from './components/common/LoadingSpinner';
import * as conversationsApi from './services/conversations';
import * as messagesApi from './services/messages';
import * as tasksApi from './services/tasks';
import * as memoriesApi from './services/memories';
import * as assistantApi from './services/assistant';
import * as desktopApi from './services/desktop';
import useInteractionController from './services/useInteractionController';
import './App.css';

// Performance Optimization: Code-split secondary workspaces so initial bundle loads faster
const AgentWorkspace = lazy(() => import('./components/agents/AgentWorkspace'));
const DesktopWorkspace = lazy(() => import('./components/desktop/DesktopWorkspace'));
const TasksWorkspace = lazy(() => import('./components/tasks/TasksWorkspace'));
const MemoryWorkspace = lazy(() => import('./components/memory/MemoryWorkspace'));
const SettingsWorkspace = lazy(() => import('./components/settings/SettingsWorkspace'));

export default function App() {
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'desktop' | 'tasks' | 'memories' | 'settings'
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  // Phase 4 Desktop Automation state
  const [activeDesktopTask, setActiveDesktopTask] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [recalledMemoriesCount, setRecalledMemoriesCount] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [errorMessages, setErrorMessages] = useState(null);
  const [errorTasks, setErrorTasks] = useState(null);
  const [errorMemories, setErrorMemories] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const abortControllerRef = useRef(null);
  const tasksFetchedRef = useRef(false);
  const memoriesFetchedRef = useRef(false);

  // Performance Optimization: Parallelize system health & status queries
  const checkSystemHealth = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const [health, status] = await Promise.all([
        assistantApi.getHealth(),
        assistantApi.getAssistantStatus(),
      ]);
      setHealthData(health);
      setStatusData(status);
      setBackendConnected(true);
    } catch (err) {
      setBackendConnected(false);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await conversationsApi.listConversations(1, 50);
      setConversations(res.items || []);
      setBackendConnected(true);
      return res.items || [];
    } catch (err) {
      setBackendConnected(false);
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    try {
      setLoadingMessages(true);
      setErrorMessages(null);
      const res = await messagesApi.listMessages(convId, 1, 100);
      setMessages(res.items || []);
    } catch (err) {
      setErrorMessages(err.message || 'Failed to load conversation history.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Load tasks on demand
  const loadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      setErrorTasks(null);
      const res = await tasksApi.listTasks(null, 1, 100);
      setTasks(res.items || []);
      tasksFetchedRef.current = true;
    } catch (err) {
      setErrorTasks(err.message || 'Failed to load mission tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Load persistent memories on demand
  const loadMemories = useCallback(async () => {
    try {
      setLoadingMemories(true);
      setErrorMemories(null);
      const res = await memoriesApi.listMemories(1, 100);
      setMemories(res.items || []);
      memoriesFetchedRef.current = true;
    } catch (err) {
      setErrorMemories(err.message || 'Failed to access persistent memory archives.');
    } finally {
      setLoadingMemories(false);
    }
  }, []);

  // Ultra-Fast Initial Startup: Concurrently fetch primary conversation & health; defer secondary datasets
  useEffect(() => {
    // Parallelize essential primary view fetches
    Promise.allSettled([
      checkSystemHealth(),
      loadConversations().then((items) => {
        if (items && items.length > 0) {
          setActiveConversationId(items[0].id);
          return loadMessages(items[0].id);
        }
      }),
    ]);

    // Defer secondary data (tasks & memories) to idle time (4s) so initial render is instantaneous
    let idleId = null;
    let timerId = null;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(() => {
        if (!tasksFetchedRef.current) loadTasks();
        if (!memoriesFetchedRef.current) loadMemories();
      }, { timeout: 4000 });
    } else {
      timerId = setTimeout(() => {
        if (!tasksFetchedRef.current) loadTasks();
        if (!memoriesFetchedRef.current) loadMemories();
      }, 4000);
    }

    return () => {
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) clearTimeout(timerId);
    };
  }, [checkSystemHealth, loadConversations, loadMessages, loadTasks, loadMemories]);

  // Lazy load when tabs are clicked if not already loaded
  useEffect(() => {
    if (activeView === 'tasks' && !tasksFetchedRef.current) {
      loadTasks();
    }
    if (activeView === 'memories' && !memoriesFetchedRef.current) {
      loadMemories();
    }
  }, [activeView, loadTasks, loadMemories]);

  // Stop active generation
  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSendingMessage(false);
    setStreamingText('');
  }, []);

  // Phase 3 Shared Interaction Controller
  const activeTask = tasks.find((t) => t.status === 'in_progress');
  const interaction = useInteractionController({
    onSendMessage: (text) => handleSendMessage(text),
    onHaltGeneration: handleStopGeneration,
    activeTask,
  });

  // Emergency Global Stop control
  const handleGlobalStop = useCallback(async () => {
    handleStopGeneration();
    interaction.stopSpeaking();
    interaction.stopListening();
    setActiveDesktopTask(null);
    try {
      await desktopApi.stopAllDesktopTasks();
    } catch {
      // Ignore network error on stop
    }
  }, [handleStopGeneration, interaction]);

  // Keyboard shortcut listeners:
  // - Ctrl+K: Command Palette (guarded so it never accidentally triggers while typing into a text field)
  // - Ctrl+Shift+H (or Ctrl+Shift+X): Emergency Global Stop (triggers anywhere, including inside text inputs)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Emergency Global Halt: Ctrl+Shift+H or Ctrl+Shift+X
      if (isModifier && e.shiftKey && (key === 'h' || key === 'x')) {
        e.preventDefault();
        handleGlobalStop();
        return;
      }

      // Check if user is typing in a text field
      const target = e.target;
      const isTextInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      // Ordinary shortcuts must NOT trigger while typing into a text input/textarea
      if (isTextInput) {
        return;
      }

      // Command Palette: Ctrl+K / Cmd+K
      if (isModifier && key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalStop]);

  // Select a conversation
  const handleSelectConversation = (convId) => {
    if (sendingMessage) {
      handleStopGeneration();
    }
    interaction.stopSpeaking();
    setActiveConversationId(convId);
    setStreamingText('');
    setRecalledMemoriesCount(0);
    loadMessages(convId);
  };

  // Start new conversation
  const handleNewConversation = async () => {
    try {
      if (sendingMessage) {
        handleStopGeneration();
      }
      interaction.stopSpeaking();
      const newConv = await conversationsApi.createConversation(null);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      setStreamingText('');
      setRecalledMemoriesCount(0);
      setErrorMessages(null);
    } catch (err) {
      setErrorMessages(err.message || 'Could not initiate new conversation session.');
    }
  };

  // Send message with progressive streaming and vocal response
  const handleSendMessage = async (content) => {
    let convId = activeConversationId;

    // Strip leading wake word phrases so voice commands execute cleanly ("Hey Gideon, open calculator" -> "open calculator")
    let cleanContent = (content || '').trim();
    const wakeMatch = cleanContent.match(/^(?:hey\s+|ay\s+|hi\s+|ok\s+)?(?:gideon|gidean|gedion)[,\s]+(.*)$/i);
    if (wakeMatch && wakeMatch[1]) {
      cleanContent = wakeMatch[1].trim();
    }

    try {
      setSendingMessage(true);
      setStreamingText('');
      setErrorMessages(null);
      interaction.stopSpeaking();
      interaction.setProcessing(true, cleanContent);

      // If no conversation is active, create one first
      if (!convId) {
        const newConv = await conversationsApi.createConversation(null);
        convId = newConv.id;
        setActiveConversationId(convId);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Optimistic user message preview
      const tempId = `temp-${Date.now()}`;
      const tempUserMsg = {
        id: tempId,
        conversation_id: convId,
        role: 'user',
        content: cleanContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Prepare cancellation controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      await messagesApi.streamMessage(convId, cleanContent, {
        signal: controller.signal,
        onStart: (startData) => {
          if (startData.user_message) {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? startData.user_message : m))
            );
          }
          if (startData.relevant_memories_count !== undefined) {
            setRecalledMemoriesCount(startData.relevant_memories_count);
          }
          if (interaction.startStreamingSpeech) {
            interaction.startStreamingSpeech();
          }
        },
        onDelta: (delta) => {
          setStreamingText((prev) => prev + delta);
          if (interaction.feedStreamingDelta) {
            interaction.feedStreamingDelta(delta);
          }
        },
        onComplete: (assistantMsg) => {
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingText('');
          setSendingMessage(false);
          abortControllerRef.current = null;
          interaction.setProcessing(false);
          loadConversations();

          // Phase 5: Flush streaming speech queue for incremental playback, or speak fallback
          if (interaction.finishStreamingSpeech) {
            interaction.finishStreamingSpeech(assistantMsg?.content);
          } else if (assistantMsg && assistantMsg.content) {
            interaction.speakResponse(assistantMsg.content);
          }
        },
        onError: (err) => {
          if (interaction.interruptStreamingSpeech) {
            interaction.interruptStreamingSpeech();
          }
          const detail = err.message || 'Failed to obtain generative response from Gideon.';
          setErrorMessages(detail);
          setStreamingText('');
          setSendingMessage(false);
          abortControllerRef.current = null;
          interaction.setProcessing(false);
          if (interaction.settings?.voiceEnabled) {
            const shortNotice = err.errorType === 'AIProviderError'
              ? 'Local AI provider error: service is offline.'
              : 'I encountered an issue generating a response.';
            interaction.speakResponse(shortNotice);
          }
        },
      });
    } catch (err) {
      const detail = err.message || 'Failed to submit message to Gideon.';
      setErrorMessages(detail);
      setSendingMessage(false);
      setStreamingText('');
      abortControllerRef.current = null;
      interaction.setProcessing(false);
      if (interaction.settings?.voiceEnabled) {
        interaction.speakResponse('I could not communicate with the backend server.');
      }
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId) => {
    try {
      if (activeConversationId === convId && sendingMessage) {
        handleStopGeneration();
      }
      interaction.stopSpeaking();
      await conversationsApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));

      if (activeConversationId === convId) {
        const remaining = conversations.filter((c) => c.id !== convId);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
          loadMessages(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      setErrorMessages(err.message || 'Failed to delete conversation.');
    }
  };

  // Phase 4 Desktop Task execution from palette / UI
  const handleExecuteDesktopAction = async (action, params = {}) => {
    try {
      const task = await desktopApi.createDesktopTask(action, params);
      setActiveDesktopTask(task);
      return task;
    } catch (err) {
      setErrorMessages(err.message || 'Desktop action failed to execute.');
      return null;
    }
  };

  const handleCancelDesktopTask = async (taskId) => {
    try {
      const cancelled = await desktopApi.cancelDesktopTask(taskId);
      setActiveDesktopTask(cancelled);
    } catch (err) {
      console.warn('Task cancel error:', err);
    }
  };

  const handleConfirmDesktopTask = async (taskId, action = null, target = null) => {
    try {
      const act = action || activeDesktopTask?.action;
      const tgt = target || activeDesktopTask?.target_app;
      const confirmed = await desktopApi.confirmDesktopTask(taskId, true, null, act, tgt);
      setActiveDesktopTask(confirmed);
    } catch (err) {
      console.warn('Task confirmation error:', err);
    }
  };

  // Task actions (Directive tasks)
  const handleCreateTask = async (taskData) => {
    const newTask = await tasksApi.createTask(taskData);
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const updated = await tasksApi.updateTask(taskId, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setErrorTasks(err.message || 'Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksApi.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setErrorTasks(err.message || 'Failed to delete task.');
    }
  };

  // Memory actions
  const handleCreateMemory = async (memoryData) => {
    try {
      const newMem = await memoriesApi.createMemory(memoryData);
      setMemories((prev) => [newMem, ...prev]);
    } catch (err) {
      setErrorMemories(err.message || 'Failed to record memory directive.');
      throw err;
    }
  };

  const handleUpdateMemory = async (memoryId, memoryData) => {
    try {
      const updated = await memoriesApi.updateMemory(memoryId, memoryData);
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? updated : m)));
    } catch (err) {
      setErrorMemories(err.message || 'Failed to update memory directive.');
      throw err;
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    try {
      await memoriesApi.deleteMemory(memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    } catch (err) {
      setErrorMemories(err.message || 'Failed to delete memory directive.');
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="app-layout">
      {/* Sidebar with Navigation & History */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        activeView={activeView}
        onViewChange={(view) => {
          interaction.stopSpeaking();
          setActiveView(view);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        backendConnected={backendConnected}
        loadingConversations={loadingConversations}
      />

      <div className="app-main">
        <Header
          activeView={activeView}
          activeConversation={activeConversation}
          onNewConversation={handleNewConversation}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          statusData={statusData}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onGlobalStop={handleGlobalStop}
        />

        {activeView === 'chat' && (
          <ChatWorkspace
            conversation={activeConversation}
            messages={messages}
            loading={loadingMessages}
            sending={sendingMessage}
            streamingText={streamingText}
            recalledMemoriesCount={recalledMemoriesCount}
            error={errorMessages}
            statusData={statusData}
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            onRetry={() => activeConversationId && loadMessages(activeConversationId)}
            onPromptSelect={handleSendMessage}
            // Phase 3 & 4 Props
            interactionState={interaction.state}
            audioLevel={interaction.audioLevel}
            speechLevel={interaction.speechLevel}
            speechPulse={interaction.speechPulse}
            currentViseme={interaction.currentViseme}
            visemePose={interaction.visemePose}
            visemeTimeline={interaction.visemeTimeline}
            utteranceId={interaction.utteranceId}
            statusMessage={interaction.statusMessage}
            interimTranscript={interaction.interimTranscript}
            currentSpokenText={interaction.currentSpokenText}
            isListening={interaction.isListening}
            isSpeaking={interaction.isSpeaking}
            onToggleListening={interaction.toggleListening}
            onStopSpeaking={interaction.stopSpeaking}
            onInterruption={interaction.handleInterruption}
            cameraActive={interaction.cameraActive}
            onToggleCamera={interaction.toggleCamera}
            gestureStatus={interaction.gestureStatus}
            detectedGesture={interaction.detectedGesture}
            reducedMotion={interaction.settings.reducedMotion}
            voiceEnabled={interaction.settings.voiceEnabled}
            onToggleVoice={() =>
              interaction.updateSettings({ voiceEnabled: !interaction.settings.voiceEnabled })
            }
            activeTask={activeTask}
            activeDesktopTask={activeDesktopTask}
            onCancelDesktopTask={handleCancelDesktopTask}
            onConfirmDesktopTask={handleConfirmDesktopTask}
            wakeWordEnabled={interaction.settings.wakeWordEnabled}
            conversationalMode={interaction.conversationalMode}
            onToggleConversationalMode={interaction.toggleConversationalMode}
          />
        )}

        <Suspense
          fallback={
            <div className="workspace-loading-fallback">
              <LoadingSpinner text="Accessing subsystem..." />
            </div>
          }
        >
          {activeView === 'agents' && (
            <AgentWorkspace />
          )}

          {activeView === 'desktop' && (
            <DesktopWorkspace
              reducedMotion={interaction.settings.reducedMotion}
              onGlobalStop={handleGlobalStop}
            />
          )}

          {activeView === 'tasks' && (
            <TasksWorkspace
              tasks={tasks}
              loading={loadingTasks}
              error={errorTasks}
              onCreateTask={handleCreateTask}
              onUpdateStatus={handleUpdateTaskStatus}
              onDeleteTask={handleDeleteTask}
              onRefresh={loadTasks}
            />
          )}

          {activeView === 'memories' && (
            <MemoryWorkspace
              memories={memories}
              loading={loadingMemories}
              error={errorMemories}
              onCreateMemory={handleCreateMemory}
              onUpdateMemory={handleUpdateMemory}
              onDeleteMemory={handleDeleteMemory}
              onRefresh={loadMemories}
            />
          )}

          {activeView === 'settings' && (
            <SettingsWorkspace
              statusData={statusData}
              healthData={healthData}
              loading={loadingSettings}
              error={null}
              onRefresh={checkSystemHealth}
              settings={interaction.settings}
              onUpdateSettings={interaction.updateSettings}
              cameraActive={interaction.cameraActive}
              onToggleCamera={interaction.toggleCamera}
              interaction={interaction}
            />
          )}
        </Suspense>

        {/* Phase 3 Floating Optical & Hand Gesture Monitor HUD */}
        <CameraGestureMonitor
          cameraActive={interaction.cameraActive}
          cameraStream={interaction.cameraStream}
          cameraError={interaction.cameraError}
          onToggleCamera={interaction.toggleCamera}
          gestureStatus={interaction.gestureStatus}
          detectedGesture={interaction.detectedGesture}
          gestureConfidence={interaction.gestureConfidence}
          lastGestureAction={interaction.lastGestureAction}
          onStartGestureRecognition={interaction.startGestureRecognition}
          onStopGestureRecognition={interaction.stopGestureRecognition}
          showPreview={interaction.showCameraPreview}
          onClosePreview={() => interaction.setShowCameraPreview(false)}
        />

        {/* Phase 4 21st.dev Command Palette (Ctrl+K) */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onViewChange={(v) => {
            interaction.stopSpeaking();
            setActiveView(v);
          }}
          onExecuteDesktopAction={handleExecuteDesktopAction}
          onGlobalStop={handleGlobalStop}
          onToggleVoice={() =>
            interaction.updateSettings({ voiceEnabled: !interaction.settings.voiceEnabled })
          }
          onToggleListening={interaction.toggleListening}
          onToggleCamera={interaction.toggleCamera}
          onNewConversation={handleNewConversation}
          reducedMotion={interaction.settings.reducedMotion}
        />
      </div>
    </div>
  );
}

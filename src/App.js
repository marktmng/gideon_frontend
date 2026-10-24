import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ChatWorkspace from './components/chat/ChatWorkspace';
import TasksWorkspace from './components/tasks/TasksWorkspace';
import MemoryWorkspace from './components/memory/MemoryWorkspace';
import SettingsWorkspace from './components/settings/SettingsWorkspace';
import * as conversationsApi from './services/conversations';
import * as messagesApi from './services/messages';
import * as tasksApi from './services/tasks';
import * as memoriesApi from './services/memories';
import * as assistantApi from './services/assistant';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'tasks' | 'memories' | 'settings'
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [memories, setMemories] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [statusData, setStatusData] = useState(null);

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

  // Check backend health & status
  const checkSystemHealth = useCallback(async () => {
    try {
      setLoadingSettings(true);
      const health = await assistantApi.getHealth();
      setHealthData(health);
      setBackendConnected(true);

      const status = await assistantApi.getAssistantStatus();
      setStatusData(status);
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

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      setErrorTasks(null);
      const res = await tasksApi.listTasks(null, 1, 100);
      setTasks(res.items || []);
    } catch (err) {
      setErrorTasks(err.message || 'Failed to load mission tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Load persistent memories
  const loadMemories = useCallback(async () => {
    try {
      setLoadingMemories(true);
      setErrorMemories(null);
      const res = await memoriesApi.listMemories(1, 100);
      setMemories(res.items || []);
    } catch (err) {
      setErrorMemories(err.message || 'Failed to access persistent memory archives.');
    } finally {
      setLoadingMemories(false);
    }
  }, []);

  // Initial startup
  useEffect(() => {
    checkSystemHealth();
    loadConversations().then((items) => {
      if (items.length > 0) {
        setActiveConversationId(items[0].id);
        loadMessages(items[0].id);
      }
    });
    loadTasks();
    loadMemories();
  }, [checkSystemHealth, loadConversations, loadMessages, loadTasks, loadMemories]);

  // Select a conversation
  const handleSelectConversation = (convId) => {
    if (sendingMessage) {
      handleStopGeneration();
    }
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

  // Stop/Halt active generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSendingMessage(false);
    setStreamingText('');
  };

  // Send message with progressive streaming
  const handleSendMessage = async (content) => {
    let convId = activeConversationId;

    try {
      setSendingMessage(true);
      setStreamingText('');
      setErrorMessages(null);

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
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Prepare cancellation controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      await messagesApi.streamMessage(convId, content, {
        signal: controller.signal,
        onStart: (startData) => {
          if (startData.user_message) {
            // Replace optimistic message with persisted record
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? startData.user_message : m))
            );
          }
          if (startData.relevant_memories_count !== undefined) {
            setRecalledMemoriesCount(startData.relevant_memories_count);
          }
        },
        onDelta: (delta) => {
          setStreamingText((prev) => prev + delta);
        },
        onComplete: (assistantMsg) => {
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingText('');
          setSendingMessage(false);
          abortControllerRef.current = null;
          loadConversations();
        },
        onError: (err) => {
          setErrorMessages(err.message || 'Failed to obtain generative response from Gideon.');
          setStreamingText('');
          setSendingMessage(false);
          abortControllerRef.current = null;
        },
      });
    } catch (err) {
      setErrorMessages(err.message || 'Failed to submit message to Gideon.');
      setSendingMessage(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId) => {
    try {
      if (activeConversationId === convId && sendingMessage) {
        handleStopGeneration();
      }
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

  // Task actions
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
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        activeView={activeView}
        onViewChange={setActiveView}
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
          />
        )}
      </div>
    </div>
  );
}

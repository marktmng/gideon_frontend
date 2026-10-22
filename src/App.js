import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ChatWorkspace from './components/chat/ChatWorkspace';
import TasksWorkspace from './components/tasks/TasksWorkspace';
import SettingsWorkspace from './components/settings/SettingsWorkspace';
import * as conversationsApi from './services/conversations';
import * as messagesApi from './services/messages';
import * as tasksApi from './services/tasks';
import * as assistantApi from './services/assistant';
import './App.css';

export default function App() {
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'tasks' | 'settings'
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const [errorMessages, setErrorMessages] = useState(null);
  const [errorTasks, setErrorTasks] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  }, [checkSystemHealth, loadConversations, loadMessages, loadTasks]);

  // Select a conversation
  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    loadMessages(convId);
  };

  // Start new conversation
  const handleNewConversation = async () => {
    try {
      const newConv = await conversationsApi.createConversation(null);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      setErrorMessages(null);
    } catch (err) {
      setErrorMessages(err.message || 'Could not initiate new conversation session.');
    }
  };

  // Send message
  const handleSendMessage = async (content) => {
    let convId = activeConversationId;

    try {
      setSendingMessage(true);
      setErrorMessages(null);

      // If no conversation is active, create one first
      if (!convId) {
        const newConv = await conversationsApi.createConversation(null);
        convId = newConv.id;
        setActiveConversationId(convId);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Optimistic user message preview
      const tempUserMsg = {
        id: `temp-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Submit to backend
      const response = await messagesApi.submitMessage(convId, content);

      // Replace with persisted user and assistant messages
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        response.user_message,
        response.assistant_message,
      ]);

      // Refresh conversations list to update titles
      loadConversations();
    } catch (err) {
      setErrorMessages(err.message || 'Failed to obtain response from Gideon.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId) => {
    try {
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
        />

        {activeView === 'chat' && (
          <ChatWorkspace
            conversation={activeConversation}
            messages={messages}
            loading={loadingMessages}
            sending={sendingMessage}
            error={errorMessages}
            onSendMessage={handleSendMessage}
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

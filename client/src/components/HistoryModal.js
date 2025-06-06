// client/src/components/HistoryModal.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getChatSessions, getSessionDetails, deleteSession } from '../services/api';
import './HistoryModal.css'; // Import the new CSS file

const HistoryModal = ({ isOpen, onClose, onSessionSelectToContinue }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'date', 'model'
  const [selectedTags, setSelectedTags] = useState([]);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('markdown');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'archived', 'active'
  const [searchFilters, setSearchFilters] = useState({
    dateRange: 'all', // 'all', 'today', 'week', 'month'
    model: 'all',
    hasTags: false
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalTokens: 0,
    averageTokensPerMessage: 0,
    mostFrequentTags: [],
    modelUsage: {},
    timeDistribution: {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    }
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [sessionMetrics, setSessionMetrics] = useState({
    totalMessages: 0,
    userMessages: 0,
    assistantMessages: 0,
    averageMessageLength: 0,
    totalTokens: 0
  });

  // Add loadSessions function before useEffect
  const loadSessions = useCallback(async () => {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
      setError('Cannot load history: User not logged in.');
      setSessions([]);
      return;
    }

    setIsLoadingSessions(true);
    setError('');
    try {
      const response = await getChatSessions();
      if (!response.data || !response.data.sessionsByDate) {
        console.warn("Received invalid sessions data:", response.data);
        setSessions([]);
        setError('Received invalid session data from server.');
        return;
      }

      const sessionsArray = Object.entries(response.data.sessionsByDate)
        .flatMap(([date, dateSessions]) => 
          Array.isArray(dateSessions) ? dateSessions : []
        )
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

      setSessions(sessionsArray);
      setPagination(response.data.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err.response?.data?.message || 'Failed to load chat history sessions.');
      setSessions([]);
      if (err.response?.status === 401) {
        console.warn("HistoryModal: Received 401 fetching sessions.");
        onClose();
      }
    } finally {
      setIsLoadingSessions(false);
    }
  }, [onClose]);

  // Add handleArchiveSession function
  const handleArchiveSession = useCallback(async (sessionId) => {
    try {
      // Here you would typically call an API to archive the session
      const updatedSessions = sessions.map(session => {
        if (session.sessionId === sessionId) {
          return { ...session, archived: !session.archived };
        }
        return session;
      });
      setSessions(updatedSessions);
    } catch (error) {
      setError('Failed to archive session');
    }
  }, [sessions]);

  // Get unique tags from all sessions
  const allTags = useMemo(() => {
    const tags = new Set();
    sessions.forEach(session => {
      if (session.tags) {
        session.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [sessions]);

  // Enhanced search functionality
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];
    
    // Apply view mode filter
    if (viewMode === 'archived') {
      filtered = filtered.filter(session => session.archived);
    } else if (viewMode === 'active') {
      filtered = filtered.filter(session => !session.archived);
    }
    
    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session => 
        session.preview?.toLowerCase().includes(query) ||
        formatDate(session.updatedAt || session.createdAt).toLowerCase().includes(query) ||
        session.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        session.messages?.some(msg => msg.content.toLowerCase().includes(query))
      );
    }
    
    // Apply date range filter
    if (searchFilters.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        today: new Date(now.setHours(0, 0, 0, 0)),
        week: new Date(now.setDate(now.getDate() - 7)),
        month: new Date(now.setMonth(now.getMonth() - 1))
      };
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.updatedAt || session.createdAt);
        return sessionDate >= ranges[searchFilters.dateRange];
      });
    }
    
    // Apply model filter
    if (searchFilters.model !== 'all') {
      filtered = filtered.filter(session => session.model === searchFilters.model);
    }
    
    // Apply tags filter
    if (searchFilters.hasTags) {
      filtered = filtered.filter(session => session.tags?.length > 0);
    }
    
    // Apply tag selection
    if (selectedTags.length > 0) {
      filtered = filtered.filter(session => 
        session.tags?.some(tag => selectedTags.includes(tag))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  }, [sessions, searchQuery, sortOrder, selectedTags, viewMode, searchFilters]);

  // Group sessions based on selected grouping
  const groupedSessions = useMemo(() => {
    if (groupBy === 'none') return { 'All Sessions': filteredSessions };

    const groups = {};
    filteredSessions.forEach(session => {
      let groupKey;
      if (groupBy === 'date') {
        const date = new Date(session.updatedAt || session.createdAt);
        groupKey = date.toLocaleDateString();
      } else if (groupBy === 'model') {
        groupKey = session.model || 'Unknown Model';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
    });

    return groups;
  }, [filteredSessions, groupBy]);

  // Get unique models from sessions
  const availableModels = useMemo(() => {
    const models = new Set();
    sessions.forEach(session => {
      if (session.model) {
        models.add(session.model);
      }
    });
    return Array.from(models);
  }, [sessions]);

  // Load sessions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadSessions]);

  // Calculate session analytics
  const calculateAnalytics = useCallback((sessions) => {
    if (!Array.isArray(sessions) || sessions.length === 0) return;

    const analytics = {
      totalTokens: 0,
      averageTokensPerMessage: 0,
      mostFrequentTags: [],
      modelUsage: {},
      timeDistribution: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0
      }
    };

    const tagCounts = {};
    let totalMessages = 0;

    sessions.forEach(session => {
      // Count model usage
      const model = session.model || 'Unknown';
      analytics.modelUsage[model] = (analytics.modelUsage[model] || 0) + 1;

      // Count tags
      session.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Calculate time distribution
      const hour = new Date(session.createdAt).getHours();
      if (hour >= 5 && hour < 12) analytics.timeDistribution.morning++;
      else if (hour >= 12 && hour < 17) analytics.timeDistribution.afternoon++;
      else if (hour >= 17 && hour < 22) analytics.timeDistribution.evening++;
      else analytics.timeDistribution.night++;

      // Calculate tokens
      session.messages?.forEach(msg => {
        analytics.totalTokens += msg.tokens || 0;
        totalMessages++;
      });
    });

    // Calculate averages and sort tags
    analytics.averageTokensPerMessage = totalMessages > 0 ? analytics.totalTokens / totalMessages : 0;
    analytics.mostFrequentTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    setAnalytics(analytics);
  }, []);

  // Calculate session metrics
  const calculateSessionMetrics = useCallback((messages) => {
    if (!Array.isArray(messages)) return;

    const metrics = {
      totalMessages: messages.length,
      userMessages: 0,
      assistantMessages: 0,
      totalMessageLength: 0,
      totalTokens: 0
    };

    messages.forEach(msg => {
      if (msg.role === 'user') {
        metrics.userMessages++;
      } else if (msg.role === 'assistant') {
        metrics.assistantMessages++;
      }
      metrics.totalMessageLength += msg.content.length;
      metrics.totalTokens += msg.tokens || 0;
    });

    metrics.averageMessageLength = metrics.totalMessages > 0
      ? Math.round(metrics.totalMessageLength / metrics.totalMessages)
      : 0;

    setSessionMetrics(metrics);
  }, []);

  // Enhanced keyboard shortcuts
  const handleKeyPress = useCallback((event) => {
    if (!isOpen) return;

    const key = event.key.toLowerCase();
    const isModifierPressed = event.ctrlKey || event.metaKey;

    switch (key) {
      case '/':
        event.preventDefault();
        document.querySelector('.search-input')?.focus();
        break;
      case 'escape':
        onClose();
        break;
      case 'a':
        if (!isModifierPressed) {
          event.preventDefault();
          setViewMode(prev => prev === 'archived' ? 'all' : 'archived');
        }
        break;
      case 'b':
        if (!isModifierPressed) {
          event.preventDefault();
          setIsBulkMode(prev => !prev);
        }
        break;
      case 'f':
        if (!isModifierPressed) {
          event.preventDefault();
          setIsSearchExpanded(prev => !prev);
        }
        break;
      case 'r':
        if (!isModifierPressed) {
          event.preventDefault();
          loadSessions();
        }
        break;
      case 's':
        if (!isModifierPressed) {
          event.preventDefault();
          setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
        }
        break;
      case 'g':
        if (!isModifierPressed) {
          event.preventDefault();
          setGroupBy(prev => prev === 'date' ? 'none' : 'date');
        }
        break;
      default:
        // No action needed for other keys
        break;
    }
  }, [isOpen, onClose, loadSessions]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, handleKeyPress]);

  useEffect(() => {
    if (sessions.length > 0) {
      calculateAnalytics(sessions);
    }
  }, [sessions, calculateAnalytics]);

  const handleSelectSession = async (sessionId) => {
    if (isLoadingDetails) return;

    const sessionToLoad = sessions.find(session => session.sessionId === sessionId);
    if (!sessionToLoad) {
        console.error('Session not found in local state:', sessionId);
        return;
    }

    // If a function to continue is provided, call it and close the modal
    if (onSessionSelectToContinue) {
        // Fetch full details before continuing, or pass the sessionToLoad preview?
        // Let's fetch full details to get all messages
        setIsLoadingDetails(true);
        setError('');
        try {
            const detailsResponse = await getSessionDetails(sessionId);
            // Call the parent function with the full session details
            onSessionSelectToContinue(detailsResponse.data);
            // Close the modal
            onClose();
        } catch (err) {
            console.error('Error fetching session details for continuation:', err);
            setError(err.response?.data?.message || 'Failed to load session details for continuation.');
             // Keep the modal open on error
        } finally {
            setIsLoadingDetails(false);
        }
    } else {
        // If no function to continue is provided, just display details in the modal
    setIsLoadingDetails(true);
        setError('');
        setSelectedSession(null); // Clear previous details while loading
        try {
            const detailsResponse = await getSessionDetails(sessionId);
            setSelectedSession(detailsResponse.data);
        } catch (err) {
            console.error('Error fetching session details:', err);
            setError(err.response?.data?.message || 'Failed to load chat session details.');
        } finally {
            setIsLoadingDetails(false);
        }
    }
  };

  const handleDeleteSession = async (sessionId, event) => {
    event.stopPropagation(); // Prevent session selection when clicking delete
    if (!sessionId || isDeleting) return;

    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      await deleteSession(sessionId);
      // Remove the deleted session from the list
      setSessions(prevSessions => prevSessions.filter(session => session.sessionId !== sessionId));
      // Clear selected session if it was the deleted one
      if (selectedSession?.sessionId === sessionId) {
      setSelectedSession(null);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err.response?.data?.message || 'Failed to delete session. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
          throw new Error("Invalid date string");
      }
      return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
      console.warn("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  const handleAddTag = async (sessionId, tag) => {
    try {
      // Here you would typically call an API to add the tag
      const updatedSession = { ...selectedSession, tags: [...(selectedSession.tags || []), tag] };
      setSelectedSession(updatedSession);
      setNewTag('');
    } catch (error) {
      setError('Failed to add tag');
    }
  };

  const handleRemoveTag = async (sessionId, tagToRemove) => {
    try {
      // Here you would typically call an API to remove the tag
      const updatedSession = {
        ...selectedSession,
        tags: selectedSession.tags.filter(tag => tag !== tagToRemove)
      };
      setSelectedSession(updatedSession);
    } catch (error) {
      setError('Failed to remove tag');
    }
  };

  const handleBulkSelect = (sessionId) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedSessions.size} sessions?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedSessions).map(sessionId => deleteSession(sessionId));
      await Promise.all(deletePromises);
      setSessions(prev => prev.filter(session => !selectedSessions.has(session.sessionId)));
      setSelectedSessions(new Set());
      setIsBulkMode(false);
    } catch (error) {
      setError('Failed to delete some sessions');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkTag = async (tag) => {
    try {
      // Here you would typically call an API to add tags to multiple sessions
      const updatedSessions = sessions.map(session => {
        if (selectedSessions.has(session.sessionId)) {
          return {
            ...session,
            tags: [...new Set([...(session.tags || []), tag])]
          };
        }
        return session;
      });
      setSessions(updatedSessions);
      setSelectedSessions(new Set());
      setIsBulkMode(false);
    } catch (error) {
      setError('Failed to add tags to some sessions');
    }
  };

  // Enhanced error handling
  const handleError = useCallback((error, operation) => {
    console.error(`Error during ${operation}:`, error);
    const errorMessage = error.response?.data?.message || error.message || `Failed to ${operation}`;
    setError(errorMessage);
    
    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

  // Export session to different formats
  const exportSession = useCallback(async (sessionId, format) => {
    setIsExporting(true);
    setExportError(null);

    try {
      const session = sessions.find(s => s.sessionId === sessionId);
      if (!session) throw new Error('Session not found');

      let content = '';
      const messages = session.messages || [];

      switch (format) {
        case 'markdown':
          content = messages.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            return `### ${role}\n\n${msg.content}\n\n`;
          }).join('---\n\n');
          break;

        case 'json':
          content = JSON.stringify({
            sessionId: session.sessionId,
            model: session.model,
            createdAt: session.createdAt,
            messages: messages
          }, null, 2);
          break;

        case 'text':
          content = messages.map(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${msg.content}\n\n`;
          }).join('');
          break;

        default:
          throw new Error('Unsupported export format');
      }

      // Create and download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${sessionId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      handleError(error, 'export session');
      setExportError(error.message);
    } finally {
      setIsExporting(false);
    }
  }, [sessions, handleError]);

  // Enhanced session details loading
  const loadSessionDetails = useCallback(async (sessionId) => {
    setIsLoadingDetails(true);
    setError(null);

    try {
      const data = await getSessionDetails(sessionId);
      if (data) {
        setSelectedSession(data);
        calculateSessionMetrics(data.messages);
      } else {
        throw new Error('No session data received');
      }
    } catch (error) {
      handleError(error, 'load session details');
    } finally {
      setIsLoadingDetails(false);
    }
  }, [calculateSessionMetrics, handleError]);

  if (!isOpen) return null;

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="history-modal-close-btn" onClick={onClose} aria-label="Close history">×</button>
        <div className="history-header">
          <h2>Chat History</h2>
          <div className="history-actions">
            <button
              className="keyboard-shortcuts-btn"
              onClick={() => setShowAnalytics(prev => !prev)}
              title="Show analytics"
            >
              <i className="fas fa-keyboard"></i>
            </button>
            <button
              className={`bulk-mode-btn ${isBulkMode ? 'active' : ''}`}
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedSessions(new Set());
              }}
            >
              {isBulkMode ? 'Cancel' : 'Bulk Actions'}
            </button>
          </div>
        </div>

        {showAnalytics && (
          <div className="analytics-panel">
            <div className="analytics-header">
              <h3>Session Analytics</h3>
              <button
                className="close-analytics-btn"
                onClick={() => setShowAnalytics(false)}
              >
                ×
              </button>
            </div>
            <div className="analytics-content">
              <div className="analytics-section">
                <h4>Usage Statistics</h4>
                <div className="stat-grid">
                  <div className="stat-item">
                    <span className="stat-label">Total Tokens</span>
                    <span className="stat-value">{analytics.totalTokens.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg. Tokens/Message</span>
                    <span className="stat-value">{Math.round(analytics.averageTokensPerMessage)}</span>
                  </div>
                </div>
              </div>

              <div className="analytics-section">
                <h4>Model Usage</h4>
                <div className="model-usage-chart">
                  {Object.entries(analytics.modelUsage).map(([model, count]) => (
                    <div key={model} className="model-bar">
                      <span className="model-label">{model}</span>
                      <div className="bar-container">
                        <div
                          className="bar"
                          style={{
                            width: `${(count / sessions.length) * 100}%`
                          }}
                        />
                      </div>
                      <span className="model-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-section">
                <h4>Time Distribution</h4>
                <div className="time-distribution">
                  {Object.entries(analytics.timeDistribution).map(([period, count]) => (
                    <div key={period} className="time-bar">
                      <span className="time-label">{period}</span>
                      <div className="bar-container">
                        <div
                          className="bar"
                          style={{
                            width: `${(count / sessions.length) * 100}%`
                          }}
                        />
                      </div>
                      <span className="time-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-section">
                <h4>Most Used Tags</h4>
                <div className="tag-cloud">
                  {analytics.mostFrequentTags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="history-layout">
          <div className="history-session-list">
            <div className="history-controls">
              <div className="search-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-controls">
                <div className="group-controls">
                  <label>Group by:</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="group-select"
                  >
                    <option value="none">No Grouping</option>
                    <option value="date">Date</option>
                    <option value="model">Model</option>
                  </select>
                </div>

                <div className="tag-filter">
                  <label>Filter by tags:</label>
                  <div className="tag-list">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sort-controls">
                <button
                  className={`sort-btn ${sortOrder === 'newest' ? 'active' : ''}`}
                  onClick={() => setSortOrder('newest')}
                >
                  Newest
                </button>
                <button
                  className={`sort-btn ${sortOrder === 'oldest' ? 'active' : ''}`}
                  onClick={() => setSortOrder('oldest')}
                >
                  Oldest
                </button>
              </div>
            </div>

            {isLoadingSessions ? (
              <p className="history-loading">Loading sessions...</p>
            ) : !Array.isArray(sessions) ? (
              <p className="history-error">Error: Invalid session data received.</p>
            ) : filteredSessions.length === 0 ? (
              <p className="history-empty">
                {searchQuery ? 'No sessions match your search.' : 'No past sessions found.'}
              </p>
            ) : (
              <>
                {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
                  <div key={groupName} className="session-group">
                    {groupBy !== 'none' && <h3 className="group-header">{groupName}</h3>}
                    <ul>
                      {groupSessions.map((session, index) => (
                        <li
                          key={session.sessionId}
                          className={`session-item ${
                            !onSessionSelectToContinue && selectedSession?.sessionId === session.sessionId ? 'active' : ''
                          } ${selectedSessions.has(session.sessionId) ? 'selected' : ''}`}
                          onClick={() => {
                            if (isBulkMode) {
                              handleBulkSelect(session.sessionId);
                            } else {
                              handleSelectSession(session.sessionId);
                            }
                          }}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              if (isBulkMode) {
                                handleBulkSelect(session.sessionId);
                              } else {
                                handleSelectSession(session.sessionId);
                              }
                            }
                          }}
                          role="button"
                        >
                          {isBulkMode && (
                            <div className="session-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedSessions.has(session.sessionId)}
                                onChange={() => handleBulkSelect(session.sessionId)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          <div className="session-header">
                            <div className="session-preview" title={session.preview || 'Chat session'}>
                              {session.preview || 'Chat session'}
                            </div>
                            <button
                              className="delete-session-btn"
                              onClick={(e) => handleDeleteSession(session.sessionId, e)}
                              disabled={isDeleting}
                              title="Delete session"
                              aria-label="Delete session"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                          <div className="session-info">
                            <div className="session-date">
                              {formatDate(session.updatedAt || session.createdAt)}
                            </div>
                            <div className="session-stats">
                              <span className="message-count">{session.messageCount || 0} messages</span>
                              {session.model && <span className="model-used">{session.model}</span>}
                            </div>
                            {session.tags && session.tags.length > 0 && (
                              <div className="session-tags">
                                {session.tags.map(tag => (
                                  <span key={tag} className="tag">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {pagination.totalPages > 1 && (
                  <div className="history-pagination">
                    <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="history-session-details">
            <h3>Session Details</h3>
            {isLoadingDetails ? (
              <p className="history-loading">Loading session details...</p>
            ) : selectedSession ? (
              <>
                <div className="session-details-header">
                  <div className="session-details-info">
                    <div className="session-details-date">
                      {formatDate(selectedSession.updatedAt || selectedSession.createdAt)}
                    </div>
                    <div className="session-details-stats">
                      <span>{selectedSession.messageCount || 0} messages</span>
                      {selectedSession.model && <span className="model-used">{selectedSession.model}</span>}
                    </div>
                  </div>
                  <div className="session-details-actions">
                    {onSessionSelectToContinue && (
                      <button
                        className="continue-session-btn"
                        onClick={() => onSessionSelectToContinue(selectedSession)}
                      >
                        Continue Session
                      </button>
                    )}
                  </div>
                </div>

                <div className="session-tags-section">
                  <div className="tags-header">
                    <h4>Tags</h4>
                    <button
                      className="edit-tags-btn"
                      onClick={() => setIsEditingTags(!isEditingTags)}
                    >
                      {isEditingTags ? 'Done' : 'Edit Tags'}
                    </button>
                  </div>
                  <div className="tags-content">
                    {isEditingTags ? (
                      <div className="tag-editor">
                        <div className="existing-tags">
                          {selectedSession.tags?.map(tag => (
                            <span key={tag} className="tag">
                              {tag}
                              <button
                                className="remove-tag-btn"
                                onClick={() => handleRemoveTag(selectedSession.sessionId, tag)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="add-tag">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add new tag..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newTag.trim()) {
                                handleAddTag(selectedSession.sessionId, newTag.trim());
                              }
                            }}
                          />
                          <button
                            className="add-tag-btn"
                            onClick={() => {
                              if (newTag.trim()) {
                                handleAddTag(selectedSession.sessionId, newTag.trim());
                              }
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="tags-display">
                        {selectedSession.tags?.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                        {(!selectedSession.tags || selectedSession.tags.length === 0) && (
                          <span className="no-tags">No tags</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="session-messages">
                  <h4>Messages</h4>
                  {selectedSession.messages?.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                    >
                      <div className="message-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="session-details">
                  <div className="session-header">
                    <h3>Session Details</h3>
                    <div className="session-actions">
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="export-format-select"
                      >
                        <option value="markdown">Markdown</option>
                        <option value="json">JSON</option>
                        <option value="text">Plain Text</option>
                      </select>
                      <button
                        className="export-btn"
                        onClick={() => exportSession(selectedSession.sessionId, exportFormat)}
                        disabled={isExporting}
                      >
                        {isExporting ? 'Exporting...' : 'Export'}
                      </button>
                    </div>
                  </div>

                  <div className="session-metrics">
                    <div className="metric-item">
                      <span className="metric-label">Total Messages</span>
                      <span className="metric-value">{sessionMetrics.totalMessages}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">User Messages</span>
                      <span className="metric-value">{sessionMetrics.userMessages}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Assistant Messages</span>
                      <span className="metric-value">{sessionMetrics.assistantMessages}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Avg. Message Length</span>
                      <span className="metric-value">{sessionMetrics.averageMessageLength} chars</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Total Tokens</span>
                      <span className="metric-value">{sessionMetrics.totalTokens}</span>
                    </div>
                  </div>

                  {exportError && (
                    <div className="export-error">
                      <i className="fas fa-exclamation-circle"></i>
                      <span>{exportError}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="history-empty">Select a session to view details</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;

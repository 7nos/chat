import React, { useState, useCallback, useRef, useEffect } from 'react';
import '../styles/SpeechToText.css';

const SpeechToText = ({ onTranscript, userId }) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  
  const isComponentMounted = useRef(true);
  const recognitionRef = useRef(null);
  const setupRecognitionRef = useRef(null);
  const safeStartRecognitionRef = useRef(null);
  const cleanupRef = useRef(null);
  const abortCountRef = useRef(0);

  const cleanupTimeouts = useCallback(() => {
    // Cleanup logic here
  }, []);

  const safeStopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Error stopping recognition:', err);
      }
    }
  }, []);

  // Setup recognition instance
  const setupRecognition = useCallback(() => {
    if (!isComponentMounted.current) {
      console.log('Component unmounted, skipping recognition setup');
      return null;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (!isComponentMounted.current) return;
      console.log('Recognition started');
      setConnectionState('connected');
      setIsRecognitionActive(true);
    };

    recognition.onend = () => {
      if (!isComponentMounted.current) return;
      console.log('Recognition ended');
      setIsRecognitionActive(false);
      setConnectionState('disconnected');
    };

    recognition.onerror = (event) => {
      if (!isComponentMounted.current) return;
      console.error('Recognition error:', event.error);
      setConnectionState('error');
      setIsRecognitionActive(false);
    };

    recognition.onresult = (event) => {
      if (!isComponentMounted.current) return;
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      onTranscript(transcript);
    };

    return recognition;
  }, [isComponentMounted, onTranscript, setConnectionState, setIsRecognitionActive]);

  // Update setupRecognition ref whenever it changes
  useEffect(() => {
    setupRecognitionRef.current = setupRecognition;
  }, [setupRecognition]);

  // Function to safely start recognition
  const safeStartRecognition = useCallback(() => {
    if (!isComponentMounted.current || !userId) {
      console.log('Cannot start recognition: component unmounted or no user');
      return false;
    }

    if (!recognitionRef.current) {
      const recognition = setupRecognitionRef.current?.();
      if (!recognition) return false;
      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
      setIsRecognitionActive(true);
      setConnectionState('connecting'); // Change to 'connecting' first
      abortCountRef.current = 0;
      return true;
    } catch (err) {
      console.error('Error starting recognition:', err);
      setConnectionState('error');
      setIsRecognitionActive(false);
      return false;
    }
  }, [userId]); // Remove connectionState from dependencies as it's only used in the function body

  // Update safeStartRecognition ref whenever it changes
  useEffect(() => {
    safeStartRecognitionRef.current = safeStartRecognition;
  }, [safeStartRecognition]);

  // Effect for cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, performing final cleanup...');
      isComponentMounted.current = false;
      cleanupTimeouts();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.warn('Error stopping recognition during unmount:', err);
        }
        recognitionRef.current = null;
      }
    };
  }, [cleanupTimeouts]);

  // Effect to handle userId changes (logout)
  useEffect(() => {
    if (!userId) {
      console.log('User logged out, cleaning up speech recognition...');
      cleanupRef.current?.();
      setIsListening(false);
    }
  }, [userId]);

  // Effect to handle isListening changes
  useEffect(() => {
    let isEffectActive = true;

    const startRecognition = async () => {
      if (!userId || !isComponentMounted.current || !isEffectActive) {
        console.log('Cannot start recognition: Invalid state');
        return;
      }

      try {
        const recognition = setupRecognitionRef.current?.();
        if (!recognition) {
          throw new Error('Failed to setup recognition');
        }

        // Double check component is still mounted after async operation
        if (!isComponentMounted.current || !isEffectActive) {
          console.log('Component unmounted during setup, aborting recognition start');
          return;
        }

        setConnectionState('connecting');
        if (!safeStartRecognitionRef.current?.()) {
          throw new Error('Failed to start recognition');
        }
      } catch (err) {
        console.error('Error starting recognition:', err);
        if (isComponentMounted.current && isEffectActive) {
          requestAnimationFrame(() => {
            if (isComponentMounted.current && isEffectActive) {
              setError('Failed to start speech recognition. Please try again.');
              setIsListening(false);
            }
          });
        }
      }
    };

    if (isListening && userId && isComponentMounted.current) {
      startRecognition();
    } else if (!isListening) {
      cleanupRef.current?.();
    }

    return () => {
      isEffectActive = false;
      cleanupTimeouts();
      if (!isListening) {
        safeStopRecognition();
        if (isComponentMounted.current) {
          requestAnimationFrame(() => {
            if (isComponentMounted.current) {
              setConnectionState('disconnected');
            }
          });
        }
      }
    };
  }, [isListening, userId, cleanupTimeouts, safeStopRecognition]);

  const toggleListening = useCallback(() => {
    if (!userId) {
      setError('Please log in to use speech recognition');
      return;
    }
    
    if (!isComponentMounted.current) {
      console.log('Component is unmounting, ignoring toggle request');
      return;
    }

    const newListeningState = !isListening;
    
    if (!newListeningState) {
      cleanupRef.current?.();
      return;
    }

    cleanupRef.current?.();
    
    requestAnimationFrame(() => {
      if (!isComponentMounted.current) {
        console.log('Component unmounted during RAF, aborting toggle');
        return;
      }
      
      setIsListening(true);
      setConnectionState('connecting');
    });
  }, [isListening, userId]);

  return (
    <div className="speech-to-text">
      <button
        onClick={toggleListening}
        className={`mic-button ${isListening ? 'active' : ''} ${connectionState}`}
        title={isListening ? 'Stop listening' : 'Start listening'}
      >
        <i className={`fas fa-microphone ${isListening ? 'fa-beat' : ''}`}></i>
        {isListening ? ' Stop' : ' Start'} Listening
        {connectionState === 'connecting' && ' (Connecting...)'}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default SpeechToText;
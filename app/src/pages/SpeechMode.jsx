// Speech Mode Page - Voice input for habits and tasks
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { createHabit, createTask } from '../services/sheets';

export const SpeechMode = () => {
  const navigate = useNavigate();
  const { setHabits, habits, setTasks, tasks } = useApp();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  
  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError('Speech recognition is not supported in this browser.');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript) {
        analyzeTranscript(transcript);
      }
    } else {
      setTranscript('');
      setAnalysis(null);
      setError(null);
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };
  
  // Simple NLP analysis
  const analyzeTranscript = (text) => {
    setIsProcessing(true);
    
    const lowerText = text.toLowerCase();
    let type = 'task';
    let name = text;
    let time = null;
    let frequency = 'once';
    
    // Detect if it's a habit
    if (lowerText.includes('every day') || lowerText.includes('daily') || 
        lowerText.includes('habit') || lowerText.includes('every morning') ||
        lowerText.includes('every night')) {
      type = 'habit';
      frequency = 'daily';
    }
    
    // Extract time
    const timeMatch = text.match(/(\d{1,2})\s*(am|pm|AM|PM)/i) || 
                      text.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      time = timeMatch[0];
    }
    
    // Clean up the name
    name = text
      .replace(/remind me to/i, '')
      .replace(/every day/i, '')
      .replace(/daily/i, '')
      .replace(/at \d{1,2}(:\d{2})?\s*(am|pm)?/i, '')
      .replace(/create a (habit|task)/i, '')
      .trim();
    
    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);
    
    setAnalysis({
      type,
      name,
      time,
      frequency,
      originalText: text,
    });
    
    setIsProcessing(false);
  };
  
  const handleConfirm = async () => {
    if (!analysis) return;
    
    setIsProcessing(true);
    try {
      if (analysis.type === 'habit') {
        const habit = await createHabit({
          name: analysis.name,
          icon: 'check_circle',
          frequency: analysis.frequency,
        });
        setHabits([...habits, habit]);
      } else {
        const task = await createTask({
          title: analysis.name,
          dueTime: analysis.time || '',
          dueDate: new Date().toISOString().split('T')[0],
        });
        setTasks([...tasks, task]);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create:', error);
      setError('Failed to create. Please try again.');
    }
    setIsProcessing(false);
  };
  
  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary/30 selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 dark:text-white" style={{ fontSize: '24px' }}>
            close
          </span>
        </button>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
          Speech Mode
        </h2>
        <div className="w-10" />
      </header>
      
      <main className="flex-1 flex flex-col px-4 pb-6 gap-6 relative">
        {/* Transcript Display */}
        {transcript && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1 pl-1">
              I heard:
            </p>
            <h1 className="text-[28px] font-bold text-slate-900 dark:text-white leading-[1.2]">
              "{transcript}"
            </h1>
          </div>
        )}
        
        {/* Analysis Result */}
        {analysis && (
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>
                auto_awesome
              </span>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Analysis Complete
              </span>
            </div>
            
            <div className="bg-white dark:bg-[#1a2e24] rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-white/5 flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">
                      {analysis.type === 'habit' ? 'repeat' : 'task_alt'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Type</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white capitalize">
                      {analysis.type}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Name</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{analysis.name}</span>
              </div>
              
              {analysis.time && (
                <div className="flex items-center gap-3 bg-black/5 dark:bg-black/20 p-3 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-medium">Time</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{analysis.time}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="w-full cursor-pointer flex items-center justify-center rounded-lg h-12 bg-primary hover:bg-[#0fd671] text-background-dark gap-2 text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span className="material-symbols-outlined">check</span>
                {isProcessing ? 'Creating...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* Listening Indicator */}
        {!transcript && !analysis && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <p className="text-slate-500 dark:text-slate-400 text-base mb-2">
              {isListening ? 'Listening... Speak now!' : 'Tap the microphone to start'}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Try saying: "Remind me to drink water every day at 8 AM"
            </p>
          </div>
        )}
        
        {/* Microphone Button */}
        <div className="flex-1 flex items-end justify-center pb-8">
          <button
            onClick={toggleListening}
            disabled={!recognitionRef.current || isProcessing}
            className={`size-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
              isListening
                ? 'bg-red-500 shadow-red-500/40 scale-110 animate-pulse'
                : 'bg-primary shadow-primary/40 hover:scale-105 active:scale-95'
            } disabled:opacity-50`}
          >
            <span className="material-symbols-outlined text-4xl text-white dark:text-background-dark">
              {isListening ? 'stop' : 'mic'}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default SpeechMode;

// Screenshot to Alarm Page - OCR-based task creation
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { analyzeImage, parseEventsFromText, fileToBase64 } from '../services/vision';
import { createTask } from '../services/sheets';
import { LoadingSpinner } from '../components';

export const ScreenshotAlarm = () => {
  const navigate = useNavigate();
  const { setTasks, tasks } = useApp();
  const fileInputRef = useRef(null);
  
  const [step, setStep] = useState('upload'); // upload, processing, review, success
  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [detectedEvents, setDetectedEvents] = useState([]);
  const [ocrText, setOcrText] = useState('');
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Convert to base64 and process
    try {
      setError(null);
      setStep('processing');
      
      const base64 = await fileToBase64(file);
      setImageData(base64);
      
      // Call Vision API
      const extractedText = await analyzeImage(base64);
      setOcrText(extractedText);
      
      if (!extractedText) {
        setError('No text detected in the image. Try a clearer screenshot.');
        setStep('upload');
        return;
      }

      // Parse events from text
      const events = parseEventsFromText(extractedText);
      setDetectedEvents(events);
      
      if (events.length === 0) {
        setError('No dates or events detected. Try a screenshot with visible dates or times.');
        setStep('upload');
        return;
      }

      setStep('review');
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err.message || 'Failed to process image');
      setStep('upload');
    }
  };

  // Toggle event selection
  const toggleEventSelection = (eventId) => {
    setDetectedEvents(events =>
      events.map(e =>
        e.id === eventId ? { ...e, selected: !e.selected } : e
      )
    );
  };

  // Update event details
  const updateEvent = (eventId, field, value) => {
    setDetectedEvents(events =>
      events.map(e =>
        e.id === eventId ? { ...e, [field]: value } : e
      )
    );
  };

  // Create tasks from selected events
  const handleCreateTasks = async () => {
    const selectedEvents = detectedEvents.filter(e => e.selected);
    if (selectedEvents.length === 0) return;

    setIsCreating(true);
    try {
      const newTasks = [];
      for (const event of selectedEvents) {
        const task = await createTask({
          title: event.title,
          dueDate: event.date,
          dueTime: event.time,
          priority: 'medium',
          category: 'general',
          description: `Created from screenshot OCR`,
        });
        newTasks.push(task);
      }
      
      setTasks([...tasks, ...newTasks]);
      setCreatedCount(newTasks.length);
      setStep('success');
    } catch (err) {
      console.error('Error creating tasks:', err);
      setError('Failed to create tasks. Please try again.');
    }
    setIsCreating(false);
  };

  // Reset and start over
  const handleReset = () => {
    setStep('upload');
    setImageData(null);
    setImagePreview(null);
    setDetectedEvents([]);
    setOcrText('');
    setError(null);
    setCreatedCount(0);
  };

  const selectedCount = detectedEvents.filter(e => e.selected).length;

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display antialiased overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-sm border-b border-gray-200 dark:border-white/5">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 dark:text-white">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">
          Screenshot to Alarm
        </h2>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col px-4 pb-6 gap-4 max-w-md mx-auto w-full">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 mt-4">
            <span className="material-symbols-outlined text-lg shrink-0">error</span>
            <p>{error}</p>
          </div>
        )}

        {/* UPLOAD STATE */}
        {step === 'upload' && (
          <div className="flex-1 flex flex-col justify-center gap-6 py-8">
            {/* Upload Zone */}
            <section
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-surface-dark/30 px-6 py-12 relative overflow-hidden group cursor-pointer hover:border-primary dark:hover:border-primary transition-colors"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
              <div className="flex flex-col items-center gap-3 relative z-10">
                <div className="p-4 bg-primary/10 rounded-full mb-2">
                  <span className="material-symbols-outlined text-primary text-[40px]">add_photo_alternate</span>
                </div>
                <h3 className="text-xl font-bold leading-tight tracking-tight text-center text-slate-900 dark:text-white">
                  Upload a screenshot
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-relaxed text-center max-w-[280px]">
                  AI will automatically detect dates, times, and deadlines.
                </p>
              </div>
            </section>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-6 bg-primary hover:bg-primary/90 transition-all text-background-dark text-base font-bold tracking-wide shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-xl">image</span>
              <span>Select from Gallery</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 px-6 bg-slate-200 dark:bg-surface-dark hover:bg-slate-300 dark:hover:bg-white/10 transition-all text-slate-900 dark:text-white text-sm font-bold tracking-wide"
            >
              <span className="material-symbols-outlined text-xl">photo_camera</span>
              <span>Open Camera</span>
            </button>
          </div>
        )}

        {/* PROCESSING STATE */}
        {step === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
            {imagePreview && (
              <div className="w-full max-w-[200px] aspect-[3/4] rounded-xl overflow-hidden shadow-lg opacity-50">
                <img src={imagePreview} alt="Uploaded" className="w-full h-full object-cover" />
              </div>
            )}
            <LoadingSpinner message="Analyzing image with AI..." />
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
              Extracting text and detecting dates...
            </p>
          </div>
        )}

        {/* REVIEW STATE */}
        {step === 'review' && (
          <div className="flex flex-col gap-4 py-4">
            {/* Image Preview */}
            {imagePreview && (
              <div className="relative w-full aspect-[16/9] bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-white/5">
                <img src={imagePreview} alt="Screenshot" className="w-full h-full object-cover opacity-80" />
                <div className="absolute top-3 left-3 bg-primary text-background-dark text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Scanned
                </div>
              </div>
            )}

            {/* Detected Events */}
            <div className="flex items-center justify-between mt-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Suggested Tasks</h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {selectedCount} selected
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {detectedEvents.map((event) => (
                <div
                  key={event.id}
                  className={`bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border transition-all ${
                    event.selected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-gray-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleEventSelection(event.id)}
                      className={`mt-1 size-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        event.selected
                          ? 'bg-primary text-background-dark'
                          : 'bg-gray-200 dark:bg-white/10 text-gray-400'
                      }`}
                    >
                      {event.selected && <span className="material-symbols-outlined text-lg">check</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={event.title}
                        onChange={(e) => updateEvent(event.id, 'title', e.target.value)}
                        className="w-full bg-transparent border-0 p-0 text-base font-bold text-slate-900 dark:text-white focus:ring-0 focus:outline-none"
                      />
                      
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
                          <input
                            type="date"
                            value={event.date}
                            onChange={(e) => updateEvent(event.id, 'date', e.target.value)}
                            className="bg-transparent border-0 p-0 text-slate-600 dark:text-slate-300 focus:ring-0 focus:outline-none text-sm"
                          />
                        </div>
                        
                        {event.time && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="material-symbols-outlined text-primary text-base">schedule</span>
                            <input
                              type="time"
                              value={event.time}
                              onChange={(e) => updateEvent(event.id, 'time', e.target.value)}
                              className="bg-transparent border-0 p-0 text-slate-600 dark:text-slate-300 focus:ring-0 focus:outline-none text-sm"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="material-symbols-outlined text-primary text-xs">auto_awesome</span>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          "{event.sourceSnippet}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={handleCreateTasks}
                disabled={selectedCount === 0 || isCreating}
                className="w-full flex items-center justify-center gap-2 rounded-xl h-14 bg-primary hover:bg-primary/90 text-background-dark font-bold text-base shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isCreating ? (
                  <>
                    <div className="size-5 border-2 border-background-dark border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">add_task</span>
                    <span>Create {selectedCount} Task{selectedCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-slate-200 dark:bg-surface-dark text-slate-700 dark:text-white font-medium text-sm hover:bg-slate-300 dark:hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                <span>Scan Another</span>
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {step === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12 text-center">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {createdCount} Task{createdCount !== 1 ? 's' : ''} Created!
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-2">
                Your tasks have been added to your list.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                onClick={() => navigate('/tasks')}
                className="w-full flex items-center justify-center gap-2 rounded-xl h-14 bg-primary hover:bg-primary/90 text-background-dark font-bold text-base shadow-lg shadow-primary/20 transition-all"
              >
                <span className="material-symbols-outlined">task_alt</span>
                <span>View Tasks</span>
              </button>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-slate-200 dark:bg-surface-dark text-slate-700 dark:text-white font-medium text-sm hover:bg-slate-300 dark:hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                <span>Scan Another Screenshot</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScreenshotAlarm;

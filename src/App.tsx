import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Heart, MapPin, Users, Star, Clock, Plus, Edit3, X, Video, Play, Pause, RotateCcw, Download, ChevronLeft } from 'lucide-react';

interface Stats {
  weeksLived: number;
  totalWeeks: number;
  weeksRemaining: number;
  percentageLived: number;
  daysLived: number;
  yearsLived: number;
  birthDate: string;
}

interface Memory {
  date: string;
  title: string;
  description: string;
  emotion: string;
  location: string;
  people: string;
  category: string;
  videoBlob: Blob | null;
  videoUrl: string;
}

export default function MemoryTimeline() {
  const [step, setStep] = useState(1);
  const [birthdate, setBirthdate] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [viewMode, setViewMode] = useState<'annual' | 'monthly' | 'weekly' | 'daily'>('annual');
  const [selectedPeriod, setSelectedPeriod] = useState<string | number | null>(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [currentMemory, setCurrentMemory] = useState<Memory>({
    date: '',
    title: '',
    description: '',
    emotion: 'happy',
    location: '',
    people: '',
    category: 'life',
    videoBlob: null,
    videoUrl: ''
  });
  
  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const emotions = {
    happy: { icon: '😊', color: 'bg-yellow-400', name: 'Happy' },
    excited: { icon: '🤩', color: 'bg-orange-400', name: 'Excited' },
    peaceful: { icon: '😌', color: 'bg-green-400', name: 'Peaceful' },
    grateful: { icon: '🙏', color: 'bg-blue-400', name: 'Grateful' },
    loved: { icon: '❤️', color: 'bg-red-400', name: 'Loved' },
    accomplished: { icon: '🎉', color: 'bg-purple-400', name: 'Accomplished' },
    thoughtful: { icon: '🤔', color: 'bg-gray-400', name: 'Thoughtful' },
    adventurous: { icon: '🗺️', color: 'bg-teal-400', name: 'Adventurous' }
  };

  const categories = {
    life: { icon: Heart, name: 'Life' },
    travel: { icon: MapPin, name: 'Travel' },
    people: { icon: Users, name: 'People' },
    achievement: { icon: Star, name: 'Achievement' },
    moment: { icon: Clock, name: 'Moment' }
  };

  // Initialize data on mount
  useEffect(() => {
    mountedRef.current = true;
    
    // Initialize with some sample data if needed
    const sampleBirthdate = '1990-01-01';
    setBirthdate(sampleBirthdate);
    setStats(calculateStats(sampleBirthdate));
    setStep(2);
    
    return () => {
      mountedRef.current = false;
    };
  }, [calculateStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Cleanup video URLs to prevent memory leaks
      memories.forEach(memory => {
        if (memory.videoUrl) {
          URL.revokeObjectURL(memory.videoUrl);
        }
      });
    };
  }, [memories, stopCamera]);

  const calculateStats = useCallback((date: string): Stats => {
    const birthDate = new Date(date);
    const today = new Date();
    
    const msInWeek = 1000 * 60 * 60 * 24 * 7;
    const weeksLived = Math.floor((today.getTime() - birthDate.getTime()) / msInWeek);
    
    const totalWeeks = 4160; // ~80 years
    const weeksRemaining = Math.max(0, totalWeeks - weeksLived);
    const percentageLived = Math.min(100, Math.round((weeksLived / totalWeeks) * 100));
    
    const msInDay = 1000 * 60 * 60 * 24;
    const daysLived = Math.floor((today.getTime() - birthDate.getTime()) / msInDay);
    
    const yearsLived = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    
    return {
      weeksLived,
      totalWeeks,
      weeksRemaining,
      percentageLived,
      daysLived,
      yearsLived,
      birthDate: date
    };
  }, []);

  const getMemoryForDate = useCallback((date: string) => {
    return memories.find(m => m.date === date);
  }, [memories]);

  const getMemoriesForPeriod = useCallback((period: string | number) => {
    if (viewMode === 'annual') {
      return memories.filter(m => m.date.startsWith(period.toString()));
    } else if (viewMode === 'monthly') {
      return memories.filter(m => m.date.startsWith(period.toString()));
    } else if (viewMode === 'weekly') {
      const weekStart = new Date(period.toString());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return memories.filter(m => {
        const memDate = new Date(m.date);
        return memDate >= weekStart && memDate <= weekEnd;
      });
    }
    return [];
  }, [memories, viewMode]);

  const handleSubmit = useCallback(() => {
    if (birthdate) {
      setStats(calculateStats(birthdate));
      setStep(2);
    }
  }, [birthdate, calculateStats]);

  const openMemoryModal = useCallback((date: string) => {
    const existingMemory = getMemoryForDate(date);
    if (existingMemory) {
      setCurrentMemory(existingMemory);
    } else {
      setCurrentMemory({
        date: date,
        title: '',
        description: '',
        emotion: 'happy',
        location: '',
        people: '',
        category: 'life',
        videoBlob: null,
        videoUrl: ''
      });
    }
    setShowMemoryModal(true);
  }, [getMemoryForDate]);

  const saveMemory = useCallback(() => {
    if (!mountedRef.current) return;
    
    const updatedMemories = memories.filter(m => m.date !== currentMemory.date);
    if (currentMemory.title.trim()) {
      updatedMemories.push({ ...currentMemory });
    }
    setMemories(updatedMemories);
    setShowMemoryModal(false);
    stopCamera();
    resetMemoryForm();
  }, [memories, currentMemory, stopCamera, resetMemoryForm]);

  const resetMemoryForm = useCallback(() => {
    if (!mountedRef.current) return;
    
    setCurrentMemory({
      date: '',
      title: '',
      description: '',
      emotion: 'happy',
      location: '',
      people: '',
      category: 'life',
      videoBlob: null,
      videoUrl: ''
    });
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
    setCameraError(null);
  }, []);

  // Video recording functions
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current && mountedRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current || !mountedRef.current) return;

    try {
      const recorder = new MediaRecorder(streamRef.current);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (!mountedRef.current) return;
        
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        setCurrentMemory(prev => ({
          ...prev,
          videoBlob: blob,
          videoUrl: url
        }));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsPaused(false);

      // Timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        if (mountedRef.current && !isPaused) {
          setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setCameraError('Unable to start recording. Please try again.');
    }
  }, [isPaused]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setMediaRecorder(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  }, [mediaRecorder]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
    }
  }, [mediaRecorder]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
    }
  }, [mediaRecorder]);

  const retakeVideo = useCallback(() => {
    if (currentMemory.videoUrl) {
      URL.revokeObjectURL(currentMemory.videoUrl);
    }
    setCurrentMemory(prev => ({
      ...prev,
      videoBlob: null,
      videoUrl: ''
    }));
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
  }, [currentMemory.videoUrl]);

  const downloadVideo = useCallback(() => {
    if (currentMemory.videoBlob) {
      const url = URL.createObjectURL(currentMemory.videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-${currentMemory.date}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [currentMemory.videoBlob, currentMemory.date]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const renderAnnualView = () => {
    if (!stats) return null;
    
    const currentYear = new Date().getFullYear();
    const birthYear = new Date(stats.birthDate).getFullYear();
    const years = [];
    
    for (let year = birthYear; year <= currentYear + 10; year++) {
      const isPast = year < currentYear;
      const isCurrent = year === currentYear;
      const yearMemories = getMemoriesForPeriod(year.toString());
      
      let cellClass = "w-8 h-8 m-1 rounded-lg transition-all cursor-pointer hover:scale-110 border-2 flex items-center justify-center text-xs font-medium ";
      
      if (yearMemories.length > 0) {
        cellClass += "bg-blue-500 text-white border-blue-600 shadow-md ";
      } else if (isPast) {
        cellClass += "bg-gray-300 border-gray-400 text-gray-600 hover:bg-gray-400 ";
      } else if (isCurrent) {
        cellClass += "bg-green-500 text-white border-green-600 animate-pulse ";
      } else {
        cellClass += "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200 ";
      }
      
      years.push(
        <div 
          key={year}
          className={cellClass}
          onClick={() => {
            setSelectedPeriod(year);
            setViewMode('monthly');
          }}
          title={`${year} - ${yearMemories.length} memories`}
        >
          {year % 100}
        </div>
      );
    }
    
    return (
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Annual View</h2>
        <div className="grid grid-cols-10 gap-1">
          {years}
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    if (!selectedPeriod) return null;
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return (
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setViewMode('annual')}
            className="flex items-center text-blue-500 hover:text-blue-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Years
          </button>
          <h2 className="text-xl font-semibold text-gray-800">{selectedPeriod}</h2>
          <div className="w-20"></div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          {months.map((month, index) => {
            const monthKey = `${selectedPeriod}-${(index + 1).toString().padStart(2, '0')}`;
            const monthMemories = getMemoriesForPeriod(monthKey);
            const isPast = Number(selectedPeriod) < currentYear || (Number(selectedPeriod) === currentYear && index < currentMonth);
            const isCurrent = selectedPeriod === currentYear && index === currentMonth;
            
            let cellClass = "p-4 rounded-lg transition-all cursor-pointer hover:scale-105 border-2 text-center ";
            
            if (monthMemories.length > 0) {
              cellClass += "bg-blue-500 text-white border-blue-600 shadow-md ";
            } else if (isPast) {
              cellClass += "bg-gray-300 border-gray-400 text-gray-600 hover:bg-gray-400 ";
            } else if (isCurrent) {
              cellClass += "bg-green-500 text-white border-green-600 animate-pulse ";
            } else {
              cellClass += "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200 ";
            }
            
            return (
              <div
                key={index}
                className={cellClass}
                onClick={() => {
                  setSelectedPeriod(monthKey);
                  setViewMode('weekly');
                }}
                title={`${month} ${selectedPeriod} - ${monthMemories.length} memories`}
              >
                <div className="font-medium">{month}</div>
                <div className="text-sm mt-1">{monthMemories.length} memories</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    if (!selectedPeriod || typeof selectedPeriod !== 'string') return null;
    
    const [year, month] = selectedPeriod.split('-');
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0);
    const weeks = [];
    
    let currentWeek: (Date | null)[] = [];
    let currentDate = new Date(firstDay);
    
    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    while (currentDate <= lastDay) {
      currentWeek.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    // Add remaining days to the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    
    return (
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setViewMode('monthly')}
            className="flex items-center text-blue-500 hover:text-blue-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Months
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="w-20"></div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {weeks.flat().map((date, index) => {
            if (!date) {
              return <div key={index} className="p-4"></div>;
            }
            
            const dateStr = date.toISOString().split('T')[0];
            const memory = getMemoryForDate(dateStr);
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            const isPast = date < today;
            
            let cellClass = "p-4 rounded-lg transition-all cursor-pointer hover:scale-105 border-2 text-center ";
            
            if (memory) {
              const emotion = emotions[memory.emotion as keyof typeof emotions];
              cellClass += `${emotion.color} border-gray-800 text-white shadow-md `;
            } else if (isToday) {
              cellClass += "bg-green-500 text-white border-green-600 animate-pulse ";
            } else if (isPast) {
              cellClass += "bg-gray-300 border-gray-400 text-gray-600 hover:bg-gray-400 ";
            } else {
              cellClass += "bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200 ";
            }
            
            return (
              <div
                key={index}
                className={cellClass}
                onClick={() => {
                  setSelectedPeriod(dateStr);
                  setViewMode('daily');
                }}
                title={memory ? `${memory.title} - ${emotions[memory.emotion as keyof typeof emotions].name}` : dateStr}
              >
                <div className="font-medium">{date.getDate()}</div>
                {memory && (
                  <div className="text-xs mt-1">{emotions[memory.emotion as keyof typeof emotions].icon}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDailyView = () => {
    if (!selectedPeriod || typeof selectedPeriod !== 'string') return null;
    
    const selectedDate = new Date(selectedPeriod);
    const memory = getMemoryForDate(selectedPeriod);
    
    return (
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setViewMode('weekly')}
            className="flex items-center text-blue-500 hover:text-blue-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Calendar
          </button>
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <div className="w-20"></div>
        </div>
        
        {memory ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">{emotions[memory.emotion as keyof typeof emotions].icon}</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{memory.title}</h3>
              <p className="text-gray-600 text-lg">{memory.description}</p>
            </div>
            
            {memory.videoUrl && (
              <div className="max-w-md mx-auto">
                <video
                  ref={playbackRef}
                  controls
                  className="w-full rounded-lg shadow-lg"
                  src={memory.videoUrl}
                />
              </div>
            )}
            
            <div className="flex justify-center space-x-4 text-sm text-gray-600">
              {memory.location && (
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {memory.location}
                </div>
              )}
              {memory.people && (
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {memory.people}
                </div>
              )}
            </div>
            
            <div className="text-center">
              <button
                onClick={() => openMemoryModal(selectedPeriod)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Edit3 className="w-4 h-4 inline mr-2" />
                Edit Memory
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Memory Yet</h3>
            <p className="text-gray-500 mb-6">Capture what made this day special</p>
            <button
              onClick={() => openMemoryModal(selectedPeriod)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Memory
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'annual':
        return renderAnnualView();
      case 'monthly':
        return renderMonthlyView();
      case 'weekly':
        return renderWeeklyView();
      case 'daily':
        return renderDailyView();
      default:
        return renderAnnualView();
    }
  };

  const renderVideoRecorder = () => {
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-700">Video Memory</h4>
        
        {cameraError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {cameraError}
          </div>
        )}
        
        {!currentMemory.videoUrl ? (
          <div className="space-y-4">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-48 object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-center space-x-2">
              {!isRecording ? (
                <button
                  onClick={() => {
                    startCamera().then(() => {
                      setTimeout(startRecording, 500);
                    });
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Start Recording
                </button>
              ) : (
                <>
                  <button
                    onClick={stopRecording}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Stop
                  </button>
                  {!isPaused ? (
                    <button
                      onClick={pauseRecording}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeRecording}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <video
              controls
              className="w-full h-48 rounded-lg"
              src={currentMemory.videoUrl}
                          />
            <div className="flex justify-center space-x-2">
              <button
                onClick={retakeVideo}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </button>
              <button
                onClick={downloadVideo}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMemoryModal = () => {
    if (!showMemoryModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              {currentMemory.title ? 'Edit Memory' : 'Add Memory'}
            </h2>
            <button
              onClick={() => {
                setShowMemoryModal(false);
                stopCamera();
                resetMemoryForm();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={currentMemory.date}
                onChange={(e) => setCurrentMemory({ ...currentMemory, date: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={currentMemory.title}
                onChange={(e) => setCurrentMemory({ ...currentMemory, title: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="A memorable moment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={currentMemory.description}
                onChange={(e) => setCurrentMemory({ ...currentMemory, description: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="What happened? How did you feel?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emotion</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(emotions).map(([key, { icon, name, color }]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentMemory({ ...currentMemory, emotion: key })}
                    className={`p-2 rounded-lg flex items-center justify-center ${currentMemory.emotion === key ? `${color} text-white` : 'bg-gray-100 text-gray-700'} hover:opacity-80 transition-colors`}
                    title={name}
                  >
                    <span className="text-xl">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={currentMemory.location}
                onChange={(e) => setCurrentMemory({ ...currentMemory, location: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Where were you?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">People</label>
              <input
                type="text"
                value={currentMemory.people}
                onChange={(e) => setCurrentMemory({ ...currentMemory, people: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Who was with you?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(categories).map(([key, { name, icon: Icon }]) => (
                  <button
                    key={key}
                    onClick={() => setCurrentMemory({ ...currentMemory, category: key })}
                    className={`p-2 rounded-lg flex items-center justify-center ${currentMemory.category === key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} hover:opacity-80 transition-colors`}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {renderVideoRecorder()}

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowMemoryModal(false);
                  stopCamera();
                  resetMemoryForm();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveMemory}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                disabled={!currentMemory.title.trim()}
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {step === 1 ? (
        <div className="max-w-md mx-auto pt-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Life Timeline</h1>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter your birthdate</label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSubmit}
              disabled={!birthdate}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Create Timeline
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-12">
          {stats && (
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Life Timeline</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Years Lived</p>
                  <p className="text-2xl font-semibold text-gray-800">{stats.yearsLived}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days Lived</p>
                  <p className="text-2xl font-semibold text-gray-800">{stats.daysLived.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weeks Remaining</p>
                  <p className="text-2xl font-semibold text-gray-800">{stats.weeksRemaining.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Life Lived</p>
                  <p className="text-2xl font-semibold text-gray-800">{stats.percentageLived}%</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center space-x-2 mb-8">
            {(['annual', 'monthly', 'weekly', 'daily'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg capitalize ${viewMode === mode ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {renderCurrentView()}
          {renderMemoryModal()}
        </div>
      )}
    </div>
  );
}
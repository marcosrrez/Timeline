import { useState, useEffect, useRef } from 'react';
import { Camera, Calendar, Heart, MapPin, Users, Star, Clock, Plus, Edit3, X, Video, Play, Pause, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface Stats {
  weeksLived: number;
  totalWeeks: number;
  weeksRemaining: number;
  percentageLived: number;
  daysLived: number;
  yearsLived: number;
  birthDate: Date;
}

export default function MemoryTimeline() {
  const [step, setStep] = useState(1);
  const [birthdate, setBirthdate] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [memories, setMemories] = useState([]);
  const [viewMode, setViewMode] = useState('annual'); // annual, monthly, weekly, daily
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [currentMemory, setCurrentMemory] = useState({
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
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const videoRef = useRef(null);
  const playbackRef = useRef(null);
  const streamRef = useRef(null);

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

  useEffect(() => {
    const storedBirthdate = localStorage.getItem('birthdate');
    if (storedBirthdate) {
      setBirthdate(storedBirthdate);
      setStats(calculateStats(storedBirthdate));
      setStep(2);
    }

    const storedMemories = localStorage.getItem('memories');
    if (storedMemories) {
      setMemories(JSON.parse(storedMemories));
    }
  }, []);

  useEffect(() => {
    if (birthdate) {
      localStorage.setItem('birthdate', birthdate);
    }
  }, [birthdate]);

  useEffect(() => {
    localStorage.setItem('memories', JSON.stringify(memories));
  }, [memories]);

  const calculateStats = (date: string): Stats => {
    const birthDate = new Date(date);
    const today = new Date();
    
    const msInWeek = 1000 * 60 * 60 * 24 * 7;
    const weeksLived = Math.floor((today - birthDate) / msInWeek);
    
    const totalWeeks = 4160; // ~80 years
    const weeksRemaining = totalWeeks - weeksLived;
    const percentageLived = Math.round((weeksLived / totalWeeks) * 100);
    
    const msInDay = 1000 * 60 * 60 * 24;
    const daysLived = Math.floor((today - birthDate) / msInDay);
    
    const yearsLived = Math.floor((today - birthDate) / (1000 * 60 * 60 * 24 * 365.25));
    
    return {
      weeksLived,
      totalWeeks,
      weeksRemaining,
      percentageLived,
      daysLived,
      yearsLived,
      birthDate
    };
  };

  const getMemoryForDate = (date) => {
    return memories.find(m => m.date === date);
  };

  const getMemoriesForPeriod = (period) => {
    if (viewMode === 'annual') {
      return memories.filter(m => m.date.startsWith(period));
    } else if (viewMode === 'monthly') {
      return memories.filter(m => m.date.startsWith(period));
    } else if (viewMode === 'weekly') {
      const weekStart = new Date(period);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return memories.filter(m => {
        const memDate = new Date(m.date);
        return memDate >= weekStart && memDate <= weekEnd;
      });
    }
    return [];
  };

  const handleSubmit = () => {
    setStats(calculateStats(birthdate));
    setStep(2);
  };

  const openMemoryModal = (date) => {
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
  };

  const saveMemory = () => {
    const updatedMemories = memories.filter(m => m.date !== currentMemory.date);
    if (currentMemory.title.trim()) {
      updatedMemories.push({ ...currentMemory });
    }
    setMemories(updatedMemories);
    setShowMemoryModal(false);
    stopCamera();
    resetMemoryForm();
  };

  const resetMemoryForm = () => {
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
    setRecordedChunks([]);
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
  };

  // Video recording functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    const recorder = new MediaRecorder(streamRef.current);
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCurrentMemory(prev => ({
        ...prev,
        videoBlob: blob,
        videoUrl: url
      }));
      setRecordedChunks(chunks);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
    setIsPaused(false);

    // Timer
    const startTime = Date.now();
    const timer = setInterval(() => {
      if (!isPaused) {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    // Store timer reference
    recorder.timer = timer;
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      clearInterval(mediaRecorder.timer);
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
    }
  };

  const retakeVideo = () => {
    setCurrentMemory(prev => ({
      ...prev,
      videoBlob: null,
      videoUrl: ''
    }));
    setRecordedChunks([]);
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
  };

  const downloadVideo = () => {
    if (currentMemory.videoBlob) {
      const url = URL.createObjectURL(currentMemory.videoBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-${currentMemory.date}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderAnnualView = () => {
    if (!stats) return null;
    
    const currentYear = new Date().getFullYear();
    const birthYear = stats.birthDate.getFullYear();
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
            const isPast = selectedPeriod < currentYear || (selectedPeriod === currentYear && index < currentMonth);
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
    if (!selectedPeriod) return null;
    
    const [year, month] = selectedPeriod.split('-');
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const weeks = [];
    
    let currentWeek = [];
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
            {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
              const emotion = emotions[memory.emotion];
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
                title={memory ? `${memory.title} - ${emotions[memory.emotion].name}` : dateStr}
              >
                <div className="font-medium">{date.getDate()}</div>
                {memory && (
                  <div className="text-xs mt-1">{emotions[memory.emotion].icon}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDailyView = () => {
    if (!selectedPeriod) return null;
    
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
              <div className="text-6xl mb-4">{emotions[memory.emotion].icon}</div>
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
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </button>
              <button
                onClick={downloadVideo}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Memory for {new Date(currentMemory.date).toLocaleDateString()}
              </h3>
              <button
                onClick={() => {
                  setShowMemoryModal(false);
                  stopCamera();
                  resetMemoryForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memory Title
                </label>
                <input
                  type="text"
                  value={currentMemory.title}
                  onChange={(e) => setCurrentMemory({...currentMemory, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What made this day special?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={currentMemory.description}
                  onChange={(e) => setCurrentMemory({...currentMemory, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Tell the story of this moment..."
                />
              </div>

              {renderVideoRecorder()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How did you feel?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(emotions).map(([key, emotion]) => (
                    <button
                      key={key}
                      onClick={() => setCurrentMemory({...currentMemory, emotion: key})}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentMemory.emotion === key 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{emotion.icon}</div>
                      <div className="text-xs text-gray-600">{emotion.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(categories).map(([key, category]) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setCurrentMemory({...currentMemory, category: key})}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          currentMemory.category === key 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-xs text-gray-600">{category.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={currentMemory.location}
                    onChange={(e) => setCurrentMemory({...currentMemory, location: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="e.g., Paris, France"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    People
                  </label>
                  <input
                    type="text"
                    value={currentMemory.people}
                    onChange={(e) => setCurrentMemory({...currentMemory, people: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="e.g., Mom, Dad"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 rounded-b-xl">
            <div className="flex justify-end">
              <button
                onClick={saveMemory}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <Heart className="w-4 h-4 mr-2" />
                Save Memory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Life in Weeks</h1>
          <p className="text-gray-600 mb-6">Enter your birthdate to visualize your life's timeline and start capturing memories.</p>
          <input
            type="date"
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSubmit}
            disabled={!birthdate}
            className="mt-6 w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Start My Timeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Life in Weeks</h1>
            <p className="text-gray-600 mt-1">A visual journal of your life's moments.</p>
          </div>
          <button 
            onClick={() => setStep(1)}
            className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            Change Birthdate
          </button>
        </header>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md text-center transition hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-500">Weeks Lived</h3>
              <p className="text-4xl font-bold text-blue-600">{stats.weeksLived.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center transition hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-500">Weeks Remaining</h3>
              <p className="text-4xl font-bold text-green-600">{stats.weeksRemaining.toLocaleString()}</p>
              <p className="text-sm text-gray-500">(assuming 80 years)</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md text-center transition hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-500">Life Progress</h3>
              <p className="text-4xl font-bold text-purple-600">{stats.percentageLived}%</p>
            </div>
          </div>
        )}

        {renderCurrentView()}
      </div>
      {renderMemoryModal()}
    </div>
  );
}
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Image as ImageIcon, 
  Mic, 
  Send, 
  History, 
  Copy, 
  Share2, 
  Download, 
  Moon, 
  Sun, 
  Trash2, 
  X, 
  Check,
  ChevronRight,
  GraduationCap,
  Atom,
  Calculator,
  Languages,
  Dna,
  FlaskConical,
  ScrollText,
  Menu,
  LogOut,
  BrainCircuit,
  Wind,
  Layers,
  Pin,
  PinOff,
  Zap,
  Brain,
  Sparkles,
  Lightbulb,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SUBJECTS = [
  { id: 'general', name: 'General', icon: GraduationCap, prompt: "You are a helpful AI academic assistant. Provide clear, accurate, and structured educational answers." },
  { id: 'maths', name: 'Mathematics', icon: Calculator, prompt: "You are a mathematics expert. Solve problems step-by-step, explaining the logic and formulas used." },
  { id: 'physics', name: 'Physics', icon: Atom, prompt: "You are a physics expert. Explain concepts clearly and solve problems with relevant principles and units." },
  { id: 'chemistry', name: 'Chemistry', icon: FlaskConical, prompt: "You are a chemistry expert. Explain reactions, structures, and properties with precision." },
  { id: 'biology', name: 'Biology', icon: Dna, prompt: "You are a biology expert. Explain biological processes, structures, and systems with clear terminology." },
  { id: 'hindi', name: 'Hindi', icon: Languages, prompt: "आप एक हिंदी विशेषज्ञ हैं। कृपया व्याकरण, साहित्य और भाषा संबंधी प्रश्नों का स्पष्ट उत्तर दें।" },
  { id: 'english', name: 'English', icon: ScrollText, prompt: "You are an English language and literature expert. Help with grammar, analysis, and writing." },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  subject?: string;
  timestamp: number;
  image?: string;
}

interface Session {
  id: string;
  title: string;
  is_pinned?: boolean | number;
  created_at: string;
}

export default function App() {
  console.log('✓ App component rendering');
  
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  
  const [user, setUser] = useState<{ name: string, email: string, role?: 'admin' | 'student' } | null>(() => {
    try {
      const saved = localStorage.getItem('ss_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('ss_token'));
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authData, setAuthData] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, sessionId: string } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'resources' | 'planner' | 'zen' | 'flashcards' | 'quiz' | 'join-live'>('chat');
  const [resourceQuery, setResourceQuery] = useState('');
  const [resources, setResources] = useState<{title: string, url: string}[]>([]);
  const [isSearchingResources, setIsSearchingResources] = useState(false);
  
  
  const [plannerGoal, setPlannerGoal] = useState('');
  const [plannerTime, setPlannerTime] = useState('7');
  const [plannerResult, setPlannerResult] = useState<string | null>(null);
  const [plannerTasks, setPlannerTasks] = useState<{id: string, text: string, done: boolean}[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [flashcards, setFlashcards] = useState<{q: string, a: string}[]>([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  
  const [quizTopic, setQuizTopic] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<{q: string, options: string[], a: number}[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [userQuizAnswers, setUserQuizAnswers] = useState<number[]>([]);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);

  
  const [liveClasses, setLiveClasses] = useState<{_id: string, title: string, description: string, startAt: string, meetingId: string, teacherName: string, subject?: string}[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  
  const [greeting, setGreeting] = useState<"welcome" | "welcome_back" | null>(null);
  const [greetingType, setGreetingType] = useState<"welcome" | "welcome_back" | null>(null);

  
  const [sessionConcepts, setSessionConcepts] = useState<string[]>([]);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [isAnalyzingSession, setIsAnalyzingSession] = useState(false);
  const [showStudySidebar, setShowStudySidebar] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState<string | null>(null);
  const [studyGoal, setStudyGoal] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {
      'Pinned': [],
      'Today': [],
      'Yesterday': [],
      'Previous': []
    };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    sessions.forEach(s => {
      if (s.is_pinned) {
        groups['Pinned'].push(s);
        return;
      }
      const dateStr = s.created_at ? (s.created_at.includes(' ') ? s.created_at.replace(' ', 'T') + 'Z' : s.created_at) : null;
      const date = dateStr ? new Date(dateStr).getTime() : 0;
      
      if (isNaN(date) || date === 0) {
        groups['Previous'].push(s);
      } else if (date >= today) {
        groups['Today'].push(s);
      } else if (date >= yesterday) {
        groups['Yesterday'].push(s);
      } else {
        groups['Previous'].push(s);
      }
    });
    return groups;
  }, [sessions]);

  useEffect(() => {
    setAuthError(null);
  }, [authMode, authData]);

  
  useEffect(() => {
    if (token) {
      fetchSessions();
      fetchLiveClasses();
      
      setAuthMode('login');
      setAuthData({ email: '', password: '', name: '', confirmPassword: '' });
      
      
      if (!greetingType) {
        (async () => {
          try {
            
            const storedUser = localStorage.getItem("ss_user");
            const parsed = storedUser ? JSON.parse(storedUser) : null;
            const email = typeof parsed?.email === "string" ? parsed.email.toLowerCase().trim() : "";
            if (email) {
              const key = `ss_login_isFirstLogin_${email}`;
              const v = localStorage.getItem(key);
              if (v === "1" || v === "0") {
                localStorage.removeItem(key);
                if (v === "1") {
                  setGreeting("welcome");
                  setGreetingType("welcome");
                } else {
                  setGreeting("welcome_back");
                  setGreetingType("welcome_back");
                }
                setTimeout(() => setGreeting(null), 5000);
                return;
              }
            }

            
            const meRes = await fetch("/api/me", {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (!meRes.ok) throw new Error("Failed to load /api/me");
            const me = await meRes.json();
            const loginCount = typeof me?.user?.loginCount === "number" ? me.user.loginCount : 0;

            
            if (loginCount <= 1) {
              setGreeting("welcome");
              setGreetingType("welcome");
            } else {
              setGreeting("welcome_back");
              setGreetingType("welcome_back");
            }

            setTimeout(() => setGreeting(null), 5000);
          } catch {
            
            setGreeting('welcome');
            setGreetingType('welcome');
            setTimeout(() => setGreeting(null), 5000);
          }
        })();
      }
    } else if (token === null || token === '') {
      
      setAuthMode('login');
      setAuthData({ email: '', password: '', name: '', confirmPassword: '' });
      setMessages([]);
      setSessions([]);
      setCurrentSessionId(null);
      setGreeting(null);
      setGreetingType(null);
    }
  }, [token, user?.email]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ss_theme');
    if (savedTheme) setIsDarkMode(savedTheme === 'dark');
  }, []);

  useEffect(() => {
    localStorage.setItem('ss_theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  
  const callAI = async (payload: any) => {
    console.log('[callAI] Sending payload:', { model: payload.model, sessionId: payload.sessionId });
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[callAI] Error response:', res.status, txt);
      throw new Error(`AI proxy error: ${res.status} ${txt}`);
    }
    const data = await res.json();
    console.log('[callAI] Response received. Has text:', !!data.text, 'Keys:', Object.keys(data).slice(0, 5));
    return data;
  };

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error('Fetch sessions error:', err); }
  };

  const fetchLiveClasses = async () => {
    if (!token) return;
    setIsLoadingClasses(true);
    try {
      const res = await fetch('/api/live-classes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLiveClasses(Array.isArray(data) ? data : []);
      }
    } catch (err) { 
      console.error('Fetch live classes error:', err);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setActiveTab('chat');
    try {
      const res = await fetch(`/api/messages/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setMessages(data.map((m: any) => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content,
        image: m.image,
        timestamp: new Date(m.timestamp).getTime()
      })));
    } catch (err) { console.error(err); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    let endpoint: string;
    let body: any;
    if (authMode === 'forgot') {
      endpoint = '/api/auth/forgot-password';
      if (!authData.email || !authData.password) {
        setAuthError("Please fill in email and new password");
        return;
      }
      if (authData.password !== authData.confirmPassword) {
        setAuthError("Passwords do not match");
        return;
      }
      if (authData.password.length < 6) {
        setAuthError("Password must be at least 6 characters");
        return;
      }
      body = { email: authData.email, newPassword: authData.password };
    } else {
      endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      body = authData;
    }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        if (authMode === 'signup') {
          
          
          const email = authData.email.toLowerCase().trim();
          localStorage.removeItem(`ss_first_login_${email}`);
          localStorage.setItem(`ss_just_signed_up_${email}`, 'true');
          setAuthData({ email: '', password: '', name: '', confirmPassword: '' });
          setAuthError(null);
          setAuthMode('login');
          
          setTimeout(() => setAuthError(null), 2000);
        } else if (authMode === 'forgot') {
          setAuthData({ email: '', password: '', name: '', confirmPassword: '' });
          setAuthError(null);
          setAuthMode('login');
          alert("Password reset successfully! Please sign in with your new password.");
        } else {
          
          const email = data.user.email.toLowerCase().trim();
          const isJustSignedUp = localStorage.getItem(`ss_just_signed_up_${email}`);
          
          setAuthData({ email: '', password: '', name: '', confirmPassword: '' });
          setAuthError(null);
          localStorage.setItem('ss_token', data.token);
          localStorage.setItem('ss_user', JSON.stringify(data.user));
          
          
          if (isJustSignedUp) {
            localStorage.removeItem(`ss_just_signed_up_${email}`);
            localStorage.removeItem(`ss_first_login_${email}`);
          }
          
          setUser(data.user);
          setToken(data.token);
          
          
          
          if (typeof data.isFirstLogin === "boolean") {
            localStorage.setItem(`ss_login_isFirstLogin_${email}`, data.isFirstLogin ? "1" : "0");
          }
          
          
          setTimeout(() => {
            window.location.href = window.location.pathname;
          }, 300);
        }
      } else {
        setAuthError(data.error || "Authentication failed");
      }
    } catch (err) { 
      setAuthError("Connection error. Please try again.");
    }
  };

  const handleLogout = () => {
    
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    localStorage.removeItem('ss_theme');
    
    
    setInput('');
    setImage(null);
    
    
    setUser(null);
    
    
    setGreeting(null);
    setGreetingType(null);
    
    
    setToken(null);
    
    
    setTimeout(() => {
      window.location.href = window.location.pathname;
    }, 200);
  };

  const startNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
    setImage(null);
    setActiveTab('chat');
  };

  const handleSend = async () => {
    if (!input.trim() && !image) return;
    if (isListening) setIsListening(false);
    
    let sessionId = currentSessionId;
    const isFirstMessage = !sessionId;

    if (isFirstMessage) {
      sessionId = Date.now().toString();
      const tempTitle = input.slice(0, 30) || "New Session";
      try {
        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ id: sessionId, title: tempTitle })
        });
        setCurrentSessionId(sessionId);
        fetchSessions(); 
      } catch (err) { 
        console.error(err);
        return;
      }
    }

    const userMsg = {
      role: 'user' as const,
      content: input,
      image: image || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, { ...userMsg, id: Date.now().toString() }]);
    setInput('');
    setImage(null);
    setIsLoading(true);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId, ...userMsg })
      });

      const response = await callAI({
        model: "gemini-3-flash-preview",
        contents: userMsg.image ? [
          {
            parts: [
              { text: `${selectedSubject.prompt}\n\nQuestion: ${userMsg.content}` },
              { inlineData: { mimeType: "image/jpeg", data: userMsg.image.split(',')[1] } }
            ]
          }
        ] : [
          { parts: [{ text: `${selectedSubject.prompt}\n\nQuestion: ${userMsg.content}` }] }
        ],
        sessionId,
        isFirstMessage,
        subjectPrompt: selectedSubject.prompt
      });

      const text = response.text || "I'm sorry, I couldn't generate a response.";
      console.log('[sendMessage] Got text from AI:', text.substring(0, 100));
      
      
      try {
        const msgRes = await fetch(`/api/messages/${sessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (msgRes.ok) {
          const data = await msgRes.json();
          setMessages(data.map((m: any) => ({
            id: m.id.toString(),
            role: m.role,
            content: m.content,
            image: m.image,
            timestamp: new Date(m.timestamp).getTime()
          })));
        }
      } catch (err) {
        console.error('Failed to fetch updated messages:', err);
      }

      
      if (isFirstMessage) {
        const titleResponse = await callAI({
          model: "gemini-3-flash-preview",
          contents: `Generate a short (max 4 words) title for this study session based on: ${userMsg.content}. Do not use quotes.`,
          sessionId,
          subjectPrompt: selectedSubject.prompt
        });
        const newTitle = titleResponse.text?.trim().replace(/["']/g, "") || "Study Session";
        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: newTitle })
        });
        fetchSessions();
      }

    } catch (error) {
      console.error('[sendMessage] Error:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateStudyPlan = async () => {
    if (!plannerGoal.trim()) return;
    setIsGeneratingPlan(true);
    setPlannerResult(null);
    setPlannerTasks([]);
    try {
      const response = await callAI({
        model: "gemini-3-flash-preview",
        contents: `Create a detailed day-by-day study roadmap for: ${plannerGoal}. 
        Timeframe: ${plannerTime} days. 
        Include specific topics, resources to check, and a daily checklist. 
        Format in Markdown with clear headings. 
        Also, provide a JSON-formatted list of 5-8 key tasks for this plan at the very end of your response inside <tasks> tags. 
        Example: <tasks>[{"text": "Read Chapter 1"}, {"text": "Solve Practice Set"}]</tasks>`,
        sessionId: null,
        subjectPrompt: selectedSubject.prompt
      });
      
      const text = response.text || "";
      const taskMatch = text.match(/<tasks>(.*?)<\/tasks>/s);
      if (taskMatch) {
        try {
          const tasks = JSON.parse(taskMatch[1]);
          setPlannerTasks(tasks.map((t: any, i: number) => ({ id: i.toString(), text: t.text, done: false })));
          setPlannerResult(text.replace(/<tasks>.*?<\/tasks>/s, '').trim());
        } catch (e) {
          setPlannerResult(text);
        }
      } else {
        setPlannerResult(text);
      }
    } catch (error) { console.error(error); }
    finally { setIsGeneratingPlan(false); }
  };

  const generateFlashcards = async () => {
    if (!flashcardTopic.trim()) return;
    setIsGeneratingFlashcards(true);
    try {
      const response = await callAI({
        model: "gemini-3-flash-preview",
        contents: `Generate 10 educational flashcards for the topic: ${flashcardTopic}. 
        Return ONLY a JSON array of objects with "q" (question) and "a" (answer) properties.`,
        config: { responseMimeType: "application/json" },
        sessionId: null,
        subjectPrompt: selectedSubject.prompt
      });
      const data = JSON.parse(response.text || "[]");
      setFlashcards(data);
      setCurrentFlashcardIndex(0);
      setShowFlashcardAnswer(false);
    } catch (error) { console.error(error); }
    finally { setIsGeneratingFlashcards(false); }
  };

  const searchPDFs = async () => {
    if (!resourceQuery.trim()) return;
    setIsSearchingResources(true);
    setResources([]);
    
    try {
      console.log('[searchPDFs] Starting search for:', resourceQuery);
      
      // First try without tools - just ask AI to find resources
      try {
        const responseSimple = await callAI({
          model: "gemini-3-flash-preview",
          contents: `Search and find direct download links for PDF educational materials for "${resourceQuery}" (${selectedSubject.name} subject). 
          Find resources from platforms like Google Drive, GitHub, ResearchGate, Academia.edu, ArXiv, JSTOR, direct PDF links, etc.
          
          Provide exactly in this format:
          [Link Title 1](https://example.com/pdf1)
          [Link Title 2](https://example.com/pdf2)
          [Link Title 3](https://example.com/pdf3)
          
          Provide at least 5-8 resources with their clickable markdown links.`,
          sessionId: null,
          subjectPrompt: selectedSubject.prompt
        });

        const rawText = (responseSimple.text || "").trim();
        console.log('[searchPDFs] AI Response:', rawText.substring(0, 300));
        
        // Parse markdown links [Title](URL)
        const markdownLinks = Array.from<RegExpMatchArray>(rawText.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g));
        
        if (markdownLinks.length > 0) {
          const foundResources = markdownLinks.map(m => ({
            title: m[1] || "Resource",
            url: m[2]
          })).filter(r => r.url && r.url.includes('http'));
          
          console.log('[searchPDFs] Found resources:', foundResources.length);
          setResources(foundResources);
          return;
        }
        
        // Fallback: Extract plain URLs with context
        const urlMatches = Array.from(rawText.matchAll(/https?:\/\/[^\s)>\n]+/g));
        if (urlMatches.length > 0) {
          const foundResources = urlMatches.map((m: any, i) => ({
            title: `Resource ${i + 1}`,
            url: m[0].trim()
          })).filter(r => r.url && r.url.length < 300);
          
          console.log('[searchPDFs] Extracted URLs:', foundResources.length);
          setResources(foundResources);
          return;
        }
        
        console.warn('[searchPDFs] No resources found in response');
        setResources([]);
        
      } catch (innerError) {
        console.error('[searchPDFs] Error in simple search:', innerError);
        
        // Try with tools as fallback
        const responseTools = await callAI({
          model: "gemini-3-flash-preview",
          contents: `Find PDF resources for: ${resourceQuery}`,
          config: { tools: [{ googleSearch: {} }] },
          sessionId: null,
          subjectPrompt: selectedSubject.prompt
        });

        const chunks = responseTools.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          const foundResources = chunks
            .filter((c: any) => c.web)
            .map((c: any) => ({
              title: c.web?.title || "Resource",
              url: c.web?.uri || ""
            }))
            .filter((r: any) => r.url && r.url.includes('http'));
          
          console.log('[searchPDFs] Found via tools:', foundResources.length);
          setResources(foundResources);
        } else {
          setResources([]);
        }
      }
      
    } catch (error) { 
      console.error('[searchPDFs] Fatal error:', error);
      setResources([]);
    }
    finally { 
      setIsSearchingResources(false);
      console.log('[searchPDFs] Search complete');
    }
  };

  const generateQuiz = async () => {
    if (!quizTopic.trim()) return;
    setIsGeneratingQuiz(true);
    setQuizScore(null);
    setQuizQuestions([]);
    setUserQuizAnswers([]);
    setShowAnswerFeedback(false);
    setCurrentQuizIndex(0);
    setSelectedQuizOption(null);
    try {
      const response = await callAI({
        model: "gemini-3-flash-preview",
        contents: `Generate exactly 5 multiple-choice questions for the topic: ${quizTopic}.\n
        The output MUST be a valid JSON array containing exactly five objects.\n        Each object should have the following fields:\n          - \"q\": a string with the question text\n          - \"options\": an array of 4 strings (the choices)\n          - \"a\": a number 0-3 indicating the index of the correct option\n
        Do not include any additional text, explanation or formatting outside the JSON array.`,
        config: { responseMimeType: "application/json" },
        sessionId: null,
        subjectPrompt: selectedSubject.prompt
      });

      let data: any[] = [];
      try {
        data = JSON.parse(response.text || "[]");
      } catch (e) {
        console.warn("Failed to parse quiz JSON", response.text);
      }

      // Ensure we got five questions, otherwise warn and notify user
      if (!Array.isArray(data) || data.length !== 5) {
        console.warn("Unexpected quiz payload length", data);
        alert("AI returned an unexpected number of quiz questions. Please try again or change the topic.");
      }

      setQuizQuestions(data);
      setCurrentQuizIndex(0);
      setSelectedQuizOption(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const simplifyMessage = async (messageId: string, content: string) => {
    setIsSimplifying(messageId);
    try {
      const response = await callAI({
        model: "gemini-3-flash-preview",
        contents: `Explain this like I'm five years old (ELI5). Keep it simple, clear, and use an analogy if possible: ${content}`,
        sessionId: null,
        subjectPrompt: selectedSubject.prompt
      });
      
      const simplifiedText = response.text || "Could not simplify.";
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: `${m.content}\n\n---\n**Simplified (ELI5):**\n${simplifiedText}` } : m));
    } catch (error) { console.error(error); }
    finally { setIsSimplifying(null); }
  };

  const analyzeSession = async () => {
    if (messages.length < 2) return;
    setIsAnalyzingSession(true);
    try {
      const history = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await callAI({
        model: "gemini-3-flash-preview",
        contents: `Analyze this educational conversation and return a JSON object with:
        1. "summary": A 2-sentence summary of what was learned.
        2. "concepts": An array of 5 key terms or concepts discussed.
        3. "next_steps": A suggestion for what to study next.
        
        Conversation:
        ${history}`,
        config: { responseMimeType: "application/json" },
        sessionId: null,
        subjectPrompt: selectedSubject.prompt
      });
      
      const data = JSON.parse(response.text || "{}");
      setSessionSummary(data.summary || "No summary available.");
      setSessionConcepts(data.concepts || []);
    } catch (error) { console.error(error); }
    finally { setIsAnalyzingSession(false); }
  };

  const deleteSession = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    
    // 1. Optimistic UI Update
    setSessions(prev => prev.filter(s => s.id !== id));
    
    // 2. Clear current session if it's the one being deleted
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      setMessages([]);
    }

    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        // 3. If server fails, refresh to get correct state
        console.error('Server failed to delete session');
        fetchSessions();
        alert("Failed to delete session. Please try again.");
      } else {
        console.log('Session deleted successfully from server');
      }
    } catch (err) {
      // 4. If network fails, refresh to get correct state
      console.error('Network error deleting session:', err);
      fetchSessions();
      alert("Connection error. Please try again.");
    }
  };

  const togglePinSession = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;

    const isPinned = session.is_pinned ? 0 : 1;
    const oldSessions = [...sessions];
    
    setSessions(prev => 
      prev.map(s => s.id === id ? { ...s, is_pinned: isPinned } : s)
        .sort((a, b) => {
          const pinA = a.is_pinned ? 1 : 0;
          const pinB = b.is_pinned ? 1 : 0;
          if (pinA !== pinB) return pinB - pinA;
          // Handle SQLite date format
          const dateA = new Date(a.created_at.includes(' ') ? a.created_at.replace(' ', 'T') + 'Z' : a.created_at).getTime();
          const dateB = new Date(b.created_at.includes(' ') ? b.created_at.replace(' ', 'T') + 'Z' : b.created_at).getTime();
          return dateB - dateA;
        })
    );

    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_pinned: isPinned })
      });
      if (!res.ok) throw new Error("Failed to update pin status");
    } catch (err) {
      console.error('Toggle pin error:', err);
      setSessions(oldSessions);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  // Show login screen if no token - auto-redirects when user logs out
  if (!token || token === '') {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-6",
        isDarkMode ? "bg-[#0A0A0B] text-white" : "bg-slate-50 text-slate-900"
      )}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "w-full max-w-md p-8 rounded-3xl border shadow-2xl",
            isDarkMode ? "bg-[#111113] border-slate-800" : "bg-white border-slate-200"
          )}
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-xl shadow-indigo-600/20">
              <BrainCircuit className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Solver AI</h1>
            <p className="text-slate-500 text-sm">Your intelligent study companion</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" required
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500",
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                  value={authData.name}
                  onChange={e => setAuthData({...authData, name: e.target.value})}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input 
                type="email" required
                className={cn(
                  "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                )}
                value={authData.email}
                onChange={e => setAuthData({...authData, email: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{authMode === 'forgot' ? 'New Password' : 'Password'}</label>
              <input 
                type="password" required
                className={cn(
                  "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500",
                  isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                )}
                value={authData.password}
                onChange={e => setAuthData({...authData, password: e.target.value})}
              />
            </div>
            {authMode === 'forgot' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                <input 
                  type="password" required
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500",
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                  value={authData.confirmPassword}
                  onChange={e => setAuthData({...authData, confirmPassword: e.target.value})}
                />
              </div>
            )}

            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center"
              >
                {authError}
              </motion.div>
            )}

            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 mt-2">
              {authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {authMode === 'login' && (
              <button 
                onClick={() => setAuthMode('forgot')}
                className="text-sm text-indigo-400 hover:underline font-medium block"
              >
                Forgot Password?
              </button>
            )}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : authMode === 'signup' ? 'login' : 'login')}
              className="text-sm text-indigo-400 hover:underline font-medium"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : authMode === 'signup' ? "Already have an account? Sign in" : "Back to Sign In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden transition-colors duration-300",
      isDarkMode ? "bg-[#0A0A0B] text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn(
              "w-72 flex-shrink-0 border-r flex flex-col",
              isDarkMode ? "bg-[#111113] border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-bold text-lg tracking-tight">Smart Solver</h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 mb-4">
              <button 
                onClick={startNewSession}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4 rotate-[-45deg]" />
                New Session
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6 custom-scrollbar">
              <div className="flex items-center justify-between px-2 mb-2">
                <h2 className={cn(
                  "text-xs font-bold uppercase tracking-widest",
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                )}>User History</h2>
                <History className="w-3.5 h-3.5 text-slate-500" />
              </div>

              {sessions.length === 0 ? (
                <div className="px-2 py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto">
                    <History className="w-5 h-5 text-slate-500 opacity-50" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">No chat history yet</p>
                  <p className="text-[10px] text-slate-600">Start a new session to see it here</p>
                </div>
              ) : (
                (Object.entries(groupedSessions) as [string, Session[]][]).map(([label, items]) => items.length > 0 && (
                  <div key={label} className="space-y-1">
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 mb-2 flex items-center gap-2",
                      isDarkMode ? "text-slate-600" : "text-slate-400"
                    )}>
                      {label === 'Pinned' && <Pin className="w-2.5 h-2.5" />}
                      {label}
                    </div>
                    {items.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => loadSession(s.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, sessionId: s.id });
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition-all group flex items-center gap-3 border",
                          currentSessionId === s.id 
                            ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-sm" 
                            : isDarkMode 
                              ? "hover:bg-slate-800/50 text-slate-400 border-transparent" 
                              : "hover:bg-slate-100 text-slate-600 border-transparent"
                        )}
                      >
                        <ScrollText className={cn(
                          "w-4 h-4 flex-shrink-0 transition-opacity",
                          currentSessionId === s.id ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                        )} />
                        <span className="truncate font-medium">{s.title}</span>
                        {s.is_pinned && (
                          <Pin className="w-3 h-3 ml-auto text-indigo-500 opacity-60" />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 space-y-1">
              <button onClick={() => setActiveTab('chat')} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'chat' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:bg-indigo-400/10")}>
                <Send className="w-4 h-4 rotate-[-45deg]" /> Chat Assistant
              </button>
              <button onClick={() => setActiveTab('resources')} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'resources' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:bg-indigo-400/10")}>
                <BookOpen className="w-4 h-4" /> Resource Finder
              </button>
              <button onClick={() => setActiveTab('planner')} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'planner' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:bg-indigo-400/10")}>
                <Layers className="w-4 h-4" /> Study Roadmap
              </button>
              <button onClick={() => setActiveTab('flashcards')} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'flashcards' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:bg-indigo-400/10")}>
                <Copy className="w-4 h-4" /> Flashcards
              </button>
              <button onClick={() => setActiveTab('quiz')} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'quiz' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:bg-indigo-400/10")}>
                <Check className="w-4 h-4" /> AI Quiz Mode
              </button>
              <button onClick={() => setActiveTab('zen')} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'zen' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:bg-indigo-400/10")}>
                <Wind className="w-4 h-4" /> Zen Mode
              </button>
              <button onClick={() => setActiveTab('join-live')} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'join-live' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:bg-indigo-400/10")}>
                <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse" /> Join Live
              </button>
              
              <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
                {user?.role === 'admin' && (
                  <a href="/admin" className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors">
                    <Layers className="w-4 h-4" /> Admin Panel
                  </a>
                )}
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors">
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative">
        <header className={cn(
          "h-16 flex-shrink-0 border-b flex items-center justify-between px-6 z-10",
          isDarkMode ? "bg-[#0A0A0B]/80 border-slate-800 backdrop-blur-md" : "bg-white/80 border-slate-200 backdrop-blur-md"
        )}>
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className={cn("p-2 rounded-md transition-colors", isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100")}>
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject:</span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                <selectedSubject.icon className="w-3.5 h-3.5" /> {selectedSubject.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'chat' && (
              <button 
                onClick={() => {
                  setShowStudySidebar(!showStudySidebar);
                  if (!showStudySidebar) analyzeSession();
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  showStudySidebar 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                    : isDarkMode ? "bg-slate-800 text-slate-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <Brain className="w-3.5 h-3.5" />
                {showStudySidebar ? "Hide Study Buddy" : "Study Buddy"}
              </button>
            )}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2",
              isDarkMode 
                ? "bg-slate-800 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                : "bg-white border-indigo-600 text-indigo-600 shadow-sm"
            )}>AI</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
          {activeTab === 'join-live' ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto shadow-2xl shadow-red-600/40">
                  <span className="text-2xl">🎥</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Join Live Classes</h2>
                <p className={cn(isDarkMode ? "text-slate-500" : "text-slate-600")}>Connect with instructors and classmates in real-time learning sessions.</p>
              </div>

              {isLoadingClasses ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div>
                </div>
              ) : liveClasses.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("p-8 text-center rounded-3xl border-2 border-dashed", isDarkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-300 bg-slate-50")}
                >
                  <div className="text-4xl mb-3">📭</div>
                  <h3 className="text-lg font-bold mb-2">No Live Classes Yet</h3>
                  <p className={cn(isDarkMode ? "text-slate-500" : "text-slate-600")}>Check back later for upcoming live classes from your instructors.</p>
                </motion.div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {liveClasses.map((cls, i) => (
                    <motion.div 
                      key={cls._id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn("p-6 rounded-2xl border group cursor-pointer hover:shadow-lg transition-all", isDarkMode ? "bg-slate-900 border-slate-800 hover:border-red-500/50" : "bg-white border-slate-200 hover:border-red-500/50")}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-xs font-bold text-red-500 uppercase">LIVE NOW</span>
                          </div>
                          <h3 className="text-lg font-bold">{cls.title}</h3>
                          <p className={cn("text-sm mt-1 font-semibold text-indigo-400", isDarkMode ? "" : "text-indigo-600")}>
                            📚 {cls.subject || 'General'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open(`/meet/${cls.meetingId}`, '_blank')}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all"
                      >
                        Join Now
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'zen' ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-32 h-32 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30"
              >
                <Wind className="w-12 h-12 text-indigo-400" />
              </motion.div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Exam Stress Relief</h2>
                <p className="text-slate-500 max-w-sm">Take a 1-minute breathing break. Inhale as the circle expands, exhale as it shrinks.</p>
              </div>
            </div>
          ) : activeTab === 'planner' ? (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Study Roadmap Generator</h2>
                <p className={cn(isDarkMode ? "text-slate-500" : "text-slate-600")}>Tell us your goal and timeframe, and we'll build a custom study plan for you.</p>
              </div>
              
              <div className={cn("p-6 rounded-3xl border space-y-6", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">What are you studying for?</label>
                  <input 
                    type="text" value={plannerGoal} onChange={e => setPlannerGoal(e.target.value)}
                    placeholder="e.g. Final Exams for Data Structures"
                    className={cn("w-full px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500", isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">How many days do you have?</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={plannerTime} 
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 365)) {
                          setPlannerTime(val);
                        }
                      }}
                      className={cn("w-24 px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500", isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                    />
                    <span className="text-sm text-slate-500 font-medium">Days</span>
                  </div>
                </div>
                <button onClick={generateStudyPlan} disabled={isGeneratingPlan || !plannerGoal.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                  {isGeneratingPlan ? "Generating Your Roadmap..." : "Generate Roadmap"}
                </button>
              </div>

              {plannerResult && (
                <div className="grid md:grid-cols-3 gap-8">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={cn("md:col-span-2 p-8 rounded-3xl border", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="markdown-body"><Markdown>{plannerResult}</Markdown></div>
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className={cn("p-6 rounded-3xl border", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-4">Study Checklist</h3>
                      <div className="space-y-3">
                        {plannerTasks.map(task => (
                          <button 
                            key={task.id} 
                            onClick={() => setPlannerTasks(prev => prev.map(t => t.id === task.id ? {...t, done: !t.done} : t))}
                            className="w-full flex items-center gap-3 text-left group"
                          >
                            <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", task.done ? "bg-indigo-600 border-indigo-600" : "border-slate-600 group-hover:border-indigo-500")}>
                              {task.done && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={cn("text-sm transition-all", task.done ? "text-slate-500 line-through" : "text-slate-300")}>{task.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          ) : activeTab === 'quiz' ? (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">AI Quiz Master</h2>
                <p className={cn(isDarkMode ? "text-slate-500" : "text-slate-600")}>Test your knowledge with AI-generated multiple choice questions.</p>
              </div>

              {quizQuestions.length === 0 ? (
                <div className="flex gap-2">
                  <input 
                    type="text" value={quizTopic} onChange={e => setQuizTopic(e.target.value)}
                    placeholder="e.g. Indian History, Organic Chemistry"
                    className={cn("flex-1 px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500", isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
                  />
                  <button onClick={generateQuiz} disabled={isGeneratingQuiz || !quizTopic.trim()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                    {isGeneratingQuiz ? "Preparing Quiz..." : "Start Quiz"}
                  </button>
                </div>
              ) : quizScore !== null ? (
                <div className="space-y-8">
                  {}
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("p-10 rounded-3xl border text-center space-y-6", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xl")}>
                    <div className="text-6xl font-black bg-gradient-to-r from-indigo-400 to-green-400 bg-clip-text text-transparent">{quizScore} / {quizQuestions.length}</div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold">Quiz Completed! 🎉</h3>
                      <p className={cn("text-sm", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                        {quizScore === quizQuestions.length ? "Perfect score! Outstanding!" : quizScore >= quizQuestions.length - 1 ? "Excellent work!" : quizScore >= quizQuestions.length / 2 ? "Good job! Keep practicing!" : "Keep learning!"}
                      </p>
                    </div>
                  </motion.div>

                  {}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Answer Review</h3>
                    {quizQuestions.map((q, idx) => {
                      const userAnswer = userQuizAnswers[idx];
                      const correctAnswer = q.a;
                      const isCorrect = userAnswer === correctAnswer;
                      
                      return (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={cn("p-4 rounded-xl border", isCorrect ? isDarkMode ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-300" : isDarkMode ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-300")}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={cn("text-lg font-bold", isCorrect ? "text-green-500" : "text-red-500")}>
                              {isCorrect ? "✓" : "✗"}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold mb-2">Q{idx + 1}: {q.q}</p>
                              <div className="space-y-1 text-sm">
                                <p className={cn("font-medium", isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                  Your answer: {q.options[userAnswer]}
                                </p>
                                {!isCorrect && (
                                  <p className="text-green-600 dark:text-green-400 font-medium">
                                    Correct answer: {q.options[correctAnswer]}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => {
                      setQuizQuestions([]);
                      setQuizTopic('');
                      setQuizScore(null);
                      setUserQuizAnswers([]);
                      setSelectedQuizOption(null);
                      setCurrentQuizIndex(0);
                    }} 
                    className="w-full px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                  >
                    Try Another Topic
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={cn("p-8 rounded-3xl border", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                      <div className="text-xs font-semibold text-slate-500">Score: {userQuizAnswers.length}</div>
                    </div>
                    <p className="text-xl font-medium mb-8">{quizQuestions[currentQuizIndex].q}</p>
                    <div className="grid gap-3">
                      {quizQuestions[currentQuizIndex].options.map((opt, i) => {
                        const isSelected = selectedQuizOption === i;
                        const isCorrectAnswer = i === quizQuestions[currentQuizIndex].a;
                        const showFeedback = showAnswerFeedback && selectedQuizOption !== null;
                        const isWrongAnswer = isSelected && showFeedback && !isCorrectAnswer;
                        const isShowCorrect = showFeedback && isCorrectAnswer;
                        
                        return (
                          <motion.button 
                            key={i}
                            whileHover={!showFeedback ? { scale: 1.02 } : {}}
                            onClick={() => !showFeedback && setSelectedQuizOption(i)}
                            disabled={showFeedback}
                            className={cn(
                              "w-full text-left px-6 py-4 rounded-xl border transition-all font-medium text-sm",
                              showFeedback && isShowCorrect 
                                ? "bg-green-500/20 border-green-500 text-green-600 dark:text-green-400" 
                                : showFeedback && isWrongAnswer
                                ? "bg-red-500/20 border-red-500 text-red-600 dark:text-red-400"
                                : isSelected && !showFeedback
                                ? "bg-indigo-600 border-indigo-500 text-white" 
                                : isDarkMode ? "bg-slate-800 border-slate-700 hover:border-indigo-500/50" : "bg-slate-50 border-slate-200 hover:border-indigo-500/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span>{opt}</span>
                              {showFeedback && isShowCorrect && <span className="ml-auto text-lg">✓</span>}
                              {showFeedback && isWrongAnswer && <span className="ml-auto text-lg">✗</span>}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {!showAnswerFeedback ? (
                    <button 
                      disabled={selectedQuizOption === null}
                      onClick={() => setShowAnswerFeedback(true)}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        
                        setUserQuizAnswers(prev => [...prev, selectedQuizOption!]);
                        
                        if (currentQuizIndex === quizQuestions.length - 1) {
                          
                          const isCorrect = selectedQuizOption === quizQuestions[currentQuizIndex].a;
                          const finalScore = userQuizAnswers.filter((ans, idx) => ans === quizQuestions[idx].a).length + (isCorrect ? 1 : 0);
                          setQuizScore(finalScore);
                        } else {
                          
                          setCurrentQuizIndex(prev => prev + 1);
                          setSelectedQuizOption(null);
                          setShowAnswerFeedback(false);
                        }
                      }}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20"
                    >
                      {currentQuizIndex === quizQuestions.length - 1 ? "See Results" : "Next Question"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'flashcards' ? (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-600 flex items-center justify-center mx-auto shadow-2xl shadow-amber-600/40">
                  <Copy className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">AI Flashcard Generator</h2>
                <p className={cn(isDarkMode ? "text-slate-500" : "text-slate-600")}>Enter a topic to generate 10 interactive flashcards for quick revision.</p>
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" value={flashcardTopic} onChange={e => setFlashcardTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Newton's Laws"
                  className={cn("flex-1 px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500", isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
                />
                <button onClick={generateFlashcards} disabled={isGeneratingFlashcards || !flashcardTopic.trim()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                  {isGeneratingFlashcards ? "Generating..." : "Generate"}
                </button>
              </div>

              {flashcards.length > 0 && (
                <div className="flex flex-col items-center space-y-8">
                  <div className="perspective-1000 w-full max-w-md h-64 cursor-pointer" onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}>
                    <motion.div 
                      animate={{ rotateY: showFlashcardAnswer ? 180 : 0 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                      className="relative w-full h-full transform-style-3d"
                    >
                      <div className={cn("absolute inset-0 backface-hidden rounded-3xl border flex flex-col items-center justify-center p-8 text-center", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-lg")}>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">Question</span>
                        <p className="text-lg font-medium">{flashcards[currentFlashcardIndex].q}</p>
                        <p className="mt-6 text-xs text-slate-500">Click to flip</p>
                      </div>
                      <div className={cn("absolute inset-0 backface-hidden rounded-3xl border flex flex-col items-center justify-center p-8 text-center rotate-y-180", isDarkMode ? "bg-indigo-900/20 border-indigo-500/30" : "bg-indigo-50 border-indigo-200 shadow-lg")}>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">Answer</span>
                        <p className="text-lg font-medium">{flashcards[currentFlashcardIndex].a}</p>
                        <p className="mt-6 text-xs text-slate-500">Click to flip back</p>
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex items-center gap-6">
                    <button 
                      disabled={currentFlashcardIndex === 0}
                      onClick={() => { setCurrentFlashcardIndex(prev => prev - 1); setShowFlashcardAnswer(false); }}
                      className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <span className="text-sm font-bold text-slate-500">{currentFlashcardIndex + 1} / {flashcards.length}</span>
                    <button 
                      disabled={currentFlashcardIndex === flashcards.length - 1}
                      onClick={() => { setCurrentFlashcardIndex(prev => prev + 1); setShowFlashcardAnswer(false); }}
                      className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'resources' ? (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-600/40">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Resource Finder</h2>
                <p className={cn(isDarkMode ? "text-slate-500" : "text-slate-600")}>Search for textbooks, research papers, and educational PDFs.</p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" value={resourceQuery} onChange={e => setResourceQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPDFs()}
                  placeholder="e.g. IT sem5 notes, Quantum Mechanics PDF"
                  className={cn("flex-1 px-4 py-3 rounded-xl border transition-all outline-none focus:border-indigo-500", isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
                />
                <button onClick={searchPDFs} disabled={isSearchingResources} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
                  {isSearchingResources ? "Searching..." : "Search"}
                </button>
              </div>
              <div className="grid gap-4">
                {resources.map((res, i) => (
                  <motion.a key={i} href={res.url} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cn("p-4 rounded-xl border flex items-center justify-between group transition-all", isDarkMode ? "bg-slate-900 border-slate-800 hover:border-indigo-500/50" : "bg-white border-slate-200 hover:border-indigo-500/50")}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500"><Download className="w-5 h-5" /></div>
                      <div><h4 className="font-semibold text-sm group-hover:text-indigo-400 transition-colors">{res.title}</h4><p className="text-[10px] text-slate-500 truncate max-w-md">{res.url}</p></div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
                  </motion.a>
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="min-h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-8 py-10">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/40 mt-4"
              >
                <BrainCircuit className="w-8 h-8 text-white" />
              </motion.div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">
                  {greetingType === 'welcome' 
                    ? `Welcome, ${user?.name}! 👋` 
                    : `Welcome back, ${user?.name}! 👏`}
                </h2>
                <p className={cn("max-w-md mx-auto", isDarkMode ? "text-slate-500" : "text-slate-600")}>Select a subject and ask any question to start a new session.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                {SUBJECTS.map((sub) => (
                  <button key={sub.id} onClick={() => setSelectedSubject(sub)} className={cn("p-4 rounded-xl border flex flex-col items-center gap-3 transition-all group", selectedSubject.id === sub.id ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" : isDarkMode ? "bg-slate-900/50 border-slate-800 hover:border-indigo-500/50" : "bg-white border-slate-200 hover:border-indigo-500/50")}>
                    <sub.icon className={cn("w-6 h-6 transition-transform group-hover:scale-110", selectedSubject.id === sub.id ? "text-white" : "text-indigo-400")} />
                    <span className={cn("text-xs font-bold uppercase tracking-wider", selectedSubject.id === sub.id ? "text-white" : isDarkMode ? "text-slate-300" : "text-slate-700")}>{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 pb-20">
              {messages.map((msg) => (
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold border", msg.role === 'user' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300")}>
                    {msg.role === 'user' ? 'ME' : 'AI'}
                  </div>
                  <div className={cn("flex flex-col gap-2 max-w-[85%]", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn("px-4 py-3 rounded-2xl text-sm shadow-sm", msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : isDarkMode ? "bg-slate-900 border border-slate-800 rounded-tl-none" : "bg-white border border-slate-200 rounded-tl-none")}>
                      {msg.image && <img src={msg.image} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-3 border border-white/10" />}
                      <div className="markdown-body"><Markdown>{msg.content}</Markdown></div>
                      {msg.role === 'assistant' && (
                        <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center gap-2">
                          <button 
                            onClick={() => simplifyMessage(msg.id, msg.content)}
                            disabled={isSimplifying === msg.id}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                              isDarkMode ? "bg-slate-800 text-slate-400 hover:text-indigo-400" : "bg-slate-100 text-slate-500 hover:text-indigo-600"
                            )}
                          >
                            <Zap className={cn("w-3 h-3", isSimplifying === msg.id && "animate-pulse")} />
                            {isSimplifying === msg.id ? "Simplifying..." : "ELI5 (Simplify)"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && <div className="flex gap-4"><div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div><div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none"><div className="flex gap-1"><div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {activeTab === 'chat' && (
          <div className={cn("p-6 md:p-10 flex-shrink-0 z-10", isDarkMode ? "bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B] to-transparent" : "bg-gradient-to-t from-slate-50 via-slate-50 to-transparent")}>
            <div className="max-w-3xl mx-auto relative">
              <AnimatePresence>
                {image && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="absolute bottom-full mb-4 left-0 p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex items-center gap-3">
                    <img src={image} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                    <div className="pr-2"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Image Attached</p><button onClick={() => setImage(null)} className="text-xs text-red-400 hover:underline font-medium">Remove</button></div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className={cn("relative rounded-2xl border transition-all duration-300 shadow-2xl", isDarkMode ? "bg-[#111113] border-slate-800 focus-within:border-indigo-500/50" : "bg-white border-slate-200 focus-within:border-indigo-500/50")}>
                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder={`Ask a ${selectedSubject.name} question...`} className={cn("w-full bg-transparent border-none focus:ring-0 p-4 pr-32 min-h-[60px] max-h-40 text-sm resize-none custom-scrollbar", isDarkMode ? "text-white" : "text-slate-900")} />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button 
                    onClick={toggleListening} 
                    className={cn(
                      "p-2 rounded-lg transition-colors", 
                      isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-slate-800 text-slate-400"
                    )}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"><ImageIcon className="w-4 h-4" /></button>
                  <button onClick={handleSend} disabled={isLoading || (!input.trim() && !image)} className={cn("p-2 rounded-lg transition-all", isLoading || (!input.trim() && !image) ? "bg-slate-800 text-slate-600 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/20")}><Send className="w-4 h-4" /></button>
                </div>
              </div>
              <p className={cn("mt-3 text-[10px] text-center font-medium", isDarkMode ? "text-slate-500" : "text-slate-400")}>Smart Solver AI can make mistakes. Check important info.</p>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setImage(r.result as string); r.readAsDataURL(f); } }} accept="image/*" className="hidden" />
      </main>

      <AnimatePresence>
        {showStudySidebar && activeTab === 'chat' && (
          <motion.aside 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className={cn(
              "w-80 flex-shrink-0 border-l flex flex-col z-20",
              isDarkMode ? "bg-[#0A0A0B] border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className="h-16 flex-shrink-0 border-b border-slate-800 flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-widest">Study Buddy</h2>
              </div>
              <button onClick={() => setShowStudySidebar(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Current Study Goal</h3>
                <div className={cn("p-3 rounded-xl border transition-all", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")}>
                  {isEditingGoal ? (
                    <div className="flex gap-2">
                      <input 
                        autoFocus
                        type="text" value={studyGoal} onChange={e => setStudyGoal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && setIsEditingGoal(false)}
                        placeholder="Set a goal..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs text-white p-0"
                      />
                      <button onClick={() => setIsEditingGoal(false)} className="text-[10px] font-bold text-indigo-400">Save</button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsEditingGoal(true)}>
                      <p className={cn("text-xs", studyGoal ? "text-white" : "text-slate-500 italic")}>
                        {studyGoal || "What's your goal for this session?"}
                      </p>
                      <Sparkles className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Session Summary</h3>
                  <button onClick={analyzeSession} disabled={isAnalyzingSession} className="text-[10px] font-bold text-indigo-400 hover:underline">
                    {isAnalyzingSession ? "Analyzing..." : "Refresh"}
                  </button>
                </div>
                {isAnalyzingSession ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-slate-800 rounded w-full" />
                    <div className="h-3 bg-slate-800 rounded w-2/3" />
                  </div>
                ) : sessionSummary ? (
                  <p className={cn("text-xs leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    {sessionSummary}
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 italic">No analysis yet. Chat more to see insights!</p>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Key Concepts</h3>
                <div className="flex flex-wrap gap-2">
                  {sessionConcepts.length > 0 ? sessionConcepts.map((concept, i) => (
                    <span key={i} className="px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                      {concept}
                    </span>
                  )) : (
                    <p className="text-xs text-slate-600 italic">Chat to extract concepts</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Quick Tools</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => {
                      setFlashcardTopic(messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content.slice(0, 50) || "");
                      setActiveTab('flashcards');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/50 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Create Flashcards</p>
                      <p className="text-[10px] text-slate-500">From this topic</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      setQuizTopic(messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content.slice(0, 50) || "");
                      setActiveTab('quiz');
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/50 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Take a Quiz</p>
                      <p className="text-[10px] text-slate-500">Test your knowledge</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      const history = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n---\n\n');
                      const blob = new Blob([`# Study Notes - ${new Date().toLocaleDateString()}\n\n${history}`], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `study-notes-${Date.now()}.md`;
                      a.click();
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/50 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Export Notes</p>
                      <p className="text-[10px] text-slate-500">Save as Markdown</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-800">
              <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Lightbulb className="w-4 h-4" />
                  <p className="text-xs font-bold">Pro Tip</p>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Use the **ELI5** button on any AI response to get a simpler explanation of complex topics!
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      {contextMenu && (
        <div 
          className={cn(
            "fixed z-[100] w-48 rounded-xl shadow-2xl border p-1.5 backdrop-blur-xl",
            isDarkMode ? "bg-slate-900/90 border-slate-700 shadow-black/50" : "bg-white/90 border-slate-200 shadow-slate-200/50"
          )}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              togglePinSession(contextMenu.sessionId);
              setContextMenu(null);
            }}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-700"
            )}
          >
            {sessions.find(s => s.id === contextMenu.sessionId)?.is_pinned 
              ? <PinOff className="w-4 h-4" /> 
              : <Pin className="w-4 h-4" />
            }
            {sessions.find(s => s.id === contextMenu.sessionId)?.is_pinned ? 'Unpin Session' : 'Pin Session'}
          </button>
          <button 
            onClick={() => {
              deleteSession(contextMenu.sessionId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Session
          </button>
        </div>
      )}
    </div>
  );
}

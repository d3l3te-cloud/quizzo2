import React, { useState, useEffect, useRef } from 'react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';

// Lucide React for icons
import { User, GraduationCap, School, LogOut, Plus, BarChart2, Award, Clock, Check, X, Code } from 'lucide-react';

// Use this to ensure the app ID is available
const firebaseConfig = {
    apiKey: "AIzaSyBLCHgSmltZfyxpbQyhmPfoeQdSCMql-l0",
    authDomain: "quizzo-2.firebaseapp.com",
    projectId: "quizzo-2",
    storageBucket: "quizzo-2.firebasestorage.app",
    messagingSenderId: "163469458991",
    appId: "1:163469458991:web:8c0eb4536b5b501865d0da"
};

// Helper function to handle Firestore pathing
const getDocPath = (userId, collectionName) => `/artifacts/${appId}/users/${userId}/${collectionName}`;
const getQuizCollectionPath = () => `/artifacts/${appId}/public/data/quizzes`;
const getQuizAttemptsCollectionPath = () => `/artifacts/${appId}/public/data/quizAttempts`;

// A simple confirmation dialog component
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
      <p className="text-lg font-semibold mb-4">{message}</p>
      <div className="flex justify-center space-x-4">
        <button onClick={onConfirm} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors">
          Confirm
        </button>
        <button onClick={onCancel} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// A simple toast notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
  const icon = type === 'error' ? '❌' : '✅';

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white flex items-center space-x-3 ${bgColor}`}>
      <span>{icon}</span>
      <p>{message}</p>
    </div>
  );
};

// Helper function to generate a random quiz code
const generateQuizCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const QuizApp = () => {
  const [app, setApp] = useState(null);
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('auth'); // 'auth', 'profile', 'teacher', 'student', 'create-quiz', 'attempt-quiz', 'quiz-analytics', 'quiz-result'
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [createdQuizCode, setCreatedQuizCode] = useState(null);

  // Initialize Firebase and authenticate
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        const appInstance = initializeApp(firebaseConfig);
        const authInstance = getAuth(appInstance);
        const dbInstance = getFirestore(appInstance);

        setApp(appInstance);
        setAuth(authInstance);
        setDb(dbInstance);

        // Sign in using the provided token or anonymously
        const __initial_auth_token = typeof window !== 'undefined' ? window.__initial_auth_token : undefined;
        if (__initial_auth_token) {
          await signInWithCustomToken(authInstance, __initial_auth_token);
        } else {
          await signInAnonymously(authInstance);
        }
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        setLoading(false);
      }
    };
    initializeFirebase();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const uid = currentUser.uid;
        setUserId(uid);
        setUser(currentUser);

        // Check if user profile exists
        const userDocRef = doc(db, getDocPath(uid, 'profile'), 'data');
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userProfile = docSnap.data();
          setProfile(userProfile);
          if (userProfile.designation === 'teacher') {
            setView('teacher');
          } else {
            setView('student');
          }
        } else {
          setView('profile');
        }
      } else {
        setUser(null);
        setProfile(null);
        setView('auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  // Show a toast message
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSignOut = async () => {
    setConfirm({
      message: "Are you sure you want to sign out?",
      onConfirm: async () => {
        try {
          await signOut(auth);
          showToast('Signed out successfully!');
        } catch (error) {
          console.error('Error signing out:', error);
          showToast('Error signing out.', 'error');
        } finally {
          setConfirm(null);
        }
      },
      onCancel: () => setConfirm(null)
    });
  };

  // --- Components for Different Views ---

  const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAuth = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, email, password);
          showToast('Signed in successfully!');
        } else {
          await createUserWithEmailAndPassword(auth, email, password);
          showToast('Account created successfully!');
          setView('profile');
        }
      } catch (err) {
        console.error(err);
        setError(err.message);
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <div className="mt-6 text-center text-gray-600">
            <p className="inline">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 ml-2 font-medium hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProfileCompletion = () => {
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [designation, setDesignation] = useState('');
    const [error, setError] = useState('');

    const handleSaveProfile = async (e) => {
      e.preventDefault();
      if (!name || !gender || !designation) {
        setError('All fields are required.');
        return;
      }
      setLoading(true);
      try {
        const userDocRef = doc(db, getDocPath(userId, 'profile'), 'data');
        const profileData = { name, gender, designation, email: user.email, userId };
        await setDoc(userDocRef, profileData);
        setProfile(profileData);
        if (designation === 'teacher') {
          setView('teacher');
        } else {
          setView('student');
        }
        showToast('Profile saved successfully!');
      } catch (err) {
        console.error("Error saving profile:", err);
        setError('Failed to save profile. Please try again.');
        showToast('Failed to save profile.', 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Complete Your Profile</h1>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Designation</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Designation</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Save Profile
            </button>
          </form>
        </div>
      </div>
    );
  };

  const Header = () => (
    <div className="flex items-center justify-between p-4 bg-white shadow-md rounded-b-xl">
      <h1 className="text-xl md:text-2xl font-bold text-blue-600">
        Quiz App
      </h1>
      <div className="flex items-center space-x-4">
        {profile && (
          <div className="flex items-center space-x-2">
            {profile.designation === 'teacher' ? <GraduationCap className="text-blue-600" /> : <School className="text-blue-600" />}
            <span className="font-medium hidden sm:inline">{profile.name} ({profile.designation})</span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </div>
  );

  const TeacherDashboard = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [teacherName, setTeacherName] = useState('');

    useEffect(() => {
      if (!db || !userId) return;

      const userDocRef = doc(db, getDocPath(userId, 'profile'), 'data');
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setTeacherName(docSnap.data().name);
        }
      });

      const q = query(collection(db, getQuizCollectionPath()), where('teacherId', '==', userId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const quizzesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setQuizzes(quizzesData);
      });

      return () => {
        unsubscribe();
        unsubscribeUser();
      };
    }, [db, userId]);

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <Header />
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">My Quizzes</h2>
            <button
              onClick={() => { setCreatedQuizCode(null); setView('create-quiz'); }}
              className="bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-lg"
            >
              <Plus size={20} />
              <span>Create New Quiz</span>
            </button>
          </div>
          {quizzes.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">You haven't created any quizzes yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 truncate">{quiz.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Quiz Code: <span className="font-mono text-blue-600 font-bold">{quiz.quizCode}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {quiz.questions.length} Questions | Mode: <span className="font-semibold capitalize">{quiz.mode}</span>
                  </p>
                  {quiz.mode === 'test' && (
                    <p className="text-sm text-gray-500">
                      Time Limit: <span className="font-semibold">{quiz.timeLimit} minutes</span>
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setSelectedQuiz(quiz);
                      setView('quiz-analytics');
                    }}
                    className="mt-4 w-full bg-green-500 text-white p-2 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <BarChart2 size={18} />
                    <span>View Analytics</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const CreateQuiz = () => {
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState('quiz'); // 'quiz' or 'test'
    const [timeLimit, setTimeLimit] = useState(null); // in minutes
    const [questions, setQuestions] = useState([{ type: 'single-choice', questionText: '', numOptions: 4, options: ['', '', '', ''], correctAnswer: 0 }]);
    const [saving, setSaving] = useState(false);

    const handleQuestionChange = (index, field, value) => {
      const newQuestions = [...questions];
      if (field === 'numOptions') {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num > 0) {
          const newOptions = Array(num).fill('').map((_, i) => newQuestions[index].options[i] || '');
          newQuestions[index].options = newOptions;
          newQuestions[index].numOptions = num;
        } else {
          newQuestions[index].numOptions = value;
        }
      } else {
        newQuestions[index][field] = value;
      }
      setQuestions(newQuestions);
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
      const newQuestions = [...questions];
      newQuestions[qIndex].options[oIndex] = value;
      setQuestions(newQuestions);
    };

    const handleCorrectAnswerChange = (qIndex, value) => {
      const newQuestions = [...questions];
      newQuestions[qIndex].correctAnswer = value;
      setQuestions(newQuestions);
    };
    
    const handleMultiChoiceChange = (qIndex, oIndex) => {
      const newQuestions = [...questions];
      const newCorrectAnswers = newQuestions[qIndex].correctAnswer || [];
      if (newCorrectAnswers.includes(oIndex)) {
        newQuestions[qIndex].correctAnswer = newCorrectAnswers.filter(i => i !== oIndex);
      } else {
        newQuestions[qIndex].correctAnswer = [...newCorrectAnswers, oIndex];
      }
      setQuestions(newQuestions);
    };
    
    const addQuestion = () => {
      setQuestions([...questions, { type: 'single-choice', questionText: '', numOptions: 4, options: ['', '', '', ''], correctAnswer: 0 }]);
    };

    const handleSaveQuiz = async (e) => {
      e.preventDefault();
      setSaving(true);
      try {
        const quizRef = collection(db, getQuizCollectionPath());
        const quizCode = generateQuizCode();
        const quizData = {
          title,
          mode,
          timeLimit: mode === 'test' ? parseInt(timeLimit, 10) : null,
          teacherId: userId,
          teacherName: profile.name,
          questions,
          quizCode,
          createdAt: serverTimestamp(),
        };
        await addDoc(quizRef, quizData);
        showToast('Quiz created successfully!');
        setCreatedQuizCode(quizCode);
        setTitle('');
        setMode('quiz');
        setTimeLimit(null);
        setQuestions([{ type: 'single-choice', questionText: '', numOptions: 4, options: ['', '', '', ''], correctAnswer: 0 }]);
      } catch (err) {
        console.error('Error creating quiz:', err);
        showToast('Error creating quiz.', 'error');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <Header />
        <div className="flex items-center mt-8 mb-6">
          <button onClick={() => setView('teacher')} className="text-blue-600 hover:underline mr-4">
            ← Go to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Create New Quiz</h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          {createdQuizCode ? (
            <div className="text-center p-8">
              <h3 className="text-3xl font-bold text-green-600 mb-4">Quiz Created!</h3>
              <p className="text-xl text-gray-700">Share this code with your students:</p>
              <p className="text-6xl font-mono text-blue-600 font-bold tracking-widest my-8 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                {createdQuizCode}
              </p>
              <button onClick={() => setView('teacher')} className="bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveQuiz} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Quiz Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Quiz Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="quiz">Quiz (Untimed)</option>
                    <option value="test">Test (Timed)</option>
                  </select>
                </div>
                {mode === 'test' && (
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">Time Limit (minutes)</label>
                    <input
                      type="number"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                  </div>
                )}
              </div>
              
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-gray-100 p-6 rounded-lg shadow-inner border border-gray-200">
                  <h3 className="text-lg font-bold mb-3">Question {qIndex + 1}</h3>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Question Type</label>
                    <select
                      value={q.type}
                      onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single-choice">Single Choice</option>
                      <option value="multi-choice">Multiple Choice</option>
                      <option value="short-answer">Short Answer</option>
                      <option value="numerical">Numerical</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">Question Text</label>
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  {q.type === 'single-choice' || q.type === 'multi-choice' ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-1">Number of Options</label>
                        <input
                          type="number"
                          value={q.numOptions}
                          onChange={(e) => handleQuestionChange(qIndex, 'numOptions', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="2"
                          max="10"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-gray-700">Options:</p>
                        {q.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center space-x-2">
                            {q.type === 'single-choice' ? (
                              <input
                                type="radio"
                                name={`correct-${qIndex}`}
                                checked={q.correctAnswer === oIndex}
                                onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                className="form-radio text-blue-600 h-5 w-5"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                name={`correct-${qIndex}-${oIndex}`}
                                checked={q.correctAnswer?.includes(oIndex)}
                                onChange={() => handleMultiChoiceChange(qIndex, oIndex)}
                                className="form-checkbox text-blue-600 h-5 w-5 rounded"
                              />
                            )}
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">Correct Answer</label>
                      <input
                        type={q.type === 'numerical' ? 'number' : 'text'}
                        value={q.correctAnswer}
                        onChange={(e) => handleCorrectAnswerChange(qIndex, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Add Question</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-green-400"
                >
                  {saving ? 'Saving...' : 'Save Quiz'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // Helper function for scoring
  const calculateScore = (quiz, studentResponses) => {
    let score = 0;
    quiz.questions.forEach((question, index) => {
      const studentResponse = studentResponses.find(res => res.questionIndex === index);
      if (!studentResponse) return;
      
      const studentAnswer = studentResponse.selectedAnswer;
      const correctAnswer = question.correctAnswer;
      let isCorrect = false;

      switch(question.type) {
        case 'single-choice':
          isCorrect = studentAnswer === correctAnswer;
          break;
        case 'multi-choice':
          const studentAnswersSorted = Array.isArray(studentAnswer) ? studentAnswer.slice().sort() : [];
          const correctAnswersSorted = Array.isArray(correctAnswer) ? correctAnswer.slice().sort() : [];
          isCorrect = JSON.stringify(studentAnswersSorted) === JSON.stringify(correctAnswersSorted);
          break;
        case 'short-answer':
          isCorrect = studentAnswer?.toLowerCase() === correctAnswer?.toLowerCase();
          break;
        case 'numerical':
          isCorrect = parseFloat(studentAnswer) === parseFloat(correctAnswer);
          break;
        default:
          isCorrect = false;
      }
      if (isCorrect) {
        score++;
      }
    });
    return score;
  };

  const QuizAnalytics = () => {
    const [attempts, setAttempts] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
      if (!db || !selectedQuiz) return;

      const q = query(collection(db, getQuizAttemptsCollectionPath()), where('quizId', '==', selectedQuiz.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const attemptsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const leaderboardData = attemptsData.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // If scores are equal, sort by total time taken (lower is better)
          const totalTimeA = a.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
          const totalTimeB = b.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
          return totalTimeA - totalTimeB;
        }).map((attempt, index) => ({
          ...attempt,
          rank: index + 1
        }));
        setLeaderboard(leaderboardData);
        setAttempts(attemptsData);
      });

      return () => unsubscribe();
    }, [db, selectedQuiz]);

    if (!selectedQuiz) {
      return null;
    }

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <Header />
        <div className="flex items-center mt-8 mb-6">
          <button onClick={() => setView('teacher')} className="text-blue-600 hover:underline mr-4">
            ← Go to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-800 truncate">{selectedQuiz.title} Analytics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Detailed Responses */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2 text-gray-800">
              <BarChart2 size={24} />
              <span>Detailed Responses ({attempts.length})</span>
            </h3>
            {attempts.length === 0 ? (
              <p className="text-gray-500">No attempts for this quiz yet.</p>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto">
                {attempts.map(attempt => (
                  <div key={attempt.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-800">{attempt.studentName}</p>
                      <p className="text-sm text-gray-500">Score: <span className="font-bold text-blue-600">{attempt.score}/{selectedQuiz.questions.length}</span></p>
                    </div>
                    <ul className="space-y-2">
                      {attempt.responses.map((response, index) => {
                        const question = selectedQuiz.questions[response.questionIndex];
                        const isCorrect = calculateScore({ questions: [question] }, [{ ...response, questionIndex: 0 }]);
                        
                        return (
                          <li key={index} className={`p-3 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                            <p className="text-sm font-medium">Q{index + 1}: {question.questionText}</p>
                            <p className={`text-xs ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              Your Answer: <span className="font-semibold">
                                {Array.isArray(response.selectedAnswer) ? 
                                  response.selectedAnswer.map(idx => question.options[idx]).join(', ') :
                                  (question.type === 'single-choice' ? question.options[response.selectedAnswer] : response.selectedAnswer)
                                }
                              </span>
                            </p>
                            {!isCorrect && (
                              <p className="text-xs text-gray-700">Correct: <span className="font-semibold">
                                {Array.isArray(question.correctAnswer) ? 
                                  question.correctAnswer.map(idx => question.options[idx]).join(', ') :
                                  (question.type === 'single-choice' ? question.options[question.correctAnswer] : question.correctAnswer)
                                }
                              </span></p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Time taken: {response.timeTakenSeconds}s</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <Leaderboard data={leaderboard} quizTitle={selectedQuiz.title} totalQuestions={selectedQuiz.questions.length} />
        </div>
      </div>
    );
  };

  const StudentDashboard = () => {
    const [quizCode, setQuizCode] = useState('');
    const [error, setError] = useState('');

    const handleFindQuiz = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
        const q = query(collection(db, getQuizCollectionPath()), where('quizCode', '==', quizCode.toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('Quiz not found. Please check the code.');
          showToast('Quiz not found. Please check the code.', 'error');
          setLoading(false);
          return;
        }

        const quizDoc = querySnapshot.docs[0];
        const quizData = { id: quizDoc.id, ...quizDoc.data() };
        
        // Check if student has already attempted this quiz
        const attemptsQ = query(collection(db, getQuizAttemptsCollectionPath()), where('quizId', '==', quizData.id), where('studentId', '==', userId));
        const attemptsSnapshot = await getDocs(attemptsQ);
        
        if (!attemptsSnapshot.empty) {
          setError('You have already attempted this quiz.');
          showToast('You have already attempted this quiz.', 'error');
          setLoading(false);
          return;
        }

        setSelectedQuiz(quizData);
        setView('attempt-quiz');
      } catch (err) {
        console.error('Error finding quiz:', err);
        setError('An error occurred. Please try again.');
        showToast('An error occurred. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <Header />
        <div className="mt-8 text-center bg-white p-8 rounded-xl shadow-lg w-full max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Enter Quiz Code</h2>
          <form onSubmit={handleFindQuiz} className="space-y-4">
            <input
              type="text"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              className="w-full p-4 border-2 border-gray-300 rounded-lg text-center text-2xl font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ABC123"
              required
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              disabled={loading}
            >
              Start Quiz
            </button>
          </form>
        </div>
      </div>
    );
  };

  const QuizAttempt = () => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [responses, setResponses] = useState([]);
    const [timer, setTimer] = useState(selectedQuiz.mode === 'test' ? selectedQuiz.timeLimit * 60 : 0);
    const intervalRef = useRef(null);

    useEffect(() => {
      if (selectedQuiz.mode === 'test') {
        intervalRef.current = setInterval(() => {
          setTimer(prev => {
            if (prev <= 1) {
              clearInterval(intervalRef.current);
              submitQuiz(true); // Submit automatically on timer end
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        intervalRef.current = setInterval(() => {
          setTimer(prev => prev + 1);
        }, 1000);
      }
      return () => clearInterval(intervalRef.current);
    }, [selectedQuiz]);

    const handleAnswerChange = (value) => {
        if (selectedQuiz.questions[currentQuestionIndex].type === 'multi-choice') {
            const newAnswers = Array.isArray(selectedAnswer) ? [...selectedAnswer] : [];
            if (newAnswers.includes(value)) {
              setSelectedAnswer(newAnswers.filter(a => a !== value));
            } else {
              setSelectedAnswer([...newAnswers, value]);
            }
        } else {
            setSelectedAnswer(value);
        }
    };

    const handleNextQuestion = () => {
      const timeTaken = selectedQuiz.mode === 'test' 
        ? selectedQuiz.timeLimit * 60 - timer - (responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0))
        : timer - (responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0));
        
      const newResponses = [
        ...responses,
        {
          questionIndex: currentQuestionIndex,
          selectedAnswer: selectedAnswer,
          timeTakenSeconds: timeTaken,
        }
      ];
      setResponses(newResponses);

      if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        submitQuiz(false, newResponses);
      }
    };
    
    const submitQuiz = async (timedOut = false, finalResponses = null) => {
      setLoading(true);
      clearInterval(intervalRef.current);
      
      const responsesToSubmit = finalResponses || [...responses, {
          questionIndex: currentQuestionIndex,
          selectedAnswer: selectedAnswer,
          timeTakenSeconds: selectedQuiz.mode === 'test' ? (timedOut ? selectedQuiz.timeLimit * 60 - responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0) : selectedQuiz.timeLimit * 60 - timer - responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0)) : timer - responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0),
      }];
      
      const finalScore = calculateScore(selectedQuiz, responsesToSubmit);

      try {
        const attemptRef = collection(db, getQuizAttemptsCollectionPath());
        await addDoc(attemptRef, {
          quizId: selectedQuiz.id,
          studentId: userId,
          studentName: profile.name,
          responses: responsesToSubmit,
          score: finalScore,
          attemptedAt: serverTimestamp(),
        });
        showToast('Quiz submitted successfully!');
        setSelectedQuiz({ ...selectedQuiz, score: finalScore, attemptedQuizId: 'new', responses: responsesToSubmit });
        setView('quiz-result');
      } catch (err) {
        console.error('Error submitting quiz:', err);
        showToast('Error submitting quiz.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (!selectedQuiz) {
      return null;
    }
    const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
    const displayTimer = selectedQuiz.mode === 'test' ? timer : timer;

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <Header />
        <div className="flex items-center mt-8 mb-6">
          <button onClick={() => setView('student')} className="text-blue-600 hover:underline mr-4">
            ← Go to Dashboard
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">{selectedQuiz.title}</h2>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg text-gray-700 font-medium">Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}</p>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock size={20} />
              <span>{Math.floor(displayTimer / 60).toString().padStart(2, '0')}:{Math.floor(displayTimer % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
          <div className="border-b pb-4 mb-4">
          </div>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">{currentQuestion.questionText}</h3>
            {currentQuestion.type === 'single-choice' && (
              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerChange(index)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                      ${selectedAnswer === index
                        ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
                      }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            {currentQuestion.type === 'multi-choice' && (
              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <label key={index} className="flex items-center p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={Array.isArray(selectedAnswer) && selectedAnswer.includes(index)}
                      onChange={() => handleAnswerChange(index)}
                      className="form-checkbox h-5 w-5 text-blue-600 rounded"
                    />
                    <span className="ml-3 text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            )}
            {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'numerical') && (
              <input
                type={currentQuestion.type === 'numerical' ? 'number' : 'text'}
                value={selectedAnswer || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter your ${currentQuestion.type === 'numerical' ? 'number' : 'answer'} here...`}
              />
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleNextQuestion}
              disabled={selectedAnswer === null || (Array.isArray(selectedAnswer) && selectedAnswer.length === 0)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-green-400"
            >
              {currentQuestionIndex === selectedQuiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const QuizResult = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [userRank, setUserRank] = useState(null);

    useEffect(() => {
      if (!db || !selectedQuiz) return;

      const q = query(collection(db, getQuizAttemptsCollectionPath()), where('quizId', '==', selectedQuiz.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const attemptsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const sortedLeaderboard = attemptsData.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          const totalTimeA = a.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
          const totalTimeB = b.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
          return totalTimeA - totalTimeB;
        }).map((attempt, index) => ({
          ...attempt,
          rank: index + 1
        }));

        setLeaderboard(sortedLeaderboard);

        const currentUserAttempt = sortedLeaderboard.find(attempt => attempt.studentId === userId);
        if (currentUserAttempt) {
          setUserRank(currentUserAttempt.rank);
        }
      });

      return () => unsubscribe();
    }, [db, selectedQuiz, userId]);

    if (!selectedQuiz || !selectedQuiz.responses) {
      return null;
    }
    const finalScore = selectedQuiz.score;
    const totalQuestions = selectedQuiz.questions.length;
    const totalTimeTaken = selectedQuiz.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);

    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <Header />
        <div className="mt-8 mb-6 flex items-center">
          <button onClick={() => setView('student')} className="text-blue-600 hover:underline mr-4">
            ← Go to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Your Result: {selectedQuiz.title}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Your Performance</h3>
            <div className="flex flex-col space-y-2 mb-6">
              <p className="text-lg text-gray-700">Score: <span className="font-bold text-green-600">{finalScore}/{totalQuestions}</span></p>
              <p className="text-lg text-gray-700">Time Taken: <span className="font-bold text-blue-600">{totalTimeTaken}s</span></p>
              {userRank && (
                <p className="text-lg text-gray-700">Your Rank: <span className="font-bold text-purple-600">{userRank}</span></p>
              )}
            </div>
            <h4 className="text-lg font-bold mb-2 text-gray-800">Analysis</h4>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {selectedQuiz.questions.map((question, index) => {
                const studentResponse = selectedQuiz.responses.find(res => res.questionIndex === index);
                const isCorrect = calculateScore({ questions: [question] }, [{ ...studentResponse, questionIndex: 0 }]);
                const studentAnswer = studentResponse?.selectedAnswer;
                const correctAnswer = question.correctAnswer;
                
                let displayStudentAnswer = '';
                let displayCorrectAnswer = '';

                switch(question.type) {
                  case 'single-choice':
                    displayStudentAnswer = question.options[studentAnswer] || 'Not Answered';
                    displayCorrectAnswer = question.options[correctAnswer];
                    break;
                  case 'multi-choice':
                    displayStudentAnswer = Array.isArray(studentAnswer) && studentAnswer.length > 0 ? studentAnswer.map(idx => question.options[idx]).join(', ') : 'Not Answered';
                    displayCorrectAnswer = Array.isArray(correctAnswer) && correctAnswer.length > 0 ? correctAnswer.map(idx => question.options[idx]).join(', ') : '';
                    break;
                  case 'short-answer':
                  case 'numerical':
                    displayStudentAnswer = studentAnswer || 'Not Answered';
                    displayCorrectAnswer = correctAnswer;
                    break;
                }

                return (
                  <div key={index} className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="font-semibold text-gray-800 flex items-center">
                      <span className="mr-2">{isCorrect ? <Check className="text-green-600" /> : <X className="text-red-600" />}</span>
                      Q{index + 1}: {question.questionText}
                    </p>
                    <p className={`mt-2 font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      Your Answer: {displayStudentAnswer}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm font-medium text-gray-700">Correct Answer: {displayCorrectAnswer}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Time taken: {studentResponse?.timeTakenSeconds || 0}s</p>
                  </div>
                );
              })}
            </div>
          </div>
          <Leaderboard data={leaderboard} quizTitle={selectedQuiz.title} totalQuestions={totalQuestions} />
        </div>
      </div>
    );
  };

  const Leaderboard = ({ data, quizTitle, totalQuestions }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold mb-4 flex items-center space-x-2 text-gray-800">
        <Award size={24} />
        <span>Leaderboard: {quizTitle}</span>
      </h3>
      {data.length === 0 ? (
        <p className="text-gray-500">No attempts yet. Be the first to play!</p>
      ) : (
        <ul className="space-y-3">
          {data.map((entry, index) => {
            const totalTime = entry.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);
            return (
              <li
                key={entry.id}
                className={`flex items-center justify-between p-4 rounded-lg ${index < 3 ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-gray-100'} ${entry.studentId === userId ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-lg w-6 text-center">{entry.rank}.</span>
                  <div className="flex items-center space-x-2">
                    <User className="text-gray-500" />
                    <span className="font-semibold">{entry.studentName}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">{entry.score}/{totalQuestions}</p>
                  <p className="text-sm text-gray-500">{totalTime}s</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    switch (view) {
      case 'auth':
        return <AuthPage />;
      case 'profile':
        return <ProfileCompletion />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      case 'create-quiz':
        return <CreateQuiz />;
      case 'attempt-quiz':
        return <QuizAttempt />;
      case 'quiz-analytics':
        return <QuizAnalytics />;
      case 'quiz-result':
        return <QuizResult />;
      default:
        return <AuthPage />;
    }
  };

  return (
    <div className="font-sans antialiased text-gray-900">
      <style>{`
        body {
          background-color: #f3f4f6;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {renderView()}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={confirm.onCancel} />}
    </div>
  );
};

export default QuizApp;

/*
  Firestore Security Rules for this application:

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // Allow authenticated users to manage their own profile data
      match /artifacts/{appId}/users/{userId}/profile/data {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Quizzes are public data, but only teachers can create them
      match /artifacts/{appId}/public/data/quizzes/{quizId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && get(/databases/$(database)/documents/artifacts/$(appId)/users/$(request.auth.uid)/profile/data).data.designation == 'teacher';
        allow update, delete: if request.auth != null && resource.data.teacherId == request.auth.uid;
      }

      // Quiz attempts are public data (for leaderboards), but tied to the student
      match /artifacts/{appId}/public/data/quizAttempts/{attemptId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null && get(/databases/$(database)/documents/artifacts/$(appId)/users/$(request.auth.uid)/profile/data).data.designation == 'student';
      }
    }
  }
*/

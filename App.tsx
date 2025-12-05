import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { getStore, logoutUser } from './services/store';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import QuizArea from './components/QuizArea';

type ViewState = 'admin' | 'quiz';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userPhone, setUserPhone] = useState<string>('');
  const [currentView, setCurrentView] = useState<ViewState>('quiz');
  
  // State to handle direct navigation to a specific PDF or Quiz in QuizArea
  const [targetPdfId, setTargetPdfId] = useState<string | null>(null);
  const [targetQuizId, setTargetQuizId] = useState<string | null>(null);

  useEffect(() => {
    // Check initial session
    const store = getStore();
    if (store.currentUser) {
      setIsAuthenticated(true);
      setRole(store.currentUser.role);
      setUserPhone(store.currentUser.phoneNumber);
      // Default view based on role
      setCurrentView(store.currentUser.role === UserRole.ADMIN ? 'admin' : 'quiz');
    }
  }, []);

  const handleLoginSuccess = () => {
    const store = getStore();
    if (store.currentUser) {
      setIsAuthenticated(true);
      setRole(store.currentUser.role);
      setUserPhone(store.currentUser.phoneNumber);
      setCurrentView(store.currentUser.role === UserRole.ADMIN ? 'admin' : 'quiz');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
    setRole(null);
    setUserPhone('');
    setTargetPdfId(null);
    setTargetQuizId(null);
  };

  const handleNavigateToQuiz = (pdfId?: string, quizId?: string) => {
    if (pdfId) setTargetPdfId(pdfId);
    if (quizId) setTargetQuizId(quizId);
    setCurrentView('quiz');
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white/80 backdrop-blur-md border-r border-gray-200 flex-shrink-0 sticky top-0 md:h-screen z-20">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">SmartQuiz AI</span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              菜单
            </div>
            
            {role === UserRole.ADMIN && (
              <button 
                onClick={() => setCurrentView('admin')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  currentView === 'admin' 
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                <span>后台管理</span>
              </button>
            )}

            <button 
              onClick={() => setCurrentView('quiz')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                currentView === 'quiz' 
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <span>资料库</span>
            </button>
          </div>

          <div className="mt-auto border-t border-gray-200 pt-6">
            <div className="flex items-center space-x-3 mb-4 px-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {role === UserRole.ADMIN ? 'Admin' : 'User'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{userPhone}</p>
                <p className="text-xs text-gray-500 truncate">{role === UserRole.ADMIN ? '超级管理员' : '普通学员'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {currentView === 'admin' ? '后台管理' : '学习资料库'}
            </h1>
            <p className="text-gray-500 mt-1">
              {currentView === 'admin' ? '管理用户权限与上传学习内容' : '选择一份资料开始您的练习'}
            </p>
          </div>
          <div className="text-sm font-medium text-gray-400 hidden md:block bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {currentView === 'admin' && role === UserRole.ADMIN ? (
          <AdminPanel onNavigateToQuiz={handleNavigateToQuiz} />
        ) : (
          <QuizArea 
            initialPdfId={targetPdfId} 
            initialQuizId={targetQuizId}
            onClearInitial={() => {
                setTargetPdfId(null);
                setTargetQuizId(null);
            }} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
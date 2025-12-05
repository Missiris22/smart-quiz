import React, { useState, useEffect } from 'react';
import { Quiz, Question, QuestionType } from '../types';
import { getQuizzes, getDocuments, getPdfFromStorage } from '../services/store';

interface QuizAreaProps {
  initialPdfId?: string | null;
  initialQuizId?: string | null;
  onClearInitial?: () => void;
}

const QuizArea: React.FC<QuizAreaProps> = ({ initialPdfId, initialQuizId, onClearInitial }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [showResults, setShowResults] = useState(false);
  
  // PDF Viewing State
  const [viewPdfId, setViewPdfId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    setQuizzes(getQuizzes());
  }, []);

  // Handle external navigation request to view PDF or Start Quiz
  useEffect(() => {
    // Priority 1: View PDF
    if (initialPdfId) {
      setViewPdfId(initialPdfId);
      setSelectedQuiz(null);
    } 
    // Priority 2: Start Quiz
    else if (initialQuizId) {
      const allQuizzes = getQuizzes();
      const quiz = allQuizzes.find(q => q.id === initialQuizId);
      if (quiz) {
         setSelectedQuiz(quiz);
         setCurrentQuestionIdx(0);
         setUserAnswers({});
         setShowResults(false);
         setViewPdfId(null);
      }
    }

    if ((initialPdfId || initialQuizId) && onClearInitial) {
       onClearInitial();
    }
  }, [initialPdfId, initialQuizId, onClearInitial]);

  // Effect to load PDF content when viewPdfId changes
  useEffect(() => {
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      if (!viewPdfId) {
        setPdfUrl(null);
        return;
      }
      setIsLoadingPdf(true);
      try {
        const rawContent = await getPdfFromStorage(viewPdfId);
        
        if (rawContent) {
            // Convert Base64 Data URI to Blob for better iframe performance with large files
            const parts = rawContent.split(',');
            const base64 = parts.length > 1 ? parts[1] : parts[0];
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';

            // Decode Base64
            const byteCharacters = atob(base64);
            const byteNumbers = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const blob = new Blob([byteNumbers], { type: mimeType });
            objectUrl = URL.createObjectURL(blob);
            setPdfUrl(objectUrl);
        } else {
            console.error("PDF content missing in storage for ID:", viewPdfId);
            setPdfUrl(null);
        }
      } catch (e) {
        console.error("Error loading PDF", e);
        alert("无法加载PDF文档，可能是存储空间不足或文件损坏。");
        setPdfUrl(null);
      } finally {
        setIsLoadingPdf(false);
      }
    };

    loadPdf();

    // Cleanup Blob URL when component unmounts or ID changes to prevent memory leaks
    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };
  }, [viewPdfId]);

  const handleStartQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIdx(0);
    setUserAnswers({});
    setShowResults(false);
    setViewPdfId(null);
  };

  const handleAnswerSelect = (questionId: string, optionId: string, type: QuestionType) => {
    setUserAnswers(prev => {
      const current = prev[questionId] || [];
      if (type === QuestionType.SINGLE) {
        return { ...prev, [questionId]: [optionId] };
      } else {
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter(id => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      }
    });
  };

  const calculateScore = () => {
    if (!selectedQuiz) return 0;
    let correctCount = 0;
    selectedQuiz.questions.forEach(q => {
      const answers = userAnswers[q.id] || [];
      if (answers.length === q.correctOptionIds.length && 
          answers.every(a => q.correctOptionIds.includes(a))) {
        correctCount++;
      }
    });
    return correctCount;
  };

  if (viewPdfId) {
     return (
       <div className="h-[80vh] flex flex-col">
         <div className="flex justify-between items-center mb-4">
            <button onClick={() => setViewPdfId(null)} className="text-blue-600 font-medium flex items-center hover:text-blue-800 transition-colors">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                返回资料库
            </button>
            {pdfUrl && (
                <a 
                    href={pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center shadow-sm"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    新窗口打开
                </a>
            )}
         </div>
         
         <div className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 relative">
           {isLoadingPdf && (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
               <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <div className="text-gray-500">正在加载文档...</div>
               </div>
             </div>
           )}
           {pdfUrl ? (
             <object 
                data={pdfUrl} 
                type="application/pdf" 
                className="w-full h-full"
             >
                <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-50 p-6 text-center">
                    <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p className="mb-4 text-lg font-medium text-gray-700">无法在当前窗口直接预览 PDF</p>
                    <p className="mb-6 text-sm">您的浏览器可能不支持直接嵌入 PDF，或者安全策略阻止了预览。</p>
                    <a 
                        href={pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
                    >
                        点击此处在新窗口打开 PDF
                    </a>
                </div>
             </object>
           ) : (
             !isLoadingPdf && (
               <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p>无法找到或加载该文档。</p>
               </div>
             )
           )}
         </div>
       </div>
     )
  }

  if (selectedQuiz) {
    const question = selectedQuiz.questions[currentQuestionIdx];
    const isLast = currentQuestionIdx === selectedQuiz.questions.length - 1;
    const score = calculateScore();

    if (showResults) {
      return (
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setSelectedQuiz(null)} className="mb-6 text-gray-500 hover:text-gray-900 flex items-center transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            返回资料库
          </button>
          
          <div className="bg-white rounded-3xl p-8 shadow-sm mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">练习完成!</h2>
            <div className="text-6xl font-bold text-blue-600 my-6">{Math.round((score / selectedQuiz.questions.length) * 100)}%</div>
            <p className="text-gray-500">共 {selectedQuiz.questions.length} 题，答对 {score} 题。</p>
          </div>

          <div className="space-y-6">
            {selectedQuiz.questions.map((q, idx) => {
              const userAns = userAnswers[q.id] || [];
              const isCorrect = userAns.length === q.correctOptionIds.length && userAns.every(a => q.correctOptionIds.includes(a));
              
              return (
                <div key={q.id} className={`p-6 rounded-2xl border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg">第 {idx + 1} 题. {q.text}</h3>
                    {isCorrect ? (
                      <span className="text-green-600 font-bold px-3 py-1 bg-green-100 rounded-full text-xs">回答正确</span>
                    ) : (
                      <span className="text-red-600 font-bold px-3 py-1 bg-red-100 rounded-full text-xs">回答错误</span>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {q.options.map(opt => {
                        const isSelected = userAns.includes(opt.id);
                        const isActuallyCorrect = q.correctOptionIds.includes(opt.id);
                        let optClass = "p-3 rounded-lg border text-sm ";
                        
                        if (isActuallyCorrect) optClass += "border-green-500 bg-green-100 text-green-900";
                        else if (isSelected && !isActuallyCorrect) optClass += "border-red-500 bg-red-100 text-red-900";
                        else optClass += "border-gray-200 bg-white opacity-60";

                        return <div key={opt.id} className={optClass}>{opt.text}</div>;
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-4 text-sm text-gray-600 italic bg-white/50 p-3 rounded-lg">
                      <strong>解析:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto pt-8">
        <div className="flex justify-between items-center mb-8">
            <button onClick={() => setSelectedQuiz(null)} className="text-gray-400 hover:text-gray-900 transition-colors">退出练习</button>
            <div className="text-sm font-medium text-gray-400">第 {currentQuestionIdx + 1} / {selectedQuiz.questions.length} 题</div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold tracking-wide uppercase mb-4">
                    {question.type === QuestionType.SINGLE ? '单选题' : '多选题'}
                </span>
                <h2 className="text-2xl font-bold text-gray-900 mb-8 leading-snug">{question.text}</h2>

                <div className="space-y-3">
                    {question.options.map(opt => {
                        const isSelected = (userAnswers[question.id] || []).includes(opt.id);
                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleAnswerSelect(question.id, opt.id, question.type)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                                    isSelected 
                                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-md' 
                                    : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                <div className="flex items-center">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                    </div>
                                    {opt.text}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="relative z-10 mt-8 flex justify-end">
                <button
                    onClick={() => {
                        if (isLast) setShowResults(true);
                        else setCurrentQuestionIdx(prev => prev + 1);
                    }}
                    className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-2xl hover:bg-black transition-colors shadow-lg"
                >
                    {isLast ? '查看结果' : '下一题'}
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">我的资料库</h2>
      
      {quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <p className="text-gray-400">暂无学习资料，请联系管理员上传。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                    {new Date(quiz.createdAt).toLocaleDateString('zh-CN')}
                  </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{quiz.title}</h3>
              <p className="text-sm text-gray-500 mb-6 flex-1">来源: {quiz.sourceFileName}</p>
              
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                    onClick={() => {
                        const doc = getDocuments().find(d => d.associatedQuizId === quiz.id);
                        if(doc) setViewPdfId(doc.id);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                    查看文档
                </button>
                <button 
                    onClick={() => handleStartQuiz(quiz)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-blue-200 shadow-lg"
                >
                    开始刷题
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizArea;
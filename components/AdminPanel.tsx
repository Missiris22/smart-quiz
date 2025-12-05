import React, { useState } from 'react';
import { User, UserRole, PDFDocument } from '../types';
import { addUser, addDocument, addQuiz, getUsers, getDocuments } from '../services/store';
import { generateQuizFromPDF } from '../services/geminiService';

interface AdminPanelProps {
  onNavigateToQuiz: (pdfId?: string, quizId?: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigateToQuiz }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'upload'>('upload');
  
  // User Form State
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserExpiry, setNewUserExpiry] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.USER);
  
  // Upload State
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [numQuestions, setNumQuestions] = useState(20); // Default to 20
  
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      addUser({
        phoneNumber: newUserPhone,
        role: newUserRole,
        name: newUserName,
        expiryDate: newUserRole === UserRole.USER ? newUserExpiry : undefined // Admins don't usually expire, but logic can vary
      });
      alert('用户添加成功');
      setNewUserPhone('');
      setNewUserName('');
      setNewUserExpiry('');
      setNewUserRole(UserRole.USER);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploadSuccess(false);
    setUploadStatus('');

    // 1. Validate File Type
    if (file.type !== 'application/pdf') {
      alert('请上传有效的PDF文件');
      e.target.value = ''; // Reset input
      return;
    }

    // 2. Validate File Size
    const MAX_SIZE_MB = 30;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`文件过大（当前 ${(file.size / (1024 * 1024)).toFixed(2)} MB）。由于AI接口限制，请上传小于 ${MAX_SIZE_MB}MB 的PDF文件。建议先压缩PDF后重试。`);
      e.target.value = ''; // Reset input
      return;
    }

    setIsProcessing(true);
    setUploadStatus('正在读取文件...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      
      try {
        // 1. Generate Quiz ID
        const quizId = `quiz-${Date.now()}`;
        
        // 2. Save Document (Async now due to IndexedDB)
        const docId = `doc-${Date.now()}`;
        const newDoc: PDFDocument = {
          id: docId,
          name: file.name,
          uploadDate: new Date().toISOString(),
          base64Data: base64Data,
          associatedQuizId: quizId
        };
        await addDocument(newDoc);

        // 3. Generate Questions via Gemini
        setUploadStatus(`AI正在深度分析文档内容并生成 ${numQuestions} 道试题... (请耐心等待)`);
        const questions = await generateQuizFromPDF(base64Data, numQuestions); 

        // 4. Save Quiz
        addQuiz({
          id: quizId,
          title: `${file.name} 专项练习`,
          sourceFileName: file.name,
          createdAt: new Date().toISOString(),
          questions: questions
        });

        setUploadStatus('成功！文档已解析，试题生成完毕。');
        setUploadSuccess(true);
      } catch (error: any) {
        console.error(error);
        const errorMsg = error.message || '处理文档时出错';
        setUploadStatus(`处理失败: ${errorMsg}`);
        setUploadSuccess(false);
        if (JSON.stringify(error).includes('exceeds supported limit')) {
           alert('文档通过API传输时超出了大小限制，请尝试压缩PDF。');
        }
      } finally {
        setIsProcessing(false);
        e.target.value = ''; // Reset input
      }
    };
    
    reader.onerror = () => {
        setUploadStatus('读取文件失败');
        setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const isExpired = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const documents = getDocuments();

  return (
    <div className="w-full">
      <div className="flex space-x-1 mb-8 bg-white/50 p-1 rounded-full w-fit border border-gray-200 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            activeTab === 'upload' 
              ? 'bg-white text-gray-900 shadow-md transform scale-105' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          资料处理
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            activeTab === 'users' 
              ? 'bg-white text-gray-900 shadow-md transform scale-105' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          用户管理
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-8 shadow-sm">
        {activeTab === 'upload' ? (
          <div className="space-y-8">
            <div className={`text-center border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ${isProcessing ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'}`}>
              <div className="flex flex-col items-center">
                {isProcessing ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-6"></div>
                ) : (
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                )}
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">上传学习资料</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  选择一个PDF文件 (最大 30MB)，AI将自动提取重点并生成配套的练习题。
                </p>

                <div className="flex flex-col items-center mb-8">
                   <span className="text-sm font-medium text-gray-700 mb-2">生成题目数量</span>
                   <div className="flex flex-wrap items-center justify-center gap-2">
                      {[20, 40, 60, 80, 100].map(num => (
                        <button
                          key={num}
                          onClick={() => setNumQuestions(num)}
                          disabled={isProcessing}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                            num === numQuestions 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          {num}题
                        </button>
                      ))}
                   </div>
                </div>
                
                <label className="relative cursor-pointer group">
                  <span className="px-8 py-3 bg-gray-900 text-white font-medium rounded-xl shadow-lg group-hover:bg-black group-hover:scale-105 transition-all duration-200 inline-block">
                    {isProcessing ? '处理中...' : '选择文件并生成'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Status Feedback Area */}
            {(uploadStatus || uploadSuccess) && (
              <div className={`p-6 rounded-2xl text-center border transition-all duration-500 transform translate-y-0 opacity-100 ${
                uploadSuccess ? 'bg-green-50 border-green-100' : 
                uploadStatus.includes('失败') ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
              }`}>
                <div className={`font-medium mb-2 ${
                  uploadSuccess ? 'text-green-800' : 
                  uploadStatus.includes('失败') ? 'text-red-800' : 'text-blue-800'
                }`}>
                  {uploadStatus}
                </div>
                
                {uploadSuccess && (
                  <div className="mt-4 animate-fade-in-up">
                    <button 
                      onClick={() => onNavigateToQuiz()}
                      className="inline-flex items-center px-6 py-2.5 bg-green-600 text-white font-medium rounded-xl shadow-md hover:bg-green-700 hover:shadow-lg transition-all duration-200"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      立即前往刷题
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 px-2">已上传文档 ({documents.length})</h3>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">文件名</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">上传时间</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                              {doc.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(doc.uploadDate).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => onNavigateToQuiz(doc.id, undefined)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors border border-blue-100"
                            >
                              预览PDF
                            </button>
                            <button
                               onClick={() => onNavigateToQuiz(undefined, doc.associatedQuizId)}
                               className="ml-3 text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg transition-colors border border-green-100"
                            >
                               开始刷题
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-gray-900">用户管理</h3>
               <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">共 {getUsers().length} 位用户</span>
            </div>
            
            <form onSubmit={handleAddUser} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-8">
              <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">添加新用户</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">用户姓名</label>
                  <input
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-shadow hover:shadow-sm"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="输入姓名"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">手机号码</label>
                  <input
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-shadow hover:shadow-sm"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="作为登录账号"
                    required
                  />
                </div>
                
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">角色权限</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm transition-shadow hover:shadow-sm cursor-pointer text-gray-900 pr-10"
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value as UserRole)}
                    >
                      <option value={UserRole.USER}>普通用户 (仅刷题)</option>
                      <option value={UserRole.ADMIN}>管理员 (可上传)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">账户有效期</label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-shadow hover:shadow-sm text-gray-900 font-medium ${newUserRole === UserRole.ADMIN ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                      value={newUserExpiry}
                      onChange={e => setNewUserExpiry(e.target.value)}
                      disabled={newUserRole === UserRole.ADMIN}
                      required={newUserRole === UserRole.USER}
                    />
                     {/* Overlay icon to make it clear this is a date picker */}
                    {newUserRole !== UserRole.ADMIN && (
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>
                  {newUserRole === UserRole.USER && !newUserExpiry && (
                      <div className="text-xs text-orange-500 mt-1 ml-1 font-medium">* 请点击选择到期时间</div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-black transition-all shadow-md active:scale-[0.99] flex justify-center items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                创建用户
              </button>
            </form>

            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">姓名 / 手机</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">角色权限</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">账户有效期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {getUsers().map((u, idx) => {
                    const expired = isExpired(u.expiryDate);
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{u.name || '未命名'}</span>
                            <span className="text-xs text-gray-500 font-mono mt-0.5">{u.phoneNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.role === UserRole.ADMIN ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              <svg className="mr-1.5 h-2 w-2 text-purple-400" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                              管理员
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <svg className="mr-1.5 h-2 w-2 text-blue-400" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                              普通用户
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {u.role === UserRole.ADMIN ? (
                            <span className="text-sm text-gray-400 font-medium">永久有效</span>
                          ) : (
                            <div className="flex items-center">
                              <span className={`text-sm font-medium ${expired ? 'text-red-600' : 'text-gray-700'}`}>
                                {u.expiryDate}
                              </span>
                              {expired && (
                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase rounded border border-red-200">
                                  已过期
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
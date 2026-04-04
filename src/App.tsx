/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Trophy, 
  UserPlus, 
  Upload, 
  Trash2, 
  Play, 
  Settings2, 
  LayoutGrid, 
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  UserCheck,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';

// --- Types ---
interface Participant {
  id: string;
  name: string;
}

interface DrawRecord {
  id: string;
  name: string;
  prize: string;
  timestamp: number;
}

type Tab = 'list' | 'draw' | 'group';

// --- Components ---
const SpinningName = ({ name }: { name: string }) => {
  return (
    <div className="h-[60px] flex items-center justify-center text-3xl font-bold text-slate-400">
      {name}
    </div>
  );
};

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [inputText, setInputText] = useState('');
  
  // Lucky Draw State
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [winnersList, setWinnersList] = useState<Participant[]>([]);
  const [drawHistory, setDrawHistory] = useState<DrawRecord[]>([]);
  const [spinningList, setSpinningList] = useState<Participant[]>([]);
  const [currentPrize, setCurrentPrize] = useState('特等獎');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [gridParticipants, setGridParticipants] = useState<Participant[]>([]);

  // Grouping State
  const [groupSize, setGroupSize] = useState(3);
  const [groups, setGroups] = useState<Participant[][]>([]);

  // Modal State
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // --- Helpers ---
  const getDuplicates = () => {
    const nameCounts: Record<string, number> = {};
    participants.forEach(p => {
      nameCounts[p.name] = (nameCounts[p.name] || 0) + 1;
    });
    return Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
  };

  const duplicates = getDuplicates();

  // --- Handlers ---

  const handleLoadMockData = () => {
    const mockNames = [
      '陳小明', '林美玲', '張嘉豪', '王淑芬', '李志強', 
      '吳欣怡', '劉俊宏', '蔡佩君', '楊雅婷', '許家豪',
      '鄭雅雯', '謝承翰', '郭怡君', '曾冠宇', '洪詩涵',
      '邱郁婷', '周建宏', '葉書豪', '江佩珊', '何俊傑'
    ];
    const newParticipants = mockNames.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name
    }));
    setParticipants(newParticipants);
  };

  const handleRemoveDuplicates = () => {
    const seen = new Set();
    const uniqueParticipants = participants.filter(p => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
    setParticipants(uniqueParticipants);
  };

  const handleDownloadGroupsCSV = () => {
    if (groups.length === 0) return;
    
    const csvRows = [
      ['組別', '姓名'],
      ...groups.flatMap((group, idx) => 
        group.map(p => [`第 ${idx + 1} 組`, p.name])
      )
    ];

    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `分組結果_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddNames = () => {
    const names = inputText
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
    
    const newParticipants = names.map(name => ({
      id: Math.random().toString(36).substr(2, 9),
      name
    }));

    setParticipants(prev => [...prev, ...newParticipants]);
    setInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const names: string[] = results.data
          .flat()
          .map((n: any) => String(n).trim())
          .filter(n => n.length > 0);
        
        const newParticipants = names.map(name => ({
          id: Math.random().toString(36).substr(2, 9),
          name
        }));
        setParticipants(prev => [...prev, ...newParticipants]);
      },
      header: false
    });
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const clearAll = () => {
    setParticipants([]);
    setWinnersList([]);
    setDrawHistory([]);
    setGroups([]);
    setShowClearConfirm(false);
  };

  // Lucky Draw Logic
  const startDraw = () => {
    if (participants.length === 0) return;
    
    const available = allowRepeat 
      ? participants 
      : participants.filter(p => !winnersList.some(w => w.id === p.id));

    if (available.length === 0) {
      alert('沒有可抽籤的人選了！');
      return;
    }

    setIsDrawing(true);
    setWinner(null);
    setActiveIndex(null);

    // Prepare a grid of 12-20 potential candidates for the animation
    const finalWinner = available[Math.floor(Math.random() * available.length)];
    let candidates = [...available].sort(() => Math.random() - 0.5);
    
    // Limit to max 20 for visual clarity in the grid
    if (candidates.length > 20) {
      candidates = candidates.slice(0, 19);
      if (!candidates.find(c => c.id === finalWinner.id)) {
        candidates[Math.floor(Math.random() * candidates.length)] = finalWinner;
      }
    }
    // Shuffle the display grid
    const displayGrid = [...candidates].sort(() => Math.random() - 0.5);
    setGridParticipants(displayGrid);

    // Animation variables
    let currentIdx = 0;
    let speed = 100;
    let iterations = 0;
    const totalIterations = 55 + Math.floor(Math.random() * 5);
    const winnerIdx = displayGrid.findIndex(c => c.id === finalWinner.id);

    const runAnimation = () => {
      setActiveIndex(currentIdx);
      currentIdx = (currentIdx + 1) % displayGrid.length;
      iterations++;

      if (iterations < totalIterations) {
        // Accelerate then decelerate
        if (iterations < totalIterations * 0.5) {
          speed = Math.max(35, speed * 0.92);
        } else {
          speed = speed * 1.06;
        }
        setTimeout(runAnimation, speed);
      } else {
        // Final slow down to find the winner
        const lastActiveIdx = (currentIdx - 1 + displayGrid.length) % displayGrid.length;
        const finalSteps = (winnerIdx - lastActiveIdx + displayGrid.length) % displayGrid.length;
        let step = 0;
        
        const finish = () => {
          if (step < finalSteps) {
            setActiveIndex(currentIdx);
            currentIdx = (currentIdx + 1) % displayGrid.length;
            step++;
            speed *= 1.15;
            setTimeout(finish, speed);
          } else {
            // Spotlight is now exactly on the winner
            // Wait for a dramatic pause before revealing the big result
            setTimeout(() => {
              setWinner(finalWinner);
              setIsDrawing(false);
              setActiveIndex(winnerIdx);
              
              if (!allowRepeat) {
                setWinnersList(prev => [...prev, finalWinner]);
              }
              
              const newRecord: DrawRecord = {
                id: Math.random().toString(36).substr(2, 9),
                name: finalWinner.name,
                prize: currentPrize || '未設定獎項',
                timestamp: Date.now()
              };
              setDrawHistory(prev => [newRecord, ...prev]);
              
              confetti({
                particleCount: 250,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#4F46E5', '#F59E0B', '#10B981', '#EF4444']
              });
            }, 800); // Dramatic pause on the winner
          }
        };
        finish();
      }
    };

    runAnimation();
  };

  // Grouping Logic
  const generateGroups = () => {
    if (participants.length === 0) return;
    
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const result: Participant[][] = [];
    
    for (let i = 0; i < shuffled.length; i += groupSize) {
      result.push(shuffled.slice(i, i + groupSize));
    }
    
    setGroups(result);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Users className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">HR 抽籤與分組工具</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              名單管理
            </button>
            <button 
              onClick={() => setActiveTab('draw')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'draw' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              獎品抽籤
            </button>
            <button 
              onClick={() => setActiveTab('group')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'group' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              自動分組
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Tab 1: List Management */}
          {activeTab === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" />
                    新增名單
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">貼上姓名 (以換行或逗號分隔)</label>
                      <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                        placeholder="例如：王小明, 李小華, 張大同..."
                      />
                    </div>
                    <button 
                      onClick={handleAddNames}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      加入名單
                    </button>

                    <button 
                      onClick={handleLoadMockData}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      載入模擬名單
                    </button>
                    
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">或</span></div>
                    </div>

                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">上傳 CSV 檔案</p>
                      </div>
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                  <h3 className="text-indigo-900 font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    使用小撇步
                  </h3>
                  <ul className="text-sm text-indigo-700 space-y-2 list-disc list-inside">
                    <li>您可以直接從 Excel 複製姓名欄位貼上。</li>
                    <li>CSV 檔案只需包含姓名，不需標題。</li>
                    <li>抽籤時可設定是否允許重複中獎。</li>
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      目前名單 ({participants.length})
                    </h2>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleRemoveDuplicates}
                        disabled={duplicates.length === 0}
                        className={`text-sm font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all ${
                          duplicates.length > 0 
                            ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' 
                            : 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                        移除重複 {duplicates.length > 0 && `(${duplicates.length})`}
                      </button>
                      
                      {participants.length > 0 && (
                        <button 
                          onClick={() => setShowClearConfirm(true)}
                          className="text-sm text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          全部清除
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    {participants.length === 0 ? (
                      <div className="py-20 text-center">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400">尚未加入任何名單</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {participants.map((p) => {
                          const isDuplicate = duplicates.includes(p.name);
                          return (
                            <div 
                              key={p.id}
                              className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isDuplicate 
                                  ? 'bg-amber-50 border-amber-200 hover:border-amber-300' 
                                  : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-sm font-medium text-slate-700 truncate">{p.name}</span>
                                {isDuplicate && (
                                  <span className="flex-shrink-0 bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold">重複</span>
                                )}
                              </div>
                              <button 
                                onClick={() => removeParticipant(p.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Lucky Draw */}
          {activeTab === 'draw' && (
            <motion.div 
              key="draw"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                    <h2 className="text-2xl font-bold mb-8 text-slate-800">幸運大抽籤</h2>
                    
                    <div className="min-h-[320px] flex items-center justify-center mb-8 bg-slate-900 rounded-3xl border-4 border-slate-800 relative overflow-hidden shadow-2xl">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                      
                      <AnimatePresence mode="wait">
                        {winner && !isDrawing ? (
                          <motion.div
                            key="winner-reveal"
                            initial={{ scale: 0.5, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            className="text-center z-20 p-8"
                          >
                            <motion.div
                              animate={{ 
                                rotate: [0, -5, 5, -5, 5, 0],
                                scale: [1, 1.05, 1]
                              }}
                              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                            >
                              <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4 filter drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                            </motion.div>
                            <p className="text-amber-400 font-black text-xl uppercase tracking-[0.3em] mb-2 drop-shadow-sm">{currentPrize || '恭喜中獎'}</p>
                            <h3 className="text-7xl font-black text-white tracking-tight drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{winner.name}</h3>
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1 }}
                              onClick={() => setWinner(null)}
                              className="mt-8 text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2 mx-auto transition-colors"
                            >
                              <RefreshCw className="w-4 h-4" /> 準備下一輪
                            </motion.button>
                          </motion.div>
                        ) : isDrawing ? (
                          <motion.div
                            key="grid-animation"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full h-full p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
                          >
                            {gridParticipants.map((p, i) => (
                              <motion.div
                                key={`${p.id}-${i}`}
                                animate={{ 
                                  scale: activeIndex === i ? 1.1 : 1,
                                  backgroundColor: activeIndex === i ? "#4f46e5" : "rgba(30, 41, 59, 0.5)",
                                  borderColor: activeIndex === i ? "#818cf8" : "rgba(51, 65, 85, 0.5)",
                                  boxShadow: activeIndex === i ? "0 0 20px rgba(79, 70, 229, 0.6)" : "none",
                                  zIndex: activeIndex === i ? 10 : 1
                                }}
                                className="aspect-video flex items-center justify-center rounded-xl border text-xs font-bold text-white transition-all duration-75 overflow-hidden px-1 text-center"
                              >
                                {p.name}
                              </motion.div>
                            ))}
                          </motion.div>
                        ) : (
                          <motion.div 
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center"
                          >
                            <div className="relative">
                              <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl"
                              ></motion.div>
                              <Trophy className="w-24 h-24 text-slate-700 relative z-10 mx-auto mb-4" />
                            </div>
                            <p className="text-slate-500 font-bold text-lg">準備好抽出幸運兒了嗎？</p>
                            <p className="text-slate-600 text-sm mt-1">目前名單共 {participants.length} 人</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <div className="flex-1 w-full sm:w-auto">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 text-left">當前獎項</label>
                          <input 
                            type="text"
                            value={currentPrize}
                            onChange={(e) => setCurrentPrize(e.target.value)}
                            placeholder="例如：特等獎、iPhone 15..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                          />
                        </div>
                        
                        <div className="flex items-center gap-3 bg-slate-100 px-4 py-2.5 rounded-xl h-[46px] mt-auto">
                          <span className="text-sm font-medium text-slate-600">重複中獎：</span>
                          <button 
                            onClick={() => setAllowRepeat(!allowRepeat)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${allowRepeat ? 'bg-indigo-600' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowRepeat ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                      
                      <button 
                        onClick={startDraw}
                        disabled={isDrawing || participants.length === 0}
                        className="w-full sm:w-auto mx-auto px-12 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 text-lg"
                      >
                        <Play className="w-6 h-6 fill-current" />
                        開始抽籤
                      </button>
                    </div>
                    
                    {participants.length === 0 && (
                      <p className="mt-4 text-sm text-rose-500 flex items-center justify-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        請先到「名單管理」加入人選
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-indigo-500" />
                      抽籤紀錄
                    </h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {drawHistory.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-10 italic">尚無抽籤紀錄</p>
                      ) : (
                        drawHistory.map((h, i) => (
                          <motion.div 
                            initial={{ x: 10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            key={`${h.id}-${i}`}
                            className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-slate-800">{h.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">#{drawHistory.length - i}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-indigo-600 font-medium">{h.prize}</span>
                              <span className="text-[10px] text-slate-400">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Auto Grouping */}
          {activeTab === 'group' && (
            <motion.div 
              key="group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <Settings2 className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold text-slate-800">分組設定</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-600">每組人數：</label>
                    <input 
                      type="number" 
                      min="1"
                      max={participants.length}
                      value={groupSize}
                      onChange={(e) => setGroupSize(parseInt(e.target.value) || 1)}
                      className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-indigo-600"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={generateGroups}
                    disabled={participants.length === 0}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-md shadow-indigo-100"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    重新隨機分組
                  </button>
                  
                  {groups.length > 0 && (
                    <button 
                      onClick={handleDownloadGroupsCSV}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-md shadow-emerald-100"
                    >
                      <Download className="w-4 h-4" />
                      下載 CSV
                    </button>
                  )}
                </div>
              </div>

              {groups.length === 0 ? (
                <div className="bg-white py-20 rounded-3xl border border-slate-200 text-center">
                  <LayoutGrid className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-400">設定人數並點擊「重新隨機分組」開始</p>
                  {participants.length === 0 && (
                    <p className="mt-2 text-sm text-rose-500">請先在「名單管理」中加入名單</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {groups.map((group, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                    >
                      <div className="bg-indigo-600 px-4 py-2 flex items-center justify-between">
                        <span className="text-white font-bold text-sm">第 {idx + 1} 組</span>
                        <span className="text-indigo-200 text-xs">{group.length} 人</span>
                      </div>
                      <div className="p-4 space-y-2">
                        {group.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            <span className="text-sm font-medium text-slate-700">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm flex items-center justify-center gap-1">
            Made for HR with <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
          </p>
        </div>
      </footer>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-slate-200"
            >
              <div className="bg-rose-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="text-rose-600 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">確定要清除所有名單？</h3>
              <p className="text-slate-500 mb-8">這將會清除目前所有的參加者名單、中獎紀錄以及分組結果，此動作無法復原。</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={clearAll}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-rose-100"
                >
                  確定清除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

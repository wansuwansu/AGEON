"use client";
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

// 완수님의 파이어베이스 설정값
const firebaseConfig = {
  apiKey: "AIzaSyBiKcMgEhRCYE4NpunNS3NaDF8XR67b5CY",
  authDomain: "ageon-db.firebaseapp.com",
  projectId: "ageon-db",
  storageBucket: "ageon-db.firebasestorage.app",
  messagingSenderId: "983844556665",
  appId: "1:983844556665:web:0f2ae7a096501be74269a8",
  measurementId: "G-DXR7Y6FYET"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);

  const statusConfig = {
    "검토 중": { percent: 10, color: "bg-slate-500", shadow: "shadow-slate-500/50" },
    "서류 준비": { percent: 30, color: "bg-cyan-400", shadow: "shadow-cyan-400/50" },
    "입점 심사 중": { percent: 50, color: "bg-purple-500", shadow: "shadow-purple-500/50" },
    "상품 등록 중": { percent: 80, color: "bg-pink-500", shadow: "shadow-pink-500/50" },
    "운영 중": { percent: 100, color: "bg-emerald-400", shadow: "shadow-emerald-400/50" },
  };

  const [platforms, setPlatforms] = useState([]);
  const [formData, setFormData] = useState({
    name: "", link: "", docLink: "", status: "검토 중", email: "", accountId: "", accountPw: "", manager: "", dueDate: "", memo: ""
  });

  const [resources, setResources] = useState([]);
  const [isResourceOpen, setIsResourceOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: "", url: "" });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  // 💥 제가 빼먹었던 바로 그 부품입니다! (입력창 작동 함수)
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    setIsClient(true);
    const unsubscribePlatforms = onSnapshot(collection(db, "platforms"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlatforms(data.sort((a, b) => b.createdAt - a.createdAt));
    });

    const unsubscribeResources = onSnapshot(collection(db, "resources"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResources(data.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => {
      unsubscribePlatforms();
      unsubscribeResources();
    };
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("플랫폼 이름은 필수입니다!");
    try {
      await addDoc(collection(db, "platforms"), { ...formData, createdAt: Date.now() });
      setFormData({ name: "", link: "", docLink: "", status: "검토 중", email: "", accountId: "", accountPw: "", manager: "", dueDate: "", memo: "" });
    } catch (error) {
      alert("데이터 저장 실패!");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("정말 삭제하시겠습니까? 복구할 수 없습니다.")) {
      await deleteDoc(doc(db, "platforms", id));
    }
  };

  const handleUpdateField = async (id, field, value) => {
    await updateDoc(doc(db, "platforms", id), { [field]: value });
  };

  const handleAddDateLog = (id, currentMemo) => {
    const today = new Date();
    const dateStr = `[${today.getFullYear().toString().slice(2)}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}] `;
    handleUpdateField(id, "memo", currentMemo ? `${currentMemo}\n${dateStr}` : dateStr);
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resourceForm.title || !resourceForm.url) return alert("자료명과 URL을 모두 입력해주세요!");
    await addDoc(collection(db, "resources"), { ...resourceForm, createdAt: Date.now() });
    setResourceForm({ title: "", url: "" });
  };

  const handleDeleteResource = async (id) => {
    await deleteDoc(doc(db, "resources", id));
  };

  const calculateDday = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return { text: `D-${diffDays}`, color: "text-cyan-400 bg-cyan-900/30 border-cyan-500/50" };
    if (diffDays === 0) return { text: "D-Day", color: "text-red-400 bg-red-900/30 border-red-500/50 animate-pulse" };
    return { text: `D+${Math.abs(diffDays)}`, color: "text-pink-500 bg-pink-900/30 border-pink-500/50" };
  };

  const kpi = {
    total: platforms.length,
    completed: platforms.filter(p => p.status === "운영 중").length,
    actionNeeded: platforms.filter(p => p.status === "검토 중" || p.status === "서류 준비").length,
    inProgress: platforms.filter(p => p.status === "입점 심사 중" || p.status === "상품 등록 중").length,
  };

  const filteredPlatforms = platforms.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.manager && p.manager.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === "All" || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-300 font-sans selection:bg-cyan-500/30 pb-20 relative">
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
              AGEON CONNECT <span className="text-sm text-cyan-500 ml-2 font-mono">PRO</span>
            </h1>
          </div>
          <button onClick={() => setIsResourceOpen(true)} className="bg-slate-800/80 hover:bg-slate-700 text-cyan-400 font-bold py-2.5 px-5 rounded-xl border border-cyan-900/50 hover:border-cyan-500/50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] flex items-center gap-2">
            📁 공용 자료실 열기
          </button>
        </header>

        {/* 상단 KPI 위젯 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-5 rounded-2xl shadow-lg">
            <h3 className="text-slate-500 text-xs font-bold tracking-widest mb-1">TOTAL PLATFORMS</h3>
            <p className="text-3xl font-black text-white">{kpi.total}<span className="text-sm font-normal text-slate-500 ml-1">개</span></p>
          </div>
          <div className="bg-emerald-900/20 backdrop-blur border border-emerald-900/50 p-5 rounded-2xl shadow-lg">
            <h3 className="text-emerald-500 text-xs font-bold tracking-widest mb-1">OPERATING</h3>
            <p className="text-3xl font-black text-emerald-400">{kpi.completed}<span className="text-sm font-normal text-emerald-700 ml-1">개</span></p>
          </div>
          <div className="bg-purple-900/20 backdrop-blur border border-purple-900/50 p-5 rounded-2xl shadow-lg">
            <h3 className="text-purple-500 text-xs font-bold tracking-widest mb-1">IN PROGRESS</h3>
            <p className="text-3xl font-black text-purple-400">{kpi.inProgress}<span className="text-sm font-normal text-purple-700 ml-1">개</span></p>
          </div>
          <div className="bg-pink-900/20 backdrop-blur border border-pink-900/50 p-5 rounded-2xl shadow-lg">
            <h3 className="text-pink-500 text-xs font-bold tracking-widest mb-1">ACTION NEEDED</h3>
            <p className="text-3xl font-black text-pink-400">{kpi.actionNeeded}<span className="text-sm font-normal text-pink-700 ml-1">개</span></p>
          </div>
        </div>

        {/* 검색 및 필터 바 */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="flex w-full md:w-auto gap-4 flex-grow">
            <input type="text" placeholder="🔍 플랫폼명 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-950 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none w-full md:w-80" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-950 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer">
              <option value="All">전체 상태</option>
              <option value="검토 중">검토 중</option>
              <option value="서류 준비">서류 준비</option>
              <option value="입점 심사 중">입점 심사 중</option>
              <option value="상품 등록 중">상품 등록 중</option>
              <option value="운영 중">운영 중</option>
            </select>
          </div>
        </div>

        {/* 리스트 영역 */}
        <div className="space-y-4 mb-10">
          {filteredPlatforms.length === 0 ? (
             <div className="text-center p-12 text-slate-500 border border-slate-800 rounded-2xl border-dashed bg-slate-900/30">등록된 플랫폼이 없습니다.</div>
          ) : (
            filteredPlatforms.map((p) => {
              const config = statusConfig[p.status] || statusConfig["검토 중"];
              const isExpanded = expandedId === p.id;
              const dDay = calculateDday(p.dueDate);

              return (
                <div key={p.id} className={`bg-slate-900/60 backdrop-blur-sm border transition-all duration-300 rounded-2xl overflow-hidden ${isExpanded ? 'border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.15)]' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'}`}>
                  
                  {/* 요약 바 */}
                  <div onClick={() => setExpandedId(isExpanded ? null : p.id)} className="p-5 flex items-center justify-between cursor-pointer select-none group relative gap-4">
                    <div className="flex-grow flex flex-col">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-lg font-black transition-colors ${isExpanded ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{p.name}</span>
                        {dDay && <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${dDay.color}`}>{dDay.text}</span>}
                      </div>
                      <span className="text-xs text-slate-500 mt-1">담당: <span className="text-slate-400">{p.manager || '미지정'}</span></span>
                    </div>
                    <div className="hidden sm:flex w-1/3 items-center">
                      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                        <div className={`h-full rounded-full transition-all duration-700 ${config.color} ${config.shadow} shadow-[0_0_10px_currentColor]`} style={{ width: `${config.percent}%` }}></div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold px-2 py-1.5 rounded-md bg-slate-950 border border-slate-800 whitespace-nowrap ${config.color.replace('bg-', 'text-')}`}>{p.status}</span>
                    </div>
                    <div className="w-6 flex justify-end shrink-0">
                      <div className={`text-lg transition-transform duration-300 ${isExpanded ? 'rotate-180 text-cyan-400' : 'text-slate-500'}`}>▼</div>
                    </div>
                  </div>

                  {/* 펼쳐진 상세 내용 */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/50 bg-slate-950/50 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fadeIn_0.3s_ease-in-out]">
                      <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">상태 변경</span>
                            <select value={p.status} onChange={(e) => handleUpdateField(p.id, "status", e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-sm text-cyan-300 px-2 py-1.5 rounded outline-none">
                              <option value="검토 중">검토 중</option>
                              <option value="서류 준비">서류 준비</option>
                              <option value="입점 심사 중">입점 심사 중</option>
                              <option value="상품 등록 중">상품 등록 중</option>
                              <option value="운영 중">운영 중</option>
                            </select>
                          </div>
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-500 font-bold block mb-1">마감 기한</span>
                            <input type="date" value={p.dueDate} onChange={(e) => handleUpdateField(p.id, "dueDate", e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-sm text-pink-300 px-2 py-1.5 rounded outline-none" style={{colorScheme: 'dark'}}/>
                          </div>
                        </div>

                        <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold w-16">관리자 🌐</span>
                            <input type="url" value={p.link} onChange={(e) => handleUpdateField(p.id, "link", e.target.value)} className="flex-grow bg-slate-950 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded outline-none"/>
                            {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="text-xs bg-blue-900/50 text-blue-400 px-2 py-1.5 rounded hover:bg-blue-800 transition whitespace-nowrap">이동</a>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold w-16">문서함 📁</span>
                            <input type="url" value={p.docLink} onChange={(e) => handleUpdateField(p.id, "docLink", e.target.value)} className="flex-grow bg-slate-950 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded outline-none"/>
                            {p.docLink && <a href={p.docLink} target="_blank" rel="noreferrer" className="text-xs bg-purple-900/50 text-purple-400 px-2 py-1.5 rounded hover:bg-purple-800 transition whitespace-nowrap">열기</a>}
                          </div>
                        </div>
                        
                        <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold w-10">Email</span>
                            <input type="email" value={p.email} onChange={(e) => handleUpdateField(p.id, "email", e.target.value)} className="flex-grow bg-slate-950 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded outline-none"/>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold w-10">ID/PW</span>
                            <input type="text" value={p.accountId} onChange={(e) => handleUpdateField(p.id, "accountId", e.target.value)} className="w-1/2 bg-slate-950 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded outline-none" placeholder="ID"/>
                            <input type="text" value={p.accountPw} onChange={(e) => handleUpdateField(p.id, "accountPw", e.target.value)} className="w-1/2 bg-slate-950 border border-slate-700 text-xs text-slate-300 px-2 py-1.5 rounded outline-none" placeholder="PW"/>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
                          <h3 className="text-xs font-bold text-slate-500 tracking-widest">TIMELINE LOG</h3>
                          <button onClick={() => handleAddDateLog(p.id, p.memo)} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 px-2 py-1 rounded transition-colors">+ 날짜 추가</button>
                        </div>
                        <textarea value={p.memo} onChange={(e) => handleUpdateField(p.id, "memo", e.target.value)} className="w-full flex-grow min-h-[150px] bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none font-mono leading-relaxed transition-all" placeholder="진행 상황 기록"/>
                        <div className="flex justify-end mt-4">
                           <button onClick={() => handleDelete(p.id)} className="text-xs font-bold text-red-500/70 hover:text-red-400 bg-slate-900 px-4 py-2 rounded-lg transition-colors border border-red-900/50 hover:border-red-500/50">🗑️ 삭제</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 신규 등록 폼 */}
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl shadow-xl">
           <h2 className="text-sm font-bold text-cyan-500 mb-4 tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500"></span> 빠른 등록
          </h2>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-center">
            <input type="text" name="name" placeholder="플랫폼명" value={formData.name} onChange={handleChange} className="flex-grow bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none text-sm min-w-[150px]" />
            <input type="text" name="manager" placeholder="담당자" value={formData.manager} onChange={handleChange} className="w-28 bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none text-sm" />
            <select name="status" value={formData.status} onChange={handleChange} className="w-36 bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-xl focus:ring-1 focus:ring-cyan-500 outline-none text-sm cursor-pointer">
              <option value="검토 중">검토 중</option>
              <option value="서류 준비">서류 준비</option>
              <option value="입점 심사 중">입점 심사 중</option>
            </select>
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-6 py-3 rounded-xl transition-all active:scale-95 text-sm whitespace-nowrap">+ 추가</button>
          </form>
        </div>
      </div>

      {/* 자료실 팝업 */}
      {isResourceOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h2 className="text-lg font-bold text-cyan-400">📁 공용 자료실</h2>
              <button onClick={() => setIsResourceOpen(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
                {resources.length === 0 && <p className="text-center text-slate-500 text-sm py-4">등록된 자료가 없습니다.</p>}
                {resources.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <div className="flex-grow truncate pr-4">
                      <p className="text-sm font-bold text-slate-200 truncate">{r.title}</p>
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">{r.url}</a>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={r.url} target="_blank" rel="noreferrer" className="bg-blue-900/50 hover:bg-blue-800 text-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold">열기</a>
                      <button onClick={() => handleDeleteResource(r.id)} className="bg-red-900/20 hover:bg-red-900/50 text-red-400 px-2 py-1.5 rounded-lg text-xs font-bold">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddResource} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex flex-col gap-2">
                  <input type="text" placeholder="자료명" value={resourceForm.title} onChange={(e) => setResourceForm({...resourceForm, title: e.target.value})} className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm outline-none"/>
                  <div className="flex gap-2">
                    <input type="url" placeholder="URL 링크" value={resourceForm.url} onChange={(e) => setResourceForm({...resourceForm, url: e.target.value})} className="flex-grow bg-slate-900 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm outline-none"/>
                    <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm">등록</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
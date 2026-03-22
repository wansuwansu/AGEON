"use client";
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

// 파이어베이스 설정값
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

  // 모던 엔터프라이즈를 위한 차분한 색상표
  const statusConfig = {
    "검토 중": { color: "text-zinc-500 bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
    "서류 준비": { color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50" },
    "입점 심사 중": { color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50" },
    "상품 등록 중": { color: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50" },
    "운영 중": { color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50" },
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
    if (!formData.name) return alert("플랫폼 이름은 필수입니다.");
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
    if (!resourceForm.title || !resourceForm.url) return alert("자료명과 URL을 모두 입력해주세요.");
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
    
    if (diffDays > 0) return { text: `D-${diffDays}`, color: "text-zinc-500 bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" };
    if (diffDays === 0) return { text: "D-Day", color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50" };
    return { text: `D+${Math.abs(diffDays)}`, color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50" };
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
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-200 pb-20">
      {/* 상단 네비게이션 바 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
            <span className="text-white dark:text-zinc-900 font-black text-lg leading-none">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AGEON CONNECT</h1>
            <p className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">Platform Management</p>
          </div>
        </div>
        <button onClick={() => setIsResourceOpen(true)} className="bg-white dark:bg-[#121212] hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold py-2 px-4 rounded-md border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-2 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
          공용 자료실
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-8 pt-8">
        {/* KPI 위젯 (SaaS 스타일) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
            <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-2">Total Platforms</h3>
            <p className="text-3xl font-bold">{kpi.total}</p>
          </div>
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
            <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-2">Operating</h3>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{kpi.completed}</p>
          </div>
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
            <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-2">In Progress</h3>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{kpi.inProgress}</p>
          </div>
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
            <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mb-2">Action Needed</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{kpi.actionNeeded}</p>
          </div>
        </div>

        {/* 컨트롤 바 */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex w-full md:w-auto gap-3 flex-grow">
            <div className="relative w-full md:w-80">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input type="text" placeholder="플랫폼 또는 담당자 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer transition-all">
              <option value="All">상태 전체보기</option>
              <option value="검토 중">검토 중</option>
              <option value="서류 준비">서류 준비</option>
              <option value="입점 심사 중">입점 심사 중</option>
              <option value="상품 등록 중">상품 등록 중</option>
              <option value="운영 중">운영 중</option>
            </select>
          </div>
        </div>

        {/* 메인 데이터 리스트 */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden mb-8">
          {/* 리스트 헤더 */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0F0F0F] text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="col-span-4">Platform Name</div>
            <div className="col-span-2">Manager</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2 text-right">D-Day</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filteredPlatforms.length === 0 ? (
               <div className="p-12 text-center text-sm text-zinc-500">조회된 플랫폼 데이터가 없습니다.</div>
            ) : (
              filteredPlatforms.map((p) => {
                const isExpanded = expandedId === p.id;
                const config = statusConfig[p.status] || statusConfig["검토 중"];
                const dDay = calculateDday(p.dueDate);

                return (
                  <div key={p.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-[#181818]">
                    {/* 행 요약 */}
                    <div onClick={() => setExpandedId(isExpanded ? null : p.id)} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center cursor-pointer">
                      <div className="col-span-4 flex items-center gap-3">
                        <span className="font-semibold text-sm">{p.name}</span>
                      </div>
                      <div className="col-span-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {p.manager || '-'}
                      </div>
                      <div className="col-span-3 flex items-center">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="col-span-2 md:text-right flex items-center md:justify-end">
                        {dDay ? <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${dDay.color}`}>{dDay.text}</span> : <span className="text-zinc-400 text-xs">-</span>}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>

                    {/* 확장 패널 */}
                    {isExpanded && (
                      <div className="p-6 bg-zinc-50/50 dark:bg-[#0D0D0D] border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 설정 영역 */}
                        <div className="space-y-4 lg:col-span-1">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">상태 변경</label>
                            <select value={p.status} onChange={(e) => handleUpdateField(p.id, "status", e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors">
                              <option value="검토 중">검토 중</option>
                              <option value="서류 준비">서류 준비</option>
                              <option value="입점 심사 중">입점 심사 중</option>
                              <option value="상품 등록 중">상품 등록 중</option>
                              <option value="운영 중">운영 중</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">마감 기한</label>
                            <input type="date" value={p.dueDate} onChange={(e) => handleUpdateField(p.id, "dueDate", e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-sm outline-none style={{colorScheme: 'dark'}}" />
                          </div>
                          {/* 💥 추가된 담당자 수정 영역 */}
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">담당자</label>
                            <input type="text" value={p.manager} onChange={(e) => handleUpdateField(p.id, "manager", e.target.value)} placeholder="담당자 이름" className="w-full px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500" />
                          </div>
                        </div>

                        {/* 링크 및 계정 정보 */}
                        <div className="space-y-4 lg:col-span-1">
                          <div className="bg-white dark:bg-[#121212] p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-zinc-500 mb-1">관리자 URL</label>
                              <div className="flex gap-2">
                                <input type="url" value={p.link} onChange={(e) => handleUpdateField(p.id, "link", e.target.value)} className="flex-grow px-2.5 py-1.5 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none" />
                                {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-xs font-medium hover:opacity-90 transition-opacity">이동</a>}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-zinc-500 mb-1">관련 문서 URL</label>
                              <div className="flex gap-2">
                                <input type="url" value={p.docLink} onChange={(e) => handleUpdateField(p.id, "docLink", e.target.value)} className="flex-grow px-2.5 py-1.5 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none" />
                                {p.docLink && <a href={p.docLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md text-xs font-medium hover:opacity-90 transition-opacity">열기</a>}
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-[#121212] p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-zinc-500 mb-1">계정 Email</label>
                              <input type="email" value={p.email} onChange={(e) => handleUpdateField(p.id, "email", e.target.value)} className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none" />
                            </div>
                            <div className="flex gap-2">
                              <div className="w-1/2">
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">ID</label>
                                <input type="text" value={p.accountId} onChange={(e) => handleUpdateField(p.id, "accountId", e.target.value)} className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none" />
                              </div>
                              <div className="w-1/2">
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Password</label>
                                <input type="text" value={p.accountPw} onChange={(e) => handleUpdateField(p.id, "accountPw", e.target.value)} className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md text-xs outline-none" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 타임라인 메모 */}
                        <div className="flex flex-col h-full lg:col-span-1">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-semibold text-zinc-500">작업 로그 & 메모</label>
                            <button onClick={() => handleAddDateLog(p.id, p.memo)} className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
                              + 오늘 날짜 추가
                            </button>
                          </div>
                          <textarea value={p.memo} onChange={(e) => handleUpdateField(p.id, "memo", e.target.value)} className="w-full flex-grow min-h-[150px] bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-700 rounded-md p-3 text-xs outline-none resize-none font-mono leading-relaxed focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors" placeholder="진행 상황을 기록하세요." />
                          <div className="flex justify-end mt-4">
                             <button onClick={() => handleDelete(p.id)} className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                               데이터 삭제
                             </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 빠른 등록 폼 */}
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm">
           <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            새 플랫폼 등록
          </h2>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-center">
            <input type="text" name="name" placeholder="플랫폼명 (예: 올리브영)" value={formData.name} onChange={handleChange} className="flex-grow min-w-[150px] px-4 py-2 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-md text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500" />
            <input type="text" name="manager" placeholder="담당자" value={formData.manager} onChange={handleChange} className="w-28 px-4 py-2 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-md text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500" />
            <select name="status" value={formData.status} onChange={handleChange} className="w-36 px-4 py-2 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-md text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500 cursor-pointer">
              <option value="검토 중">검토 중</option>
              <option value="서류 준비">서류 준비</option>
              <option value="입점 심사 중">입점 심사 중</option>
            </select>
            <button type="submit" className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold px-5 py-2 rounded-md text-sm hover:opacity-90 transition-opacity whitespace-nowrap">등록하기</button>
          </form>
        </div>
      </main>

      {/* 자료실 모달 */}
      {isResourceOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#0A0A0A]">
              <h2 className="text-sm font-bold">공용 자료실</h2>
              <button onClick={() => setIsResourceOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                {resources.length === 0 && <p className="text-center text-zinc-500 text-sm py-4">등록된 자료가 없습니다.</p>}
                {resources.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-[#181818] transition-colors">
                    <div className="flex-grow truncate pr-4">
                      <p className="text-sm font-semibold truncate mb-0.5">{r.title}</p>
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{r.url}</a>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={r.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">열기</a>
                      <button onClick={() => handleDeleteResource(r.id)} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddResource} className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col gap-3">
                  <input type="text" placeholder="자료명 (예: 브랜드 로고 원본)" value={resourceForm.title} onChange={(e) => setResourceForm({...resourceForm, title: e.target.value})} className="px-3 py-2 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-md text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500"/>
                  <div className="flex gap-2">
                    <input type="url" placeholder="URL 링크" value={resourceForm.url} onChange={(e) => setResourceForm({...resourceForm, url: e.target.value})} className="flex-grow px-3 py-2 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-md text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-500"/>
                    <button type="submit" className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90">추가</button>
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
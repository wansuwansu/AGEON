"use client";
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";

// 완수님의 파이어베이스 설정
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
  const [viewMode, setViewMode] = useState("list"); // list, compact, kanban

  const statuses = ["검토 중", "서류 준비", "입점 심사 중", "상품 등록 중", "운영 중"];
  const statusConfig = {
    "검토 중": { color: "text-zinc-600 bg-zinc-100 border-zinc-200" },
    "서류 준비": { color: "text-blue-600 bg-blue-50 border-blue-200" },
    "입점 심사 중": { color: "text-amber-600 bg-amber-50 border-amber-200" },
    "상품 등록 중": { color: "text-purple-600 bg-purple-50 border-purple-200" },
    "운영 중": { color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  };

  const [platforms, setPlatforms] = useState([]);
  const [formData, setFormData] = useState({
    name: "", link: "", docLink: "", status: "검토 중", email: "", accountId: "", accountPw: "", manager: "", dueDate: "", memo: "",
    type: "", commission: "", targetRevenue: "", promotion: "", mdContact: "" // 신규 필드 추가
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onSnapshot(collection(db, "platforms"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlatforms(data.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("플랫폼 이름은 필수입니다.");
    try {
      await addDoc(collection(db, "platforms"), { ...formData, createdAt: Date.now() });
      setFormData({ name: "", link: "", docLink: "", status: "검토 중", email: "", accountId: "", accountPw: "", manager: "", dueDate: "", memo: "", type: "", commission: "", targetRevenue: "", promotion: "", mdContact: "" });
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

  // 💥 엑셀 다운로드 기능
  const exportToCSV = () => {
    const headers = ["플랫폼명", "채널구분", "담당자", "상태", "마감기한", "수수료율", "목표매출", "프로모션", "MD연락처", "메모"];
    const rows = platforms.map(p => [
      p.name, p.type, p.manager, p.status, p.dueDate, p.commission, p.targetRevenue, p.promotion, p.mdContact, 
      (p.memo || "").replace(/\n/g, ' ') // 엑셀 줄바꿈 오류 방지
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `AGEON_Platforms_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // 💥 드래그 앤 드롭 (칸반 보드용)
  const handleDragStart = (e, id) => e.dataTransfer.setData("platformId", id);
  const handleDrop = (e, newStatus) => {
    const id = e.dataTransfer.getData("platformId");
    if (id) handleUpdateField(id, "status", newStatus);
  };

  const calculateDday = (dateString) => {
    if (!dateString) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString); targetDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    if (diff > 0) return { text: `D-${diff}`, color: "text-zinc-500 bg-zinc-100 border-zinc-200" };
    if (diff === 0) return { text: "D-Day", color: "text-red-600 bg-red-50 border-red-200" };
    return { text: `D+${Math.abs(diff)}`, color: "text-rose-600 bg-rose-50 border-rose-200" };
  };

  const filteredPlatforms = platforms.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.manager || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "All" || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-zinc-900 font-sans pb-20">
      {/* 슬림해진 상단 네비게이션 & 요약 바 */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-zinc-900 flex items-center justify-center"><span className="text-white font-black text-sm">A</span></div>
            <h1 className="text-lg font-bold tracking-tight">AGEON CONNECT</h1>
            
            {/* 슬림 KPI 요약 띠 */}
            <div className="hidden md:flex items-center ml-6 gap-4 text-xs font-semibold text-zinc-500 border-l border-zinc-200 pl-6">
              <span>Total: <b className="text-zinc-900">{platforms.length}</b></span>
              <span className="text-emerald-600">Operating: <b>{platforms.filter(p => p.status === "운영 중").length}</b></span>
              <span className="text-amber-600">In Progress: <b>{platforms.filter(p => p.status === "입점 심사 중").length}</b></span>
              <span className="text-blue-600">Action Needed: <b>{platforms.filter(p => p.status === "검토 중" || p.status === "서류 준비").length}</b></span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* 뷰 모드 토글 버튼 */}
            <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200">
              <button onClick={() => setViewMode("list")} className={`px-3 py-1 text-xs font-semibold rounded ${viewMode === "list" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}>기본 뷰</button>
              <button onClick={() => setViewMode("compact")} className={`px-3 py-1 text-xs font-semibold rounded ${viewMode === "compact" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}>콤팩트 뷰</button>
              <button onClick={() => setViewMode("kanban")} className={`px-3 py-1 text-xs font-semibold rounded ${viewMode === "kanban" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}>칸반 보드</button>
            </div>
            <button onClick={exportToCSV} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold py-1.5 px-3 rounded-md border border-emerald-200 transition-colors">
              엑셀 다운로드
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 pt-6">
        {/* 필터 및 검색 바 */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input type="text" placeholder="🔍 플랫폼명 또는 담당자 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-80 px-4 py-2 bg-white border border-zinc-200 text-sm rounded-lg outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-white border border-zinc-200 text-sm rounded-lg outline-none cursor-pointer">
            <option value="All">상태 전체보기</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* =========================================
            뷰 모드 1: 기본 리스트 뷰 (디테일 뷰)
        ========================================= */}
        {viewMode === "list" && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase">
              <div className="col-span-3">Platform Name</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Manager</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">D-Day</div>
            </div>
            <div className="divide-y divide-zinc-100">
              {filteredPlatforms.map((p) => {
                const isExpanded = expandedId === p.id;
                const config = statusConfig[p.status];
                const dDay = calculateDday(p.dueDate);

                return (
                  <div key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center cursor-pointer" onClick={(e) => { if(e.target.tagName !== 'INPUT') setExpandedId(isExpanded ? null : p.id) }}>
                      <div className="col-span-3">
                        {/* 💥 플랫폼 이름 직접 수정 가능 */}
                        <input type="text" value={p.name} onChange={(e) => handleUpdateField(p.id, "name", e.target.value)} className="font-bold text-sm bg-transparent outline-none w-full hover:bg-zinc-100 focus:bg-white focus:ring-2 focus:ring-blue-100 px-1 rounded transition-all" />
                      </div>
                      <div className="col-span-2 text-xs text-zinc-500">{p.type || '-'}</div>
                      <div className="col-span-2 text-sm text-zinc-700">{p.manager || '-'}</div>
                      <div className="col-span-2"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${config.color}`}>{p.status}</span></div>
                      <div className="col-span-2 md:text-right">{dDay ? <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${dDay.color}`}>{dDay.text}</span> : '-'}</div>
                      <div className="col-span-1 flex justify-end"><svg className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
                    </div>

                    {isExpanded && (
                      <div className="p-6 bg-zinc-50 border-t border-zinc-100 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 신규 카테고리 영업/마케팅 정보 */}
                        <div className="space-y-4 bg-white p-4 rounded-lg border border-zinc-200">
                          <h4 className="text-xs font-bold text-zinc-400 border-b pb-2 mb-3">비즈니스 정보</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-[10px] font-bold text-zinc-500 mb-1">채널 구분</label><input type="text" value={p.type} onChange={(e) => handleUpdateField(p.id, "type", e.target.value)} placeholder="예: 오픈마켓" className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" /></div>
                            <div><label className="block text-[10px] font-bold text-zinc-500 mb-1">수수료율/정산</label><input type="text" value={p.commission} onChange={(e) => handleUpdateField(p.id, "commission", e.target.value)} placeholder="예: 15% (익월 10일)" className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" /></div>
                            <div><label className="block text-[10px] font-bold text-zinc-500 mb-1">마감 기한</label><input type="date" value={p.dueDate} onChange={(e) => handleUpdateField(p.id, "dueDate", e.target.value)} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" /></div>
                            <div><label className="block text-[10px] font-bold text-zinc-500 mb-1">목표 매출액</label><input type="text" value={p.targetRevenue} onChange={(e) => handleUpdateField(p.id, "targetRevenue", e.target.value)} placeholder="예: 5,000만" className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" /></div>
                            <div className="col-span-2"><label className="block text-[10px] font-bold text-zinc-500 mb-1">현재 프로모션 구좌</label><input type="text" value={p.promotion} onChange={(e) => handleUpdateField(p.id, "promotion", e.target.value)} placeholder="예: 3월 봄맞이 기획전 참여중" className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" /></div>
                          </div>
                        </div>

                        {/* 링크 및 운영 정보 */}
                        <div className="space-y-4 bg-white p-4 rounded-lg border border-zinc-200">
                           <h4 className="text-xs font-bold text-zinc-400 border-b pb-2 mb-3">운영 및 연락처</h4>
                           <div className="space-y-3">
                             <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[10px] font-bold text-zinc-500 mb-1">상태</label><select value={p.status} onChange={(e) => handleUpdateField(p.id, "status", e.target.value)} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div><label className="block text-[10px] font-bold text-zinc-500 mb-1">사내 담당자</label><input type="text" value={p.manager} onChange={(e) => handleUpdateField(p.id, "manager", e.target.value)} className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" /></div>
                             </div>
                             <div><label className="block text-[10px] font-bold text-zinc-500 mb-1">채널 MD 연락처</label><input type="text" value={p.mdContact} onChange={(e) => handleUpdateField(p.id, "mdContact", e.target.value)} placeholder="이름 / 연락처 / 이메일" className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" /></div>
                             <div className="flex gap-2">
                               <input type="url" value={p.link} onChange={(e) => handleUpdateField(p.id, "link", e.target.value)} placeholder="어드민 URL" className="w-1/2 px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" />
                               <input type="url" value={p.docLink} onChange={(e) => handleUpdateField(p.id, "docLink", e.target.value)} placeholder="문서 URL" className="w-1/2 px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs outline-none focus:border-blue-400" />
                             </div>
                           </div>
                        </div>

                        {/* 타임라인 메모 */}
                        <div className="flex flex-col bg-white p-4 rounded-lg border border-zinc-200 h-full">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-zinc-400">타임라인 메모</h4>
                            <button onClick={() => handleAddDateLog(p.id, p.memo)} className="text-[10px] font-bold text-blue-600 hover:underline">+ 날짜입력</button>
                          </div>
                          <textarea value={p.memo} onChange={(e) => handleUpdateField(p.id, "memo", e.target.value)} className="w-full flex-grow bg-zinc-50 border border-zinc-200 rounded p-2 text-xs outline-none resize-none font-mono focus:border-blue-400" placeholder="히스토리를 남겨주세요." />
                          <button onClick={() => handleDelete(p.id)} className="mt-3 text-[10px] font-bold text-red-500 hover:underline text-right">데이터 삭제</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================
            뷰 모드 2: 콤팩트 뷰 (엑셀 스타일 표)
        ========================================= */}
        {viewMode === "compact" && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-x-auto mb-8">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-3 py-2 font-bold">플랫폼명</th>
                  <th className="px-3 py-2 font-bold">상태</th>
                  <th className="px-3 py-2 font-bold">담당자</th>
                  <th className="px-3 py-2 font-bold">마감기한</th>
                  <th className="px-3 py-2 font-bold">구분</th>
                  <th className="px-3 py-2 font-bold">수수료율</th>
                  <th className="px-3 py-2 font-bold">MD연락처</th>
                  <th className="px-3 py-2 font-bold">프로모션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredPlatforms.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-1.5 font-bold text-zinc-800">{p.name}</td>
                    <td className="px-3 py-1.5"><span className="text-[10px] px-1.5 py-0.5 border rounded bg-zinc-100">{p.status}</span></td>
                    <td className="px-3 py-1.5">{p.manager || '-'}</td>
                    <td className="px-3 py-1.5">{p.dueDate || '-'}</td>
                    <td className="px-3 py-1.5">{p.type || '-'}</td>
                    <td className="px-3 py-1.5">{p.commission || '-'}</td>
                    <td className="px-3 py-1.5">{p.mdContact || '-'}</td>
                    <td className="px-3 py-1.5 truncate max-w-[150px]">{p.promotion || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================
            뷰 모드 3: 칸반 보드 (드래그 앤 드롭)
        ========================================= */}
        {viewMode === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-8 items-start">
            {statuses.map(status => (
              <div key={status} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, status)} className="min-w-[280px] w-[280px] bg-zinc-100 rounded-lg p-3 border border-zinc-200 shadow-inner flex-shrink-0">
                <div className="flex justify-between items-center mb-3 px-1">
                  <h3 className="font-bold text-sm text-zinc-700">{status}</h3>
                  <span className="text-xs font-bold text-zinc-400 bg-zinc-200 px-2 rounded-full">{platforms.filter(p => p.status === status).length}</span>
                </div>
                <div className="space-y-3 min-h-[100px]">
                  {filteredPlatforms.filter(p => p.status === status).map(p => {
                    const dDay = calculateDday(p.dueDate);
                    return (
                      <div key={p.id} draggable onDragStart={(e) => handleDragStart(e, p.id)} className="bg-white p-3 rounded-md shadow-sm border border-zinc-200 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm">{p.name}</span>
                          {dDay && <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${dDay.color}`}>{dDay.text}</span>}
                        </div>
                        <div className="text-xs text-zinc-500 flex justify-between">
                          <span>👤 {p.manager || '미지정'}</span>
                          <span>{p.type || ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빠른 신규 등록 바 */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-bold text-zinc-400 uppercase mr-2">+ Quick Add</span>
            <input type="text" name="name" placeholder="플랫폼명 필수 입력" value={formData.name} onChange={handleChange} className="flex-grow px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-sm outline-none focus:border-blue-400" />
            <input type="text" name="type" placeholder="채널 구분 (예: 뷰티전문몰)" value={formData.type} onChange={handleChange} className="w-40 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-sm outline-none focus:border-blue-400" />
            <input type="text" name="manager" placeholder="담당자" value={formData.manager} onChange={handleChange} className="w-24 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-sm outline-none focus:border-blue-400" />
            <button type="submit" className="bg-zinc-900 text-white font-bold px-5 py-1.5 rounded text-sm hover:opacity-90 transition-opacity">등록</button>
          </form>
        </div>
      </main>
    </div>
  );
}
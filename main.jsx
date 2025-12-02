import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { 
  Play, Square, Upload, Type, Image as ImageIcon, Printer, X, Plus, Mic, FileAudio, 
  Trash2, ImagePlus, Settings, Check, GripHorizontal, Save, FileJson, FolderOpen, 
  RotateCcw, Download, Share2, Copy, QrCode, Link as LinkIcon, Loader2, Music
} from 'lucide-react';

// --- FIREBASE SETUP ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  // --- DEFAULT DATA ---
  const defaultTitle = { text: "Baby Mobile Crochet", style: { fontSize: 36, fontFamily: 'serif' } };
  const defaultTexts = [
    { id: 1, text: "Đây là mẫu Baby Mobile Crochet thủ công tinh xảo.", audioSrc: null, style: { fontSize: 18, fontFamily: 'serif' } },
    { id: 2, text: "Sản phẩm được làm từ chất liệu len cotton an toàn, mềm mại cho bé.", audioSrc: null, style: { fontSize: 18, fontFamily: 'serif' } },
    { id: 3, text: "Khung treo trung tâm bằng gỗ tự nhiên, kết nối với 4 thanh treo tạo sự cân bằng hoàn hảo.", audioSrc: null, style: { fontSize: 18, fontFamily: 'serif' } },
    { id: 4, text: "Các họa tiết được đan tỉ mỉ bằng chỉ trắng, tạo độ bay bổng nhẹ nhàng.", audioSrc: null, style: { fontSize: 18, fontFamily: 'serif' } }
  ];
  const defaultBg = "https://img.pikbest.com/backgrounds/20190424/chinese-style-festive-new-year-background-image_1837699.jpg!bw700";

  // --- STATE ---
  const [user, setUser] = useState(null);
  const [imageSrc, setImageSrc] = useState(null); 
  const [bgSrc, setBgSrc] = useState(defaultBg);
  const [bgMusicSrc, setBgMusicSrc] = useState(null); // Background Music State
  const [isBgMusicPlaying, setIsBgMusicPlaying] = useState(false);
  const [bgMusicVolume, setBgMusicVolume] = useState(0.2); // Default 20% volume

  const [imgScale, setImgScale] = useState(1);
  const [availableFonts, setAvailableFonts] = useState([
    { name: 'Mặc định (Serif)', value: 'serif' },
    { name: 'Không chân (Sans)', value: 'sans-serif' },
    { name: 'Viết tay (Cursive)', value: 'cursive' }
  ]);
  const [titleData, setTitleData] = useState(defaultTitle);
  const [texts, setTexts] = useState(defaultTexts);

  const [isEditing, setIsEditing] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null); 
  
  // Cloud Sharing State
  const [isSharing, setIsSharing] = useState(false); 
  const [isLoadingShared, setIsLoadingShared] = useState(false); 
  const [sharedUrl, setSharedUrl] = useState("");
  const [shareError, setShareError] = useState("");

  // Draggable Panel
  const [panelPos, setPanelPos] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Refs
  const imageInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const bgMusicInputRef = useRef(null); // Ref for BG Music
  const fontInputRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const bgMusicPlayerRef = useRef(new Audio()); // Ref for BG Music Player
  const [uploadingAudioForId, setUploadingAudioForId] = useState(null); 

  // --- MUSIC EFFECT ---
  useEffect(() => {
    bgMusicPlayerRef.current.loop = true;
    bgMusicPlayerRef.current.volume = bgMusicVolume;
  }, [bgMusicVolume]);

  useEffect(() => {
    if (bgMusicSrc) {
      bgMusicPlayerRef.current.src = bgMusicSrc;
      if (isBgMusicPlaying) {
        bgMusicPlayerRef.current.play().catch(e => console.log("Autoplay blocked", e));
      }
    } else {
      bgMusicPlayerRef.current.pause();
      bgMusicPlayerRef.current.src = "";
    }
  }, [bgMusicSrc]);

  useEffect(() => {
    if (bgMusicSrc) {
      if (isBgMusicPlaying) bgMusicPlayerRef.current.play().catch(e => console.log("Play error", e));
      else bgMusicPlayerRef.current.pause();
    }
  }, [isBgMusicPlaying, bgMusicSrc]);


  // --- 1. FIREBASE AUTH & LOAD SHARED DATA ---
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('shareId');
      
      if (currentUser && shareId) {
        setIsLoadingShared(true);
        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'designs', shareId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setImageSrc(data.imageSrc);
            setBgSrc(data.bgSrc);
            setImgScale(data.imgScale || 1);
            setTitleData(data.titleData);
            setTexts(data.texts);
            
            if (data.bgMusicSrc) {
              setBgMusicSrc(data.bgMusicSrc);
              setBgMusicVolume(data.bgMusicVolume || 0.2);
              // Don't auto-play on load to avoid browser blocking, user must click play
            }

            setIsEditing(false); 
            alert("Đã tải thành công phiên bản được chia sẻ!");
          } else {
            alert("Link không tồn tại hoặc đã bị xóa.");
          }
        } catch (error) {
          console.error("Error loading shared design:", error);
          alert("Lỗi khi tải dữ liệu.");
        } finally {
          setIsLoadingShared(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // --- 2. CLOUD SHARE HANDLER ---
  const handleCloudShare = async () => {
    if (!user) return alert("Đang kết nối server, vui lòng thử lại sau giây lát...");
    setIsSharing(true);
    setShareError("");
    setSharedUrl("");

    try {
      const payload = {
        imageSrc,
        bgSrc,
        bgMusicSrc,
        bgMusicVolume,
        imgScale,
        titleData,
        texts,
        createdAt: Date.now(),
        createdBy: user.uid
      };

      const jsonString = JSON.stringify(payload);
      const sizeInBytes = new Blob([jsonString]).size;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > 0.95) {
        throw new Error(`Dữ liệu quá lớn (~${sizeInMB.toFixed(2)}MB). Giới hạn là 1MB. Hãy dùng file nhạc/ảnh nhẹ hơn.`);
      }

      const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'designs');
      const docRef = await addDoc(collectionRef, payload);
      
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('shareId', docRef.id);
      setSharedUrl(currentUrl.toString());

    } catch (error) {
      console.error("Share error:", error);
      setShareError(error.message || "Lỗi khi tạo link chia sẻ.");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sharedUrl);
    alert("Đã sao chép link!");
  };

  // --- DRAG HANDLERS ---
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPanelPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  const startDrag = (e) => {
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - panelPos.x, y: e.clientY - panelPos.y };
  };

  // --- HELPERS & HANDLERS ---
  const getSelectedStyle = () => {
    if (selectedId === 'title') return titleData.style;
    const item = texts.find(t => t.id === selectedId);
    return item ? item.style : null;
  };
  const updateSelectedStyle = (newStyleProps) => {
    if (selectedId === 'title') setTitleData(prev => ({ ...prev, style: { ...prev.style, ...newStyleProps } }));
    else setTexts(prev => prev.map(t => t.id === selectedId ? { ...t, style: { ...t.style, ...newStyleProps } } : t));
  };
  const handleFontUpload = async (e) => {
    if(e.target.files[0]) {
      try {
        const buffer = await e.target.files[0].arrayBuffer();
        const fontName = `Font_${Date.now()}`;
        const font = new FontFace(fontName, buffer); await font.load(); document.fonts.add(font);
        setAvailableFonts(prev => [...prev, { name: e.target.files[0].name, value: fontName }]);
        if(selectedId !== null) updateSelectedStyle({ fontFamily: fontName });
      } catch(err) { alert("Lỗi font."); }
    }
  };
  const handleImageUpload = (e) => { if(e.target.files[0]) { const r = new FileReader(); r.onload = (ev) => setImageSrc(ev.target.result); r.readAsDataURL(e.target.files[0]); } };
  const handleBgUpload = (e) => { if(e.target.files[0]) { const r = new FileReader(); r.onload = (ev) => setBgSrc(ev.target.result); r.readAsDataURL(e.target.files[0]); } };
  
  // BG MUSIC HANDLER
  const handleBgMusicUpload = (e) => {
    if (e.target.files[0]) {
      const r = new FileReader();
      r.onload = (ev) => {
        setBgMusicSrc(ev.target.result);
        setIsBgMusicPlaying(true); // Auto play when uploaded
      };
      r.readAsDataURL(e.target.files[0]);
    }
  };
  const toggleBgMusic = () => {
    if (!bgMusicSrc) {
      bgMusicInputRef.current.click();
    } else {
      setIsBgMusicPlaying(!isBgMusicPlaying);
    }
  };

  const triggerAudioUpload = (id) => { 
    setUploadingAudioForId(id); 
    if (audioInputRef.current) { 
      audioInputRef.current.value = ""; 
      audioInputRef.current.click(); 
    } 
  };
  
  const handleAudioFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && uploadingAudioForId !== null) {
      const r = new FileReader(); 
      r.onload = (ev) => { 
        setTexts(texts.map(t => t.id === uploadingAudioForId ? { ...t, audioSrc: ev.target.result } : t)); 
        setUploadingAudioForId(null); 
      }; 
      r.readAsDataURL(file);
    }
  };
  
  const toggleAudio = (item) => {
    // If we play a paragraph audio, maybe we should lower bg music volume? 
    // For now simple logic.
    const player = audioPlayerRef.current;
    if (playingId === item.id) { player.pause(); player.currentTime = 0; setPlayingId(null); return; }
    if (item.audioSrc) { 
      player.src = item.audioSrc; 
      player.play()
        .catch(e => alert("Không thể phát file này."));
      setPlayingId(item.id); 
      player.onended = () => setPlayingId(null); 
    } else { alert("Chưa có file âm thanh."); }
  };

  const updateTextContent = (id, newContent) => setTexts(texts.map(t => t.id === id ? { ...t, text: newContent } : t));
  const addParagraph = () => {
    const lastStyle = texts.length > 0 ? texts[texts.length - 1].style : { fontSize: 18, fontFamily: 'serif' };
    setTexts([...texts, { id: Date.now(), text: "Nội dung mới...", audioSrc: null, style: { ...lastStyle } }]);
  };
  const removeParagraph = (id) => { setTexts(texts.filter(t => t.id !== id)); if (selectedId === id) setSelectedId(null); };
  
  // Create New / Reset
  const handleCreateNew = () => {
    if (!window.confirm("Tạo mới sẽ xóa trắng trang hiện tại. Tiếp tục?")) return;
    setImageSrc(null); setBgSrc(defaultBg); setImgScale(1); setTitleData(defaultTitle); setTexts(defaultTexts); setIsEditing(true); 
    setBgMusicSrc(null); setIsBgMusicPlaying(false);
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({path:newUrl},'',newUrl);
  };

  if (isLoadingShared) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 flex-col gap-4">
      <Loader2 className="animate-spin text-orange-500" size={48} />
      <p className="text-gray-600 font-medium">Đang tải bản thiết kế được chia sẻ...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center py-8 font-sans print:p-0 print:bg-white" onClick={() => setSelectedId(null)}>
      
      {/* Inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
      <input ref={audioInputRef} type="file" accept="audio/*,video/mp4,video/x-m4v,video/*,.m4a,.mp3,.wav,.aac,.ogg,.flac" className="hidden" onChange={handleAudioFileSelect} />
      <input ref={bgMusicInputRef} type="file" accept="audio/*,.mp3,.m4a" className="hidden" onChange={handleBgMusicUpload} />
      <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff" className="hidden" onChange={handleFontUpload} />

      {/* --- SHARE MODAL --- */}
      {showShareModal && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowShareModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <LinkIcon className="text-blue-600"/> Chia sẻ Phiên bản
              </h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
            </div>

            {!sharedUrl ? (
               <div className="flex flex-col gap-4">
                 <p className="text-gray-600 text-sm">Hệ thống sẽ lưu phiên bản hiện tại lên đám mây và tạo ra một đường link duy nhất.</p>
                 
                 {shareError && (
                   <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                     {shareError}
                   </div>
                 )}

                 <button 
                   onClick={handleCloudShare}
                   disabled={isSharing}
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                 >
                   {isSharing ? <Loader2 className="animate-spin"/> : <Share2 />}
                   {isSharing ? "Đang xử lý..." : "Tạo Link & QR Code"}
                 </button>
                 <p className="text-xs text-center text-gray-400 italic">Lưu ý: File Nhạc/Ảnh quá nặng (>1MB tổng cộng) sẽ gây lỗi. Hãy dùng file nhẹ.</p>
               </div>
            ) : (
              <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                  <Check size={16}/> Đã tạo link thành công!
                </div>

                <div className="bg-white p-2 rounded-xl border-4 border-gray-800 shadow-inner">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sharedUrl)}`} 
                    alt="QR Code" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
                
                <div className="w-full">
                  <label className="text-xs text-gray-500 mb-1 block">Đường dẫn chia sẻ:</label>
                  <div className="flex gap-2 bg-gray-100 p-2 rounded-lg items-center">
                    <input className="bg-transparent border-none text-sm flex-grow text-gray-600 focus:ring-0 truncate" readOnly value={sharedUrl} />
                    <button onClick={copyToClipboard} className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium border shadow-sm flex items-center gap-1 transition-colors">
                      <Copy size={14}/> Copy
                    </button>
                  </div>
                </div>

                <button 
                   onClick={() => { setSharedUrl(""); setShareError(""); }}
                   className="text-sm text-blue-500 hover:underline mt-2"
                 >
                   Tạo link khác
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SETTINGS PANEL --- */}
      {showSettings && (
        <div className="fixed z-[60] w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ left: panelPos.x, top: panelPos.y }} onClick={(e) => e.stopPropagation()}>
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between cursor-move select-none" onMouseDown={startDrag}>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700"><GripHorizontal size={16} className="text-gray-400"/> Tùy chỉnh</div>
            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500 p-1"><X size={14}/></button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
            
            {/* Global Music Settings */}
            <div className="mb-4 bg-purple-50 p-3 rounded-lg border border-purple-100">
               <label className="flex justify-between text-xs text-purple-800 font-medium mb-1">
                 <div className="flex items-center gap-1"><Music size={12}/> Nhạc nền (Volume)</div>
                 <span>{Math.round(bgMusicVolume * 100)}%</span>
               </label>
               <input 
                 type="range" min="0" max="1" step="0.05" 
                 value={bgMusicVolume} 
                 onChange={(e) => setBgMusicVolume(parseFloat(e.target.value))} 
                 className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600 mb-2"
               />
               {bgMusicSrc && (
                 <div className="flex justify-end">
                   <button onClick={() => { setBgMusicSrc(null); setIsBgMusicPlaying(false); }} className="text-xs text-red-500 hover:underline">Xóa nhạc nền</button>
                 </div>
               )}
            </div>

            <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100"><label className="flex justify-between text-xs text-blue-800 font-medium mb-1"><span>Ảnh Zoom</span><span>{Math.round(imgScale * 100)}%</span></label><input type="range" min="0.5" max="2.0" step="0.1" value={imgScale} onChange={(e) => setImgScale(parseFloat(e.target.value))} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/></div>
            
            {selectedId !== null ? (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Đoạn đang chọn</div>
                <div><label className="flex justify-between text-xs text-gray-600 mb-1"><span>Cỡ chữ</span><span>{getSelectedStyle().fontSize}px</span></label><input type="range" min="12" max="80" step="1" value={getSelectedStyle().fontSize} onChange={(e) => updateSelectedStyle({ fontSize: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"/></div>
                <div><div className="flex justify-between items-center mb-1"><label className="text-xs text-gray-600">Kiểu chữ</label><button onClick={() => fontInputRef.current.click()} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1"><Plus size={10}/> Tải thêm</button></div>
                  <div className="max-h-32 overflow-y-auto border rounded divide-y custom-scrollbar bg-gray-50/50">
                    {availableFonts.map((font, idx) => (<div key={idx} onClick={() => updateSelectedStyle({ fontFamily: font.value })} className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 flex justify-between items-center ${getSelectedStyle().fontFamily === font.value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700'}`} style={{ fontFamily: font.value }}><span className="truncate">{font.name}</span>{getSelectedStyle().fontFamily === font.value && <Check size={12}/>}</div>))}
                  </div>
                </div>
              </div>
            ) : (<div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed rounded-lg">Chọn đoạn văn để sửa.</div>)}
          </div>
        </div>
      )}

      {/* --- TOOLBAR --- */}
      <div className="fixed top-4 z-40 flex gap-3 bg-white/90 backdrop-blur shadow-xl p-3 rounded-2xl border border-gray-200 print:hidden transition-all hover:scale-105 items-center" onClick={(e) => e.stopPropagation()}>
        
        {/* Music Button */}
        <div className="flex flex-col items-center group cursor-pointer" onClick={toggleBgMusic}>
          <div className={`p-2 rounded-full transition-colors ${isBgMusicPlaying ? 'bg-purple-100 text-purple-600 animate-pulse' : bgMusicSrc ? 'bg-purple-50 text-purple-400' : 'bg-gray-50 text-gray-400 hover:bg-purple-50'}`}>
            <Music size={20} />
          </div>
          <span className="text-[10px] text-gray-500 font-medium mt-1">{!bgMusicSrc ? 'Thêm nhạc' : isBgMusicPlaying ? 'Đang phát' : 'Đã tắt'}</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>

        <div className="flex flex-col items-center group cursor-pointer" onClick={() => setShowShareModal(true)}>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><LinkIcon size={20} /></div>
          <span className="text-[10px] text-gray-500 font-medium mt-1">Chia sẻ</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex flex-col items-center group cursor-pointer" onClick={handleCreateNew}>
          <div className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100"><RotateCcw size={20} /></div>
          <span className="text-[10px] text-gray-500 font-medium mt-1">Làm mới</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex flex-col items-center group cursor-pointer" onClick={() => setShowSettings(!showSettings)}>
           <div className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-600 hover:bg-orange-50'}`}><Settings size={20} /></div>
          <span className="text-[10px] mt-1">Giao diện</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex flex-col items-center group cursor-pointer" onClick={() => bgInputRef.current.click()}>
          <div className="p-2 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100"><ImagePlus size={20} /></div>
          <span className="text-[10px] mt-1">Đổi nền</span>
        </div>
        <div className="flex flex-col items-center group cursor-pointer" onClick={() => imageInputRef.current.click()}>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"><ImageIcon size={20} /></div>
          <span className="text-[10px] mt-1">Ảnh SP</span>
        </div>
        <div className="flex flex-col items-center group cursor-pointer" onClick={() => setIsEditing(!isEditing)}>
          <div className={`p-2 rounded-full ${isEditing ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-50'}`}><Type size={20} /></div>
          <span className="text-[10px] mt-1">{isEditing ? 'Xong' : 'Sửa'}</span>
        </div>
        <div className="w-px h-8 bg-gray-200"></div>
        <div className="flex flex-col items-center group cursor-pointer" onClick={() => window.print()}>
          <div className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100"><Printer size={20} /></div>
          <span className="text-[10px] mt-1">In</span>
        </div>
      </div>

      {/* --- CANVAS --- */}
      <div className="relative shadow-2xl overflow-hidden bg-white transition-all print:shadow-none print:w-full print:h-full print:m-0"
        style={{ width: '297mm', height: '210mm', transform: 'scale(0.85)', transformOrigin: 'top center', backgroundImage: bgSrc ? `url(${bgSrc})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        onClick={() => setSelectedId(null)}
      >
        <div className="flex h-full w-full z-10 relative px-16 py-12"> 
          <div className="w-1/2 h-full flex items-center justify-center p-4 relative overflow-hidden">
            {imageSrc ? ( <img src={imageSrc} alt="Product" className="object-contain drop-shadow-2xl transition-transform duration-300" style={{ transform: `scale(${imgScale})`, maxHeight: '100%', maxWidth: '100%' }} /> ) : ( <div onClick={(e) => { e.stopPropagation(); imageInputRef.current.click() }} className="cursor-pointer text-gray-500 bg-white/50 border-2 border-dashed border-gray-400 rounded-2xl p-8 flex flex-col items-center backdrop-blur-sm"> <Upload className="mb-2 text-gray-400" /><span className="font-medium">Tải ảnh sản phẩm</span> </div> )}
          </div>
          <div className="w-1/2 h-full pl-8 pr-4 py-4 flex flex-col justify-center gap-5 overflow-y-auto custom-scrollbar">
            <div className={`relative group rounded-lg transition-all ${selectedId === 'title' ? 'ring-2 ring-orange-400 ring-offset-2 bg-white/40' : 'hover:bg-white/20'}`} onClick={(e) => { e.stopPropagation(); setSelectedId('title'); setShowSettings(true); }}>
               {isEditing ? ( <input className="w-full bg-transparent border-none focus:ring-0 p-0 font-bold text-red-800 placeholder-red-300/50" value={titleData.text} onChange={(e) => setTitleData({ ...titleData, text: e.target.value })} style={titleData.style} /> ) : ( <h1 className="font-bold text-red-800 m-0" style={titleData.style}>{titleData.text}</h1> )}
               <div className="h-1 w-24 bg-red-800 mt-1 rounded-full opacity-80"></div>
            </div>
            {texts.map((item) => (
              <div key={item.id} onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); setShowSettings(true); }} className={`group relative flex gap-3 items-start p-3 rounded-xl transition-all duration-200 backdrop-blur-sm cursor-pointer ${selectedId === item.id ? 'bg-orange-50/90 ring-2 ring-orange-400 ring-offset-1 shadow-md' : playingId === item.id ? 'bg-red-50/90 ring-1 ring-red-200' : 'hover:bg-white/60 bg-white/30 border border-transparent hover:border-white/50'}`}>
                <button onClick={(e) => { e.stopPropagation(); toggleAudio(item); }} disabled={!item.audioSrc} className={`mt-1 flex-shrink-0 flex items-center justify-center rounded-full transition-all shadow-sm ${playingId === item.id ? 'bg-red-600 text-white animate-pulse' : item.audioSrc ? 'bg-white text-red-600 hover:bg-red-50 border border-red-100' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`} style={{ width: item.style.fontSize * 1.5, height: item.style.fontSize * 1.5 }}>
                  {playingId === item.id ? <Square size={item.style.fontSize * 0.6} fill="currentColor" /> : <Play size={item.style.fontSize * 0.7} fill="currentColor" />}
                </button>
                <div className="flex-grow flex flex-col gap-1">
                  {isEditing ? ( <textarea value={item.text} onChange={(e) => updateTextContent(item.id, e.target.value)} className="w-full bg-transparent border-none p-0 focus:ring-0 resize-none text-gray-800" rows={Math.max(1, Math.ceil(item.text.length / 40))} style={item.style} /> ) : ( <p className="text-gray-800 drop-shadow-sm m-0" style={item.style}>{item.text}</p> )}
                  {isEditing && ( <div className={`flex items-center gap-2 mt-1 transition-opacity ${selectedId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}> <button onClick={(e) => { e.stopPropagation(); triggerAudioUpload(item.id) }} className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${item.audioSrc ? 'bg-green-100 text-green-700' : 'bg-white text-gray-500'}`}>{item.audioSrc ? <FileAudio size={10}/> : <Mic size={10}/>} {item.audioSrc ? 'Sửa Voice' : 'Thêm Voice'}</button> <div className="flex-grow"/> <button onClick={(e) => { e.stopPropagation(); removeParagraph(item.id) }} className="text-red-400 hover:bg-red-50 p-1 rounded"><Trash2 size={12}/></button> </div> )}
                </div>
              </div>
            ))}
            {isEditing && ( <button onClick={addParagraph} className="self-center mt-2 px-4 py-2 rounded-full border border-dashed border-red-300 text-red-400 bg-white/50 text-sm hover:bg-red-50"><Plus size={14} className="inline mr-1"/> Thêm đoạn</button> )}
          </div>
        </div>
      </div>
      <style jsx>{` .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #fca5a5; border-radius: 4px; } `}</style>
    </div>
  );
}

import { useState, ChangeEvent } from "react";
import { UserProfile } from "../types";
import { auth, isFirebaseConfigured } from "../firebase";
import { LogOut, Check, Sparkles, Database, ShieldCheck, HeartPulse, User, Upload } from "lucide-react";

interface ProfileViewProps {
  profile: UserProfile;
  totalTransactionsCount: number;
  totalGoalsCount: number;
  onUpdateProfile: (name: string, avatar: string) => void;
  onSignOut: () => void;
}

export default function ProfileView({
  profile,
  totalTransactionsCount,
  totalGoalsCount,
  onUpdateProfile,
  onSignOut,
}: ProfileViewProps) {
  const [name, setName] = useState(profile.displayName || "極簡旅客");
  const [selectedAvatar, setSelectedAvatar] = useState(profile.photoUrl || "");
  const [successMsg, setSuccessMsg] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const avatarsList = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop&q=80", // Female student
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&fit=crop&q=80", // Male casual
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&fit=crop&q=80", // Female hacker
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&fit=crop&q=80", // Male business
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&fit=crop&q=80", // Neutral portrait
  ];

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("請選擇有效的圖片檔案！");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to downscale custom uploaded photo to 150x150
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 150;
        canvas.width = size;
        canvas.height = size;

        if (ctx) {
          // Centered crop & draw
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          
          // Downscale & compress as jpeg
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          setSelectedAvatar(compressed);
        }
        setIsUploading(false);
      };
      img.onerror = () => {
        alert("載入圖片失敗！");
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      alert("讀取檔案失敗！");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = () => {
    if (!name.trim()) {
      alert("名稱不得為空！");
      return;
    }
    onUpdateProfile(name.trim(), selectedAvatar);
    setSuccessMsg("個人檔案已儲存修正！");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleSignOutClick = async () => {
    if (isFirebaseConfigured) {
      try {
        await auth.signOut();
      } catch (err) {
        console.error("Firebase Signout failing: ", err);
      }
    }
    onSignOut();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 text-black">
      
      {/* Profiler Card visual header */}
      <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] flex flex-col sm:flex-row items-center gap-5">
        <div className="w-20 h-20 border-2 border-black rounded-none overflow-hidden shrink-0 shadow-[2px_2px_0px_0px_#000000]">
          <img
            src={profile.photoUrl || selectedAvatar}
            alt="Profile Avatar"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none"
          />
        </div>
        
        <div className="space-y-1 text-center sm:text-left min-w-0 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl font-black text-black truncate">
              {profile.displayName || "極簡旅客"}
            </h2>
            <span className="text-[9px] font-mono bg-black text-[#22C55E] px-2 py-0.5 font-bold uppercase select-none rounded-none shrink-0 border border-black animate-pulse">
              PROFILER ACTIVE
            </span>
          </div>
          <p className="text-xs text-gray-550 truncate font-semibold font-mono">
            {profile.email || "SAVVY.LOCAL_ACCOUNT@SANDBOX"}
          </p>
          <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-3 text-[10px] text-gray-450 font-bold uppercase font-mono">
            <div>📊 記帳筆數: {totalTransactionsCount} 筆</div>
            <div>🎯 儲蓄目標: {totalGoalsCount} 項</div>
          </div>
        </div>
      </div>

      {/* Editing Area and configuration */}
      <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-black border-b-2 border-black pb-2">
          ⚙️ 偏好設定與修改
        </h3>

        {successMsg && (
          <div className="bg-green-50 border-2 border-[#22C55E] p-3 text-xs text-green-900 font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 shrink-0" />
            {successMsg}
          </div>
        )}

        <div className="space-y-4">
          
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-black block">
              使用者暱稱
            </label>
            <input
              type="text"
              maxLength={12}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-2 border-black rounded-none text-xs font-semibold focus:outline-none"
              placeholder="例如：Savvy 大學生"
            />
          </div>

          {/* Avatar selector choices */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-black block">
              更改頭像大貼片
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {avatarsList.map((ava, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedAvatar(ava)}
                  className={`bg-white border-2 p-0.5 rounded-none transition-all ${
                    selectedAvatar === ava
                      ? "border-black bg-[#22C55E] scale-102 shadow-[2px_2px_0px_0px_#000000]"
                      : "border-gray-200 hover:border-black"
                  }`}
                  title={`預設頭像 ${i + 1}`}
                >
                  <img
                    src={ava}
                    alt={`Avatar icon ${i}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-10 sm:h-12 object-cover"
                  />
                </button>
              ))}

              {/* Custom Image Upload Choice */}
              <div className="relative">
                <input
                  type="file"
                  id="custom-avatar-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {/* If selectedAvatar is custom (not in presets), show preview here */}
                {!avatarsList.includes(selectedAvatar) && selectedAvatar ? (
                  <button
                    type="button"
                    onClick={() => document.getElementById("custom-avatar-input")?.click()}
                    className="w-full h-full bg-white border-2 p-0.5 rounded-none transition-all flex flex-col items-center justify-center relative border-black bg-[#22C55E] scale-102 shadow-[2px_2px_0px_0px_#000000]"
                    title="自訂頭像（點擊可更換）"
                  >
                    <img
                      src={selectedAvatar}
                      alt="Custom avatar"
                      className="w-full h-10 sm:h-12 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-[8px] text-white font-black">更換</span>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => document.getElementById("custom-avatar-input")?.click()}
                    className="w-full h-[46px] sm:h-[54px] bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-400 hover:border-black rounded-none transition-all flex flex-col items-center justify-center text-gray-500 hover:text-black gap-0.5 cursor-pointer"
                    title="從相簿或下載區上傳自訂頭像"
                  >
                    {isUploading ? (
                      <span className="text-[9px] font-bold animate-pulse">讀取中</span>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[8px] font-black tracking-tight leading-none text-center">自訂上傳</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <button
            id="profile-update-btn"
            type="button"
            onClick={handleUpdate}
            className="px-4 py-2 bg-black text-white hover:bg-gray-850 border-2 border-black text-xs font-black rounded-none shadow-[2px_2px_0px_0px_#22C55E] cursor-pointer"
          >
            更新帳戶檔案
          </button>

        </div>
      </div>

      {/* Connection statistics module */}
      <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-3.5">
        <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-1.5 border-b border-black pb-2">
          <Database className="w-4 h-4 text-[#22C55E]" />
          雲端同步狀態
        </h3>

        {isFirebaseConfigured ? (
          <div className="text-xs space-y-2 font-medium">
            <p className="text-green-600 font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
              雲端整合連結：Firebase 正常同步中。
            </p>
            <p className="text-gray-550 leading-relaxed scale-98 shrink-0">
              您在此記帳助理上的每一筆交易、消費額度、與願景存款，皆受到最先進的安全規則驗證與加密，並且在不同裝置登入皆能即時重繪出最新明細！
            </p>
          </div>
        ) : (
          <div className="text-xs space-y-2 font-medium">
            <p className="text-amber-600 font-extrabold flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
              本機儲蓄沙盒模式 (本地離線)
            </p>
            <p className="text-gray-550 leading-relaxed">
              當前尚未啟用專案的 Firebase 授權憑證。所有的帳目和旅程目標皆安全的留存在您的瀏覽器快取 (Local Storage)。您可以放心測試各項核心 AI 能本，離線模式亦能提供完整 60FPS 理財。
            </p>
          </div>
        )}

        <div className="pt-3 border-t border-black/10 flex justify-end">
          <button
            id="signout-btn"
            type="button"
            onClick={handleSignOutClick}
            className="px-3 py-1.5 border-2 border-black bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 text-xs font-extrabold flex items-center gap-1.5 rounded-none shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            登出此理財帳本
          </button>
        </div>
      </div>

    </div>
  );
}

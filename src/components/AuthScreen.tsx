import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";
import { Wallet, Sparkles, ArrowRight, ShieldAlert, BadgeInfo } from "lucide-react";

interface AuthScreenProps {
  onLocalLogin: (displayName: string, photoUrl: string) => void;
}

export default function AuthScreen({ onLocalLogin }: AuthScreenProps) {
  const [displayName, setDisplayName] = useState("極簡旅人");
  const [selectedAvatar, setSelectedAvatar] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop&q=80"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop&q=80", // Student/Girl
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&fit=crop&q=80", // Casual guy
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&fit=crop&q=80", // Tech girl
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&fit=crop&q=80", // Entrepreneur
  ];

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Google 登入失敗，請稍後再試或使用沙盒環境進入。");
    } finally {
      setIsLoading(false);
    }
  };

  const startLocalMode = () => {
    onLocalLogin(displayName.trim() || "極簡生活者", selectedAvatar);
  };

  return (
    <div className="min-h-screen bg-[#F3FCEF] flex flex-col items-center justify-center p-4 selection:bg-[#22C55E]/30 text-black">
      <div className="w-full max-w-md bg-white border-4 border-black p-6 rounded-none shadow-[8px_8px_0px_0px_#000000] space-y-8">
        
        {/* Logo and Greeting */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#22C55E] border-2 border-black rounded-none shadow-[2px_2px_0px_0px_#000000] rotate-[-2deg]">
            <Wallet className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight font-sans pt-2">
            SAVVY
          </h1>
          <p className="text-sm font-semibold text-gray-700 bg-[#22C55E]/10 border border-[#22C55E]/30 py-1 px-3 inline-block rounded-none font-mono">
            新極簡主義 理財助理
          </p>
        </div>

        {/* Info or error alerts */}
        {errorMsg && (
          <div className="bg-red-50 border-2 border-red-500 p-3 rounded-none flex items-start gap-2 text-sm text-red-900 font-medium">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
            <div>{errorMsg}</div>
          </div>
        )}

        {isFirebaseConfigured ? (
          /* Google auth is active */
          <div className="space-y-4">
            <p className="text-center text-sm font-semibold text-gray-600">
              您的理財帳本受密碼保護，請透過驗證登入：
            </p>
            <button
              id="google-signin-btn"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-[#22C55E] hover:bg-[#1ebd56] active:bg-[#1a9f4a] border-2 border-black font-bold text-black flex items-center justify-center gap-3 transition-colors shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000]"
            >
              <Sparkles className="w-5 h-5 text-black animate-pulse" />
              {isLoading ? "驗證中..." : "使用 Google 帳號登入"}
            </button>
            <div className="text-center text-xs text-gray-500 font-mono">
              安全防護 ● 雲端即時同步
            </div>
          </div>
        ) : (
          /* Firebase configuration pending: Setup sandbox */
          <div className="space-y-5">
            <div className="bg-amber-50 border-2 border-amber-400 p-3 rounded-none flex items-start gap-2 text-xs text-amber-905">
              <BadgeInfo className="w-5 h-5 shrink-0 text-amber-500" />
              <div>
                <strong>Firebase 資料庫配置中</strong> <br />
                當前運作於極速客戶端沙盒。您填寫的資料會安全保存在本地瀏覽器！
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-black">
                  如何稱呼你？
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2.5 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_#000000] focus:outline-none focus:bg-[#22C55E]/5 text-sm font-medium"
                  placeholder="輸入你的使用者名稱"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-black block">
                  選擇生活頭像
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {avatars.map((ava, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAvatar(ava)}
                      className={`relative border-2 rounded-none p-0.5 transition-all ${
                        selectedAvatar === ava
                          ? "border-black bg-[#22C55E] scale-105 shadow-[2px_2px_0px_0px_#000000]"
                          : "border-gray-300 hover:border-black"
                      }`}
                    >
                      <img
                        src={ava}
                        alt={`Avatar ${i}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-11 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="sandbox-signin-btn"
                onClick={startLocalMode}
                className="w-full py-3 bg-[#22C55E] hover:bg-[#1ebd56] active:bg-[#1a9f4a] border-2 border-black font-extrabold text-black flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000] transition-all cursor-pointer text-sm"
              >
                開啟極簡帳本 (沙盒模式)
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        )}

        {/* Aesthetic decoration footer (Literal, human labels - Anti-cyber indicator rules) */}
        <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-mono">
          <div>SAVVY VERSION 1.1</div>
          <div>極簡主義生活提案</div>
        </div>

      </div>
    </div>
  );
}

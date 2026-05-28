import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import {
  listenTransactions,
  listenGoals,
  createTransaction,
  deleteTransaction,
  createGoal,
  updateGoalCurrent,
  deleteGoal,
  fetchUserProfile,
  saveUserProfile
} from "./firestoreService";
import { Transaction, Goal, UserProfile } from "./types";
import { motion, AnimatePresence } from "motion/react";

// Components
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import QuickEntry from "./components/QuickEntry";
import Goals from "./components/Goals";
import CalendarView from "./components/CalendarView";
import ProfileView from "./components/ProfileView";

// Icons
import {
  Wallet,
  LayoutDashboard,
  PlusCircle,
  Target,
  Calendar,
  User,
  LogOut,
  Sparkles,
  Loader2
} from "lucide-react";

type ActiveTab = "dashboard" | "quick-entry" | "goals" | "calendar" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Pre-filled date for retroactive backfilling
  const [prefilledDate, setPrefilledDate] = useState<string | null>(null);

  // 1. Firebase Auth listener (Only runs if Firebase is active)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Local Sandbox mode loader
      const localUserRaw = localStorage.getItem("savvy_local_user");
      if (localUserRaw) {
        try {
          const parsed = JSON.parse(localUserRaw);
          setUser({ uid: parsed.userId });
          setProfile(parsed);
        } catch {
          setUser(null);
        }
      }
      setIsAuthLoading(false);
      return;
    }

    const unbind = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Fetch or create profile
          let fetchedProfile = null;
          try {
            fetchedProfile = await fetchUserProfile(firebaseUser.uid);
          } catch (err) {
            console.error("fetchUserProfile failed:", err);
          }

          if (!fetchedProfile) {
            fetchedProfile = {
              userId: firebaseUser.uid,
              email: firebaseUser.email || "SAVVY.USER@CLOUDSYNC",
              displayName: firebaseUser.displayName || "極簡探險者",
              photoUrl: firebaseUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop&q=80",
            };
            try {
              await saveUserProfile(firebaseUser.uid, fetchedProfile);
            } catch (err) {
              console.error("saveUserProfile failed:", err);
            }
          }
          setProfile(fetchedProfile);
        } catch (error) {
          console.error("Profile fetching and recovery failed:", error);
          // Fallback so it doesn't freeze
          setProfile({
            userId: firebaseUser.uid,
            email: firebaseUser.email || "SAVVY.USER@CLOUDSYNC",
            displayName: firebaseUser.displayName || "極簡探險者",
            photoUrl: firebaseUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop&q=80",
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsAuthLoading(false);
    });

    return () => unbind();
  }, []);

  // 2. Real-time data sync listener effects
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setGoals([]);
      return;
    }

    // Bind real-time snapshot listeners for transactions and goals
    const unbindTx = listenTransactions(user.uid, (loadedTxs) => {
      setTransactions(loadedTxs);
    });

    const unbindGoals = listenGoals(user.uid, (loadedGoals) => {
      setGoals(loadedGoals);
    });

    return () => {
      unbindTx();
      unbindGoals();
    };
  }, [user]);

  // Handle local sandbox login
  const handleLocalLogin = (displayName: string, photoUrl: string) => {
    const sandboxProfile: UserProfile = {
      userId: "sandbox_local",
      email: "savvy.local.user@sandbox.io",
      displayName,
      photoUrl,
    };
    localStorage.setItem("savvy_local_user", JSON.stringify(sandboxProfile));
    setUser({ uid: "sandbox_local" });
    setProfile(sandboxProfile);
  };

  // Sign out engine
  const handleSignOut = async () => {
    localStorage.removeItem("savvy_local_user");
    if (isFirebaseConfigured && auth) {
      try {
        await auth.signOut();
      } catch (err) {
        console.error("Firebase SignOut failed:", err);
      }
    }
    setUser(null);
    setProfile(null);
    setActiveTab("dashboard");
  };

  // Profile preferences updater
  const handleUpdateProfile = async (displayName: string, photoUrl: string) => {
    if (!user || !profile) return;
    const updated = { ...profile, displayName, photoUrl };
    setProfile(updated);
    await saveUserProfile(user.uid, updated);
  };

  // Core transaction creations (adds uid + standard structured format)
  const handleSaveTransaction = async (txData: {
    amount: number;
    category: "飲食" | "交通" | "娛樂" | "購物" | "帳單" | "其他";
    type: "expense" | "income";
    note: string;
    date: string;
  }) => {
    if (!user) return;
    const newTx: Transaction = {
      id: "tx_" + Date.now().toString() + Math.random().toString(36).substr(2, 5),
      userId: user.uid,
      amount: txData.amount,
      category: txData.category,
      type: txData.type,
      date: txData.date,
      note: txData.note,
      createdAt: new Date().toISOString(),
    };

    await createTransaction(user.uid, newTx);
    // Switch cleanly to dashboard to admire balance stats
    setActiveTab("dashboard");
    setPrefilledDate(null); // clear backfill dates
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!user) return;
    if (confirm("確認要刪除這筆記帳紀錄嗎？")) {
      await deleteTransaction(user.uid, txId);
    }
  };

  // Saving goals handlers
  const handleAddGoal = async (gData: {
    title: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
  }) => {
    if (!user) return;
    const newGoal: Goal = {
      id: "goal_" + Date.now().toString(),
      userId: user.uid,
      title: gData.title,
      targetAmount: gData.targetAmount,
      currentAmount: gData.currentAmount,
      targetDate: gData.targetDate,
      predictedDate: "",
      aiAdvice: "",
      createdAt: new Date().toISOString(),
    };
    await createGoal(user.uid, newGoal);
  };

  const handleUpdateGoalProgress = async (goalId: string, currentAmount: number, predictedDate?: string, aiAdvice?: string) => {
    if (!user) return;
    await updateGoalCurrent(user.uid, goalId, currentAmount, predictedDate, aiAdvice);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!user) return;
    if (confirm("確認要永久移除這個儲蓄願景嗎？")) {
      await deleteGoal(user.uid, goalId);
    }
  };

  // Launch pre-filled date for retroactive backfilling
  const handleDateBackfillLaunch = (dateStr: string) => {
    setPrefilledDate(dateStr);
    setActiveTab("quick-entry");
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F3FCEF] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-[#22C55E] animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-700 font-mono animate-pulse">
            SAVVY 理財助理加載安全連結中...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in -> Render Entrance Deck
  if (!user || !profile) {
    return <AuthScreen onLocalLogin={handleLocalLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F3FCEF] flex flex-col selection:bg-[#22C55E]/30 text-black">
      
      {/* 1. TOP ACCENT HEADER SECTION (Swiss/Modernist style) */}
      <header className="sticky top-0 z-40 bg-white border-b-4 border-black px-4 py-3 shadow-[0px_2px_0px_0px_#000000] select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-[#22C55E] border-2 border-black rounded-none shadow-[1.5px_1.5px_0px_0px_#000000]">
              <Wallet className="w-4.5 h-4.5 text-black" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight font-sans">
                SAVVY
              </span>
              <span className="hidden sm:inline-block text-[9px] font-bold text-gray-500 uppercase font-mono ml-2 border-l border-gray-300 pl-2">
                理財生活提案
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-1 select-none">
              <span className="hidden sm:block text-xs font-black text-black">
                嗨，{profile.displayName || "極簡 यात्री"}！
              </span>
              <div className="w-8 h-8 border-2 border-black rounded-none overflow-hidden bg-[#22C55E]/10 shadow-[1px_1px_0px_0px_#000000]">
                <img
                  src={profile.photoUrl}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <button
              id="top-logout-btn"
              onClick={handleSignOut}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 border border-transparent hover:border-red-100 rounded-none transition-all cursor-pointer"
              title="登出此帳簿"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>

        </div>
      </header>

      {/* 2. DYNAMIC LAYOUT: Sidebar Tabs for desktops, Bottom tabs for mobiles */}
      <div className="max-w-6xl w-full mx-auto p-4 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* DESKTOP SIDEBAR RAIL */}
        <aside className="hidden md:block w-52 shrink-0 select-none">
          <nav className="space-y-3 sticky top-20">
            {[
              { id: "dashboard", label: "即時主控台", icon: LayoutDashboard },
              { id: "quick-entry", label: "極速記一筆", icon: PlusCircle },
              { id: "goals", label: "儲蓄夢想願景", icon: Target },
              { id: "calendar", label: "收支熱點日曆", icon: Calendar },
              { id: "profile", label: "生活設定偏好", icon: User },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`sidebar-tab-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as ActiveTab);
                    if (tab.id !== "quick-entry") setPrefilledDate(null);
                  }}
                  className={`w-full py-2.5 px-3 border-2 border-black rounded-none font-black text-xs text-left cursor-pointer transition-all flex items-center justify-between shadow-none ${
                    isActive
                      ? "bg-[#22C55E] shadow-[3px_3px_0px_0px_#000000]"
                      : "bg-white hover:bg-gray-100/50 hover:shadow-[1.5px_1.5px_0px_0px_#000000]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconComp className="w-4 h-4 text-black shrink-0" />
                    {tab.label}
                  </span>
                  {isActive && <Sparkles className="w-3 h-3 text-black animate-pulse" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* CORE WORKSPACE CANVAS PANEL */}
        <main className="flex-1 min-w-0 pb-16 md:pb-4 justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "dashboard" && (
                <Dashboard
                  transactions={transactions}
                  onAddClick={() => setActiveTab("quick-entry")}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              )}

              {activeTab === "quick-entry" && (
                <QuickEntry
                  onSave={handleSaveTransaction}
                  // Inject prefilled date if backfilled
                  key={prefilledDate ? prefilledDate : "standard-entry"}
                />
              )}

              {activeTab === "goals" && (
                <Goals
                  goals={goals}
                  transactions={transactions}
                  onAddGoal={handleAddGoal}
                  onUpdateGoalProgress={handleUpdateGoalProgress}
                  onDeleteGoal={handleDeleteGoal}
                />
              )}

              {activeTab === "calendar" && (
                <CalendarView
                  transactions={transactions}
                  onAddTransactionForDate={handleDateBackfillLaunch}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              )}

              {activeTab === "profile" && (
                <ProfileView
                  profile={profile}
                  totalTransactionsCount={transactions.length}
                  totalGoalsCount={goals.length}
                  onUpdateProfile={handleUpdateProfile}
                  onSignOut={handleSignOut}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* 3. MOBILE RESPONSIVE BOTTOM NAVIGATION TRAY */}
      <footer className="footer-bar md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-40 select-none py-1.5 px-3 shadow-[0px_-2px_6px_rgba(0,0,0,0.06)]">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "主頁" },
            { id: "quick-entry", icon: PlusCircle, label: "記帳" },
            { id: "goals", icon: Target, label: "願景" },
            { id: "calendar", icon: Calendar, label: "歷史" },
            { id: "profile", icon: User, label: "設定" }, // Use standard User icon
          ].map((item) => {
            const IconComp = item.id === "profile" ? User : item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`footer-tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id as ActiveTab);
                  if (item.id !== "quick-entry") setPrefilledDate(null);
                }}
                className={`py-1.5 px-3 flex flex-col items-center justify-center transition-all cursor-pointer rounded-none border-2 ${
                  isActive
                    ? "bg-[#22C55E] border-black text-black font-extrabold shadow-[1px_1.5px_0px_0px_#000000]"
                    : "border-transparent text-gray-500 hover:text-black"
                }`}
              >
                <IconComp className="w-5 h-5 text-black shrink-0" />
                <span className="text-[9px] font-black pt-0.5 tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </footer>

    </div>
  );
}

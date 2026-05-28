import { useState, FormEvent } from "react";
import { Goal, Transaction } from "../types";
import { Plus, PiggyBank, Sparkles, Trash2, Calendar, TrendingUp, RefreshCw, BadgePercent } from "lucide-react";

interface GoalsProps {
  goals: Goal[];
  transactions: Transaction[];
  onAddGoal: (goal: { title: string; targetAmount: number; currentAmount: number; targetDate: string }) => void;
  onUpdateGoalProgress: (goalId: string, currentAmount: number, predictedDate?: string, aiAdvice?: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export default function Goals({ goals, transactions, onAddGoal, onUpdateGoalProgress, onDeleteGoal }: GoalsProps) {
  // Add Goal Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  // AI Insights loading indicator
  const [analyzingGoalId, setAnalyzingGoalId] = useState<string | null>(null);

  // Quick Deposit amounts
  const [depositAmountInputs, setDepositAmountInputs] = useState<Record<string, string>>({});

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const targetNum = Number(targetAmount);
    const currentNum = Number(currentAmount) || 0;

    if (!title.trim() || !targetNum || targetNum <= 0) {
      alert("請輸入有效的目標名稱與金額！");
      return;
    }

    onAddGoal({
      title: title.trim(),
      targetAmount: targetNum,
      currentAmount: currentNum,
      targetDate: targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // default 90 days out
    });

    // Reset Form
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate("");
    setShowAddForm(false);
  };

  const handleQuickDeposit = (goal: Goal, customValue?: number) => {
    const inputVal = depositAmountInputs[goal.id];
    const depAmt = customValue || Number(inputVal);

    if (isNaN(depAmt) || depAmt <= 0) {
      alert("請輸入有效的存款數字！");
      return;
    }

    const updatedTotal = Math.min(goal.targetAmount, goal.currentAmount + depAmt);
    onUpdateGoalProgress(goal.id, updatedTotal);

    // Clear Quick Input
    setDepositAmountInputs((prev) => ({ ...prev, [goal.id]: "" }));
  };

  // Trigger Gemini API for smart forecast & savings advice on specific target card
  const handleAiAnalyze = async (goal: Goal) => {
    setAnalyzingGoalId(goal.id);
    try {
      // Analyze current spending versus goals
      const res = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: transactions,
          goals: [goal],
        }),
      });
      const data = await res.json();
      if (data.success && data.insights) {
        const insights = data.insights;
        // Save the AI forecast inside the goal details
        onUpdateGoalProgress(
          goal.id,
          goal.currentAmount,
          insights.prediction,
          insights.insights
        );
      } else {
        alert("分析伺服器忙碌中，請稍候重試。");
      }
    } catch (err) {
      console.error(err);
      alert("AI 分析連接異常，請檢查網路。");
    } finally {
      setAnalyzingGoalId(null);
    }
  };

  return (
    <div className="space-y-6 text-black">
      
      {/* Tab and additions bar */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <h2 className="text-md font-black uppercase tracking-wider text-black flex items-center gap-2">
          🎯 具象化儲蓄目標 ({goals.length})
        </h2>
        <button
          id="show-add-goal-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-2.5 py-1.5 bg-[#22C55E] hover:bg-[#1ebd56] active:bg-[#1a9f4a] border-2 border-black text-xs font-black flex items-center gap-1 transition-all shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-black" />
          新增理財願景
        </button>
      </div>

      {/* Goal Add Form Collapsible (Neo-Minimalist styled dropdown) */}
      {showAddForm && (
        <form
          id="add-goal-form"
          onSubmit={handleCreate}
          className="bg-white border-4 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black block">
                ⭐ 目標主題
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：日本旅遊、買新款 iPhone 17"
                className="w-full p-2 border-2 border-black text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black block">
                🗓️ 預定達成日期
              </label>
              <input
                type="date"
                required
                value={targetDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full p-2 border-2 border-black text-xs font-mono font-bold focus:outline-none focus:bg-gray-50 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black block">
                💰 目標預算金額 (NT$)
              </label>
              <input
                type="number"
                required
                min={1}
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="輸入目標儲蓄額度"
                className="w-full p-2 border-2 border-black text-xs font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black block">
                📥 已有儲蓄自備金 (選填)
              </label>
              <input
                type="number"
                min={0}
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="例如：已先存了 3000 元"
                className="w-full p-2 border-2 border-black text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="cancel-add-goal-btn"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-1.5 border-2 border-black text-xs font-bold bg-white text-black hover:bg-gray-50 cursor-pointer"
            >
              取消
            </button>
            <button
              id="submit-add-goal-btn"
              type="submit"
              className="px-4 py-1.5 bg-[#22C55E] hover:bg-[#1ebd56] text-black border-2 border-black text-xs font-black cursor-pointer shadow-[2px_2px_0px_0px_#000000]"
            >
              開始蓄水
            </button>
          </div>
        </form>
      )}

      {/* Saving Target Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <div className="col-span-1 md:col-span-2 bg-white border-2 border-black/30 border-dashed py-14 text-center text-gray-400 space-y-2">
            <PiggyBank className="w-12 h-12 text-gray-300 mx-auto animate-bounce" />
            <p className="text-xs font-bold text-gray-500">
              當前沒有設立任何儲蓄願景。立刻點選右上角設立目標！
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const completionPercent = Math.min(100, Number(((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)));
            const remaining = goal.targetAmount - goal.currentAmount;

            return (
              <div
                key={goal.id}
                className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-4 flex flex-col justify-between"
              >
                {/* Visual header */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between">
                    <span className="text-lg font-black text-black">
                      🎯 {goal.title}
                    </span>
                    <button
                      id={`delete-goal-${goal.id}`}
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-none cursor-pointer transition-colors"
                      title="刪除願景"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono font-black">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-black shrink-0" />
                      目標年限: {goal.targetDate || "未設定"}
                    </div>
                    <div>
                      {completionPercent === 100 ? "🎉 達標！" : `差 $${remaining.toLocaleString()}元`}
                    </div>
                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black text-black">
                      ${goal.currentAmount.toLocaleString()} /{" "}
                      <span className="text-gray-500">${goal.targetAmount.toLocaleString()}</span>
                    </span>
                    <span className="text-sm font-mono font-black text-[#22C55E]">
                      {completionPercent}%
                    </span>
                  </div>
                  {/* Outer rail */}
                  <div className="w-full bg-gray-100 border-2 border-black h-5 rounded-none relative overflow-hidden select-none">
                    <div
                      className="bg-[#22C55E] h-full border-r border-black font-semibold transition-all duration-500"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                {/* Contribution deposit bank action */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    value={depositAmountInputs[goal.id] || ""}
                    onChange={(e) =>
                      setDepositAmountInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))
                    }
                    placeholder="放入小豬存款（例：500）"
                    className="flex-1 p-2 border-2 border-black text-xs font-semibold focus:outline-none"
                  />
                  <button
                    id={`deposit-btn-${goal.id}`}
                    onClick={() => handleQuickDeposit(goal)}
                    className="px-3 py-2 bg-black hover:bg-gray-800 text-white border-2 border-black text-xs font-black cursor-pointer shadow-[2px_2px_0px_0px_#22C55E]"
                  >
                    存入
                  </button>
                </div>

                {/* Quick contribute shortcuts */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleQuickDeposit(goal, 100)}
                    className="p-1 px-2 border border-black/40 hover:border-black text-[10px] font-bold hover:bg-gray-55 cursor-pointer font-mono"
                  >
                    + $100
                  </button>
                  <button
                    onClick={() => handleQuickDeposit(goal, 500)}
                    className="p-1 px-2 border border-black/40 hover:border-black text-[10px] font-bold hover:bg-gray-55 cursor-pointer font-mono"
                  >
                    + $500
                  </button>
                  <button
                    onClick={() => handleQuickDeposit(goal, 1000)}
                    className="p-1 px-2 border border-black/40 hover:border-black text-[10px] font-bold hover:bg-gray-55 cursor-pointer font-mono"
                  >
                    + $1000
                  </button>
                </div>

                {/* AI Predictive analysis box */}
                <div className="border-t border-black/15 pt-3 mt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-black flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#22C55E] animate-pulse" />
                      Gemini AI 願景助理預測
                    </span>
                    <button
                      id={`ai-forecast-btn-${goal.id}`}
                      onClick={() => handleAiAnalyze(goal)}
                      disabled={analyzingGoalId === goal.id}
                      className="px-2 py-1 bg-[#22C55E]/10 hover:bg-[#22C55E]/30 text-[#22C55E] border border-[#22C55E]/40 text-[9px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 shrink-0 ${analyzingGoalId === goal.id ? "animate-spin" : ""}`} />
                      {analyzingGoalId === goal.id ? "分析中..." : goal.predictedDate ? "重新精算" : "願景預測"}
                    </button>
                  </div>

                  {goal.predictedDate ? (
                    <div className="bg-[#F3FCEF]/50 border border-[#22C55E]/20 p-2.5 space-y-1 rounded-none text-[11px] font-medium leading-relaxed">
                      <p className="font-extrabold text-black flex items-center gap-1 font-sans">
                        <TrendingUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        {goal.predictedDate}
                      </p>
                      {goal.aiAdvice && (
                        <p className="text-gray-600 italic font-medium scale-98 origin-left pt-0.5">
                          " {goal.aiAdvice} "
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 font-mono font-medium pt-0.5 leading-snug">
                      尚未進行智慧預測。點擊「願景預測」，AI 將依據你的消費流水，估計何時可以達成，並提供專屬省錢建議！
                    </p>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

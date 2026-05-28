import React, { useState } from "react";
import { Transaction } from "../types";
import { Plus, Trash2, Calendar, PiggyBank, ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";

interface DashboardProps {
  transactions: Transaction[];
  onAddClick: () => void;
  onDeleteTransaction: (id: string) => void;
}

const CATEGORY_MAP: Record<string, { emoji: string; color: string }> = {
  飲食: { emoji: "🍔", color: "#EF4444" }, // Red
  交通: { emoji: "🚲", color: "#3B82F6" }, // Blue
  娛樂: { emoji: "🎮", color: "#F59E0B" }, // Orange
  購物: { emoji: "🛍️", color: "#EC4899" }, // Pink
  帳單: { emoji: "🧾", color: "#8B5CF6" }, // Violet
  其他: { emoji: "🏷️", color: "#10B981" }, // Green
};

export default function Dashboard({ transactions, onAddClick, onDeleteTransaction }: DashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Compute current month statistics
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  const currentMonthTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    return tDate.getFullYear() === currentYear && tDate.getMonth() + 1 === currentMonth;
  });

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = currentMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSaving = totalIncome - totalExpense;

  // Compute category shares for expenses
  const expenseTransactions = currentMonthTransactions.filter((t) => t.type === "expense");
  const categoryTotals: Record<string, number> = {};
  let overallExpenseTotal = 0;

  expenseTransactions.forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    overallExpenseTotal += t.amount;
  });

  const chartSegments = Object.entries(categoryTotals).map(([cat, total]) => {
    const percentage = overallExpenseTotal > 0 ? (total / overallExpenseTotal) * 100 : 0;
    return {
      category: cat,
      amount: total,
      percentage: Number(percentage.toFixed(1)),
      color: CATEGORY_MAP[cat]?.color || "#9CA3AF",
    };
  });

  // Calculate SVG Circle Parameters for clean Donut Chart representation
  // Radius = 60, circumference = 2 * PI * r = ~376.99
  const radius = 60;
  const strokeWidth = 18;
  const size = 160;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = -90; // Start segment calculation at the top (12 o'clock)

  const drawDonutSegments = () => {
    if (overallExpenseTotal === 0) {
      return (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          className="transition-all duration-300"
        />
      );
    }

    return chartSegments.map((seg, idx) => {
      const strokeDashoffset = circumference - (seg.percentage / 100) * circumference;
      const rotation = accumulatedAngle;
      accumulatedAngle += (seg.percentage / 100) * 360;

      return (
        <circle
          key={idx}
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(${rotation} ${center} ${center})`}
          className="transition-all duration-300 cursor-pointer origin-center hover:opacity-90"
          onMouseEnter={() => setSelectedCategory(seg.category)}
          onMouseLeave={() => setSelectedCategory(null)}
          style={{ strokeLinecap: "butt" }}
        />
      );
    });
  };

  return (
    <div className="space-y-6 text-black">
      
      {/* Monthly Summary Cards (Neo-Minimalism Bento Board) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-extrabold tracking-wider text-gray-500 uppercase block font-mono">
              當月總收入
            </span>
            <span className="text-2xl font-black font-sans text-black">
              NT$ {totalIncome.toLocaleString()}
            </span>
          </div>
          <div className="w-10 h-10 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-none flex items-center justify-center text-[#22C55E]">
            <ArrowUpRight className="w-5 h-5 line-clamp-1 shrink-0" />
          </div>
        </div>

        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-extrabold tracking-wider text-gray-500 uppercase block font-mono">
              當月總支出
            </span>
            <span className="text-2xl font-black font-sans text-black">
              NT$ {totalExpense.toLocaleString()}
            </span>
          </div>
          <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-none flex items-center justify-center text-red-500">
            <ArrowDownRight className="w-5 h-5 line-clamp-1 shrink-0" />
          </div>
        </div>

        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-extrabold tracking-wider text-gray-500 uppercase block font-mono">
              預估結餘/儲蓄
            </span>
            <span className={`text-2xl font-black font-sans ${totalSaving >= 0 ? "text-green-600" : "text-amber-600"}`}>
              NT$ {totalSaving.toLocaleString()}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-none border flex items-center justify-center ${
            totalSaving >= 0 ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]" : "bg-amber-50 border-amber-200 text-amber-600"
          }`}>
            <PiggyBank className="w-5 h-5 shrink-0" />
          </div>
        </div>

      </div>

      {/* Interactive Pie Chart & Analytics segment */}
      <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* SVG Circle visual donut segment */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-40 h-40">
            <svg width={size} height={size} className="transform -rotate-15">
              {drawDonutSegments()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase font-mono">
                {selectedCategory ? `${selectedCategory}佔比` : "當月總開銷"}
              </span>
              <span className="text-sm font-black text-black block tracking-tight pt-0.5">
                {selectedCategory ? (
                  `${chartSegments.find((s) => s.category === selectedCategory)?.percentage || 0}%`
                ) : (
                  `$${overallExpenseTotal.toLocaleString()}`
                )}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 font-bold block pt-2 mt-1">
            💡 滑鼠觸碰甜甜圈圖區塊可顯示細分佔比
          </span>
        </div>

        {/* Indicators Panel */}
        <div className="md:col-span-7 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-black flex items-center gap-1.5 border-b-2 border-black pb-2">
            支出板塊佔比
          </h3>
          
          {chartSegments.length === 0 ? (
            <div className="h-full flex flex-col justify-center py-6 text-center text-xs font-semibold text-gray-500 font-mono">
              🏖️ 這個月尚未建立任何支出！太棒了！
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {chartSegments.map((seg, i) => {
                const emojDetails = CATEGORY_MAP[seg.category];
                return (
                  <div
                    key={i}
                    onMouseEnter={() => setSelectedCategory(seg.category)}
                    onMouseLeave={() => setSelectedCategory(null)}
                    className={`p-2 border border-black rounded-none flex items-center justify-between transition-colors ${
                      selectedCategory === seg.category ? "bg-gray-150" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{emojDetails?.emoji}</span>
                      <span className="text-xs font-bold text-black">{seg.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-black">
                        ${seg.amount.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-mono text-gray-500">
                        {seg.percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Recent Activity Log section */}
      <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-4">
        
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <h2 className="text-md font-black uppercase tracking-wider text-black flex items-center gap-2">
            🗂️ 記帳活動流
          </h2>
          <button
            id="dashboard-quick-add-btn"
            onClick={onAddClick}
            className="px-2.5 py-1.5 bg-[#22C55E] hover:bg-[#1ebd56] active:bg-[#1a9f4a] border-2 border-black text-xs font-black flex items-center gap-1 transition-all shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            快速記一筆
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-gray-300">
            <Inbox className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-xs font-bold text-gray-500">零紀錄！開啟你的第一筆SAVVY極簡記帳吧。</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {transactions.slice(0, 10).map((tx) => {
              const meta = CATEGORY_MAP[tx.category] || { emoji: "🏷️", color: "#6B7280" };
              return (
                <div
                  key={tx.id}
                  className="bg-white border border-black rounded-none p-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 border border-black rounded-none flex items-center justify-center text-lg bg-white shrink-0">
                      {meta.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-black truncate max-w-[124px] md:max-w-xs">
                          {tx.note || tx.category}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-gray-100 border border-black/40 text-gray-650 font-mono scale-95 origin-left font-semibold">
                          {tx.category}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono font-semibold block pt-0.5">
                        {tx.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-black font-mono shrink-0 ${
                        tx.type === "income" ? "text-green-600" : "text-black"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"} NT$ {tx.amount.toLocaleString()}
                    </span>
                    <button
                      id={`delete-tx-${tx.id}`}
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1 hover:bg-red-50 hover:text-red-500 text-gray-400 border border-transparent hover:border-red-200 rounded-none transition-all cursor-pointer"
                      title="刪除紀錄"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {transactions.length > 10 && (
              <p className="text-center text-[10px] text-gray-400 font-mono font-bold pt-1">
                僅顯示最近 10 筆明細，點選「日曆與歷史分頁」以看更多收支數據
              </p>
            )}
          </div>
        )}

      </div>

    </div>
  );
}

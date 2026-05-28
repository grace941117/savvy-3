import { useState } from "react";
import { Transaction } from "../types";
import { ChevronLeft, ChevronRight, Calendar, Landmark, AlertCircle, Plus, Info } from "lucide-react";

interface CalendarViewProps {
  transactions: Transaction[];
  onAddTransactionForDate: (date: string) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function CalendarView({ transactions, onAddTransactionForDate, onDeleteTransaction }: CalendarViewProps) {
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Helper arrays
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const monthsTraditional = [
    "1月 一月", "2月 二月", "3月 三月", "4月 四月", "5月 五月", "6月 六月",
    "7月 七月", "8月 八月", "9月 九月", "10月 十月", "11月 十一月", "12月 十二月"
  ];

  // Get total days in this month & starting weekday
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calendar cells generation
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  // Group transactions by date for quick dot computations
  const txByDate: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    txByDate[tx.date] = txByDate[tx.date] || [];
    txByDate[tx.date].push(tx);
  });

  // Hotspot determinations for any date
  const getHotspotDot = (dateStr: string) => {
    const list = txByDate[dateStr];
    if (!list || list.length === 0) return null;

    const totalExpense = list
      .filter((t) => t.type === "expense")
      .reduce((acc, c) => acc + c.amount, 0);

    const totalIncome = list
      .filter((t) => t.type === "income")
      .reduce((acc, c) => acc + c.amount, 0);

    // Large high-contrast colored dot represent hotspots
    if (totalExpense > 2000) {
      return <span className="absolute bottom-1 w-2 h-2 bg-red-600 rounded-full border border-black/40 shadow-sm" title="支出高峰 (2000+)" />;
    } else if (totalExpense > 500) {
      return <span className="absolute bottom-1 w-2 h-2 bg-amber-400 rounded-full border border-black/40 shadow-sm" title="中度支出 (500+)" />;
    } else if (totalExpense > 0) {
      return <span className="absolute bottom-1 w-1.5 h-1.5 bg-gray-400 rounded-full" />;
    } else if (totalIncome > 0) {
      return <span className="absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" title="今日有收入！" />;
    }
    return null;
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    setViewDate((prev) => {
      const nextDate = new Date(prev);
      if (direction === "prev") {
        nextDate.setMonth(prev.getMonth() - 1);
      } else {
        nextDate.setMonth(prev.getMonth() + 1);
      }
      return nextDate;
    });
  };

  // Selected date transactions detail log
  const selectedDayTransactions = txByDate[selectedDateStr] || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-black">
      
      {/* Calendar Grid Section: (7 columns) */}
      <div className="md:col-span-7 bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-4">
        
        {/* Month Navigation Row */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="space-y-0.5">
            <h3 className="text-md font-black tracking-tight font-mono text-black">
              {year} 年
            </h3>
            <span className="text-sm font-extrabold uppercase tracking-wide text-green-600 bg-[#22C55E]/10 px-2 py-0.5 rounded-none font-mono text-xs inline-block">
              {monthsTraditional[month]}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleMonthChange("prev")}
              className="p-1.5 hover:bg-gray-100 border-2 border-black rounded-none transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
              title="上個月"
            >
              <ChevronLeft className="w-4 h-4 text-black" />
            </button>
            <button
              onClick={() => handleMonthChange("next")}
              className="p-1.5 hover:bg-gray-100 border-2 border-black rounded-none transition-colors cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
              title="下個月"
            >
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>

        {/* Week Day Header */}
        <div className="grid grid-cols-7 text-center gap-1 border-b border-black pb-1.5 select-none">
          {weekdays.map((day) => (
            <span
              key={day}
              className={`text-xs font-black uppercase font-mono ${
                day === "日" || day === "六" ? "text-amber-500" : "text-black"
              }`}
            >
              {day}
            </span>
          ))}
        </div>

        {/* Days Grid visualizer */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="aspect-square bg-gray-50/20" />;
            }

            const dayNum = cell.getDate();
            const dateStr = cell.toISOString().split("T")[0];
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === new Date().toISOString().split("T")[0];

            return (
              <button
                key={dateStr}
                id={`calendar-cell-${dateStr}`}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`relative aspect-square border transition-all flex flex-col justify-start p-1.5 rounded-none select-none cursor-pointer ${
                  isSelected
                    ? "bg-[#22C55E] border-black scale-102 font-bold ring-2 ring-black shadow-[2px_2px_0px_0px_#000000] z-10 text-black"
                    : isToday
                    ? "bg-[#22C55E]/10 border-black font-extrabold"
                    : "bg-white hover:bg-gray-50 border-black/15 text-black"
                }`}
              >
                <span className="text-xs font-mono font-black">{dayNum}</span>
                <span className="flex justify-center w-full">
                  {getHotspotDot(dateStr)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Heat Map Legend */}
        <div className="border-t border-black/10 pt-2.5 flex flex-wrap gap-4 text-[10px] text-gray-500 font-mono font-bold select-none justify-between">
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-red-650 rounded-full border border-black/30 bg-red-600 block shrink-0" />
              支出高點 (2,000+)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-full border border-black/30 block shrink-0" />
              中度花費 (500+)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full border border-black/30 block shrink-0" />
              本日收成
            </span>
          </div>
          <span className="scale-95 leading-normal">🗓️ 點日曆格子補記/查明細</span>
        </div>

      </div>

      {/* Detail transactions list for Selected Date (5 columns) */}
      <div className="md:col-span-5 flex flex-col gap-4">
        
        {/* Date readout header visual card */}
        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-3">
          <div className="flex justify-between items-center border-b border-black pb-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-black flex items-center gap-1">
              <Calendar className="w-4 h-4 text-black shrink-0" />
              紀錄焦點明細
            </span>
            <span className="text-xs font-bold font-mono text-gray-400">
              {selectedDateStr}
            </span>
          </div>

          {selectedDayTransactions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-500 leading-normal">
                這天沒有留下任何記帳紀錄。
              </p>
              <button
                id="preload-date-add-btn"
                onClick={() => onAddTransactionForDate(selectedDateStr)}
                className="mx-auto px-3 py-1.5 bg-[#22C55E] hover:bg-[#1ebd56] border-2 border-black text-xs font-black flex items-center gap-1 rounded-none shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-black" />
                登記今日消費
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[180px] overflow-y-auto">
              {selectedDayTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-[#F3FCEF]/30 border border-black p-2 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-none text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-extrabold text-black truncate">
                      {tx.note || tx.category}
                    </p>
                    <span className="text-[9px] text-gray-550 font-semibold font-mono italic">
                      {tx.category} / {tx.type === "expense" ? "支出" : "收入"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`font-mono font-black ${tx.type === "income" ? "text-green-600" : "text-black"}`}>
                      {tx.type === "income" ? "+" : "-"} ${tx.amount.toLocaleString()}
                    </span>
                    <button
                      id={`delete-cal-tx-${tx.id}`}
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                id="calendar-add-more-btn"
                onClick={() => onAddTransactionForDate(selectedDateStr)}
                className="w-full py-1.5 border border-dashed border-black hover:bg-gray-50 text-[10px] font-black hover:text-green-600 font-mono transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
              >
                💡 新增當日紀錄
              </button>
            </div>
          )}
        </div>

        {/* Retroactive tip card */}
        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] flex gap-2.5 items-start">
          <Info className="w-5 h-5 text-gray-650 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-black text-black">💡 什麼是補登（回溯記帳）？</span>
            <p className="text-gray-550 leading-relaxed scale-98 pr-2">
              生活步調飛快容易遺忘記帳。您隨時可在左側月曆中選擇「過往任何一天」，點擊上述補記按鈕。日期將會自動鎖定，讓您從容完成歷史補登！
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

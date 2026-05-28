import { useState } from "react";
import { Sparkles, Delete, Check, RotateCcw, HelpCircle } from "lucide-react";

interface QuickEntryProps {
  onSave: (data: {
    amount: number;
    category: "飲食" | "交通" | "娛樂" | "購物" | "帳單" | "其他";
    type: "expense" | "income";
    note: string;
    date: string;
  }) => void;
  key?: string;
}

const CATEGORIES = [
  { name: "飲食", emoji: "🍔", color: "hover:bg-red-50 hover:border-red-500" },
  { name: "交通", emoji: "🚲", color: "hover:bg-blue-50 hover:border-blue-500" },
  { name: "娛樂", emoji: "🎮", color: "hover:bg-amber-50 hover:border-amber-500" },
  { name: "購物", emoji: "🛍️", color: "hover:bg-pink-50 hover:border-pink-500" },
  { name: "帳單", emoji: "🧾", color: "hover:bg-purple-50 hover:border-purple-500" },
  { name: "其他", emoji: "🏷️", color: "hover:bg-emerald-50 hover:border-emerald-500" },
];

export default function QuickEntry({ onSave }: QuickEntryProps) {
  const [amountStr, setAmountStr] = useState("0");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState<"飲食" | "交通" | "娛樂" | "購物" | "帳單" | "其他">("飲食");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  });

  // AI unstructured parser states
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  const handleKeyPress = (val: string) => {
    setAmountStr((prev) => {
      if (prev === "0") {
        if (val === "0" || val === "00") return "0";
        return val;
      }
      // Limit length to avoid overflow
      if (prev.length >= 9) return prev;
      return prev + val;
    });
  };

  const handleBackspace = () => {
    setAmountStr((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setAmountStr("0");
  };

  const handleSave = () => {
    const num = Number(amountStr);
    if (!num || num <= 0) {
      alert("請輸入有效的金額！");
      return;
    }
    onSave({
      amount: num,
      category,
      type,
      note: note.trim() || (type === "expense" ? `${category}支出` : "一般收入"),
      date: date || new Date().toISOString().split("T")[0],
    });
    // Reset values after save
    setAmountStr("0");
    setNote("");
  };

  // Trigger Gemini parsing in Express backend proxy
  const handleAiParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError("");
    try {
      const res = await fetch("/api/gemini/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await res.json();
      if (data.success && data.transaction) {
        const tx = data.transaction;
        setAmountStr(String(tx.amount || 0));
        setType(tx.type === "income" ? "income" : "expense");
        setCategory(tx.category || "飲食");
        setNote(tx.note || "");
        setRawText(""); // Clear AI input on success
      } else {
        setParseError(data.error || "無法解析，請試著使用更精確的語句。");
      }
    } catch (err) {
      console.error(err);
      setParseError("服務連接失敗，請稍後再試。");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-black">
      
      {/* LEFT COLUMN: Input Console and AI Extraction (7 cols) */}
      <div className="md:col-span-7 space-y-4">
        
        {/* Core Input Display */}
        <div className="bg-white border-2 border-black p-5 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-3">
          
          <div className="flex justify-between items-center bg-[#F3FCEF] p-2 border border-black rounded-none">
            {/* Type Switch Indicator */}
            <div className="flex gap-1.5 bg-white p-1 border border-black rounded-none">
              <button
                id="quick-expense-tab"
                type="button"
                onClick={() => setType("expense")}
                className={`px-3 py-1 font-extrabold text-xs rounded-none transition-all cursor-pointer ${
                  type === "expense" ? "bg-black text-white" : "text-gray-500 hover:text-black"
                }`}
              >
                支出 (-)
              </button>
              <button
                id="quick-income-tab"
                type="button"
                onClick={() => setType("income")}
                className={`px-3 py-1 font-extrabold text-xs rounded-none transition-all cursor-pointer ${
                  type === "income" ? "bg-black text-white" : "text-gray-500 hover:text-black"
                }`}
              >
                收入 (+)
              </button>
            </div>

            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-gray-500 uppercase block font-mono text-right">
                記帳日期
              </span>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                className="p-1 border border-black rounded-none text-xs font-bold font-mono focus:outline-none bg-white text-right"
              />
            </div>
          </div>

          {/* Large dynamic entry display */}
          <div className="flex items-baseline justify-between py-1 px-2 border-b-2 border-dashed border-black">
            <span className="text-xl font-mono font-black text-[#22C55E]">
              NT$
            </span>
            <span className="text-4xl font-mono font-black tracking-tight tracking-wider text-black select-none">
              {amountStr}
            </span>
          </div>

          {/* Simple Note Pad inline write */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black">
              備註說明 (選填)
            </span>
            <input
              type="text"
              value={note}
              maxLength={25}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`如 "麥當勞午餐" ... (上限25字)`}
              className="w-full p-2 border border-black rounded-none text-xs font-semibold focus:outline-none focus:bg-gray-50"
            />
          </div>

        </div>

        {/* Categories Grid Multi Option Selector */}
        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
          <span className="text-xs font-extrabold uppercase bg-black text-[#22C55E] py-1 px-3 inline-block rounded-none font-mono">
            一鍵選取分類大圖示
          </span>
          <div className="grid grid-cols-3 gap-2 pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                id={`cat-select-${cat.name}`}
                type="button"
                onClick={() => setCategory(cat.name as any)}
                className={`py-3 border-2 rounded-none flex flex-col items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000050] ${cat.color} ${
                  category === cat.name
                    ? "bg-[#22C55E] border-black scale-102 font-bold shadow-[2px_2px_0px_0px_#000000]"
                    : "bg-white border-black/40 text-black shadow-none scale-100"
                }`}
              >
                <span className="text-xl select-none">{cat.emoji}</span>
                <span className="text-[10px] font-black pt-1">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI unstructured parser assistant panel */}
        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-3">
          <div className="flex items-center justify-between border-b border-black pb-1.5">
            <span className="text-xs font-extrabold uppercase text-black flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#22C55E] animate-pulse shrink-0" />
              Gemini AI 口語極速記帳
            </span>
            <span className="text-[8px] font-mono text-gray-500 font-bold bg-[#F3FCEF] py-0.5 px-2 select-none">
              3秒記帳黑科技
            </span>
          </div>

          <div className="space-y-2">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={isParsing}
              rows={2}
              className="w-full text-xs font-medium p-2.5 border-2 border-black rounded-none focus:outline-none bg-gray-50 focus:bg-white resize-none"
              placeholder={`口語說一段話：比如「中午在好市多買零食花了1500」、「今天家教薪水入帳7500」...`}
            />

            {parseError && (
              <p className="text-[10px] text-red-600 font-semibold bg-red-50 p-1 border border-red-200">
                ⚠ {parseError}
              </p>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="text-[9px] text-gray-500 font-medium">
                <strong>💡 試試直接輸入：</strong>晚餐跟朋友聚餐吃義大利麵花了450
              </div>
              <button
                id="ai-parse-btn"
                type="button"
                onClick={handleAiParse}
                disabled={isParsing || !rawText.trim()}
                className="px-3 py-1.5 bg-black hover:bg-gray-850 active:bg-black text-white text-xs font-bold border-2 border-black rounded-none flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_0px_#22C55E]"
              >
                {isParsing ? "智慧分析中..." : "AI 辨識"}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive giant keypad and save row (5 cols) */}
      <div className="md:col-span-5 h-full flex flex-col justify-between">
        <div className="bg-white border-2 border-black p-4 rounded-none shadow-[4px_4px_0px_0px_#000000] space-y-3 h-full flex flex-col justify-between">
          
          <div className="flex justify-between items-center border-b border-black pb-1.5">
            <span className="text-xs font-extrabold uppercase text-black">
              🎛 經費計數器
            </span>
            <span className="text-[10px] font-mono font-bold text-gray-400">
              LEDGER DISP
            </span>
          </div>

          {/* Numbers grid button pad layout */}
          <div className="grid grid-cols-3 gap-2 pt-1 flex-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                id={`keypad-${num}`}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="py-4 border border-black rounded-none bg-[#F3FCEF]/30 hover:bg-[#F3FCEF] active:bg-gray-100 font-mono font-black text-lg transition-colors cursor-pointer select-none active:translate-x-[1px] active:translate-y-[1px]"
              >
                {num}
              </button>
            ))}
            <button
              id="keypad-clear"
              type="button"
              onClick={handleClear}
              className="py-4 border border-black rounded-none bg-red-100/20 hover:bg-red-50 text-red-500 font-mono font-black text-xs transition-colors cursor-pointer select-none"
            >
              C (清除)
            </button>
            <button
              id="keypad-0"
              type="button"
              onClick={() => handleKeyPress("0")}
              className="py-4 border border-black rounded-none bg-[#F3FCEF]/30 hover:bg-[#F3FCEF] active:bg-gray-100 font-mono font-black text-lg transition-colors cursor-pointer select-none"
            >
              0
            </button>
            <button
              id="keypad-backspace"
              type="button"
              onClick={handleBackspace}
              className="py-4 border border-black rounded-none bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors cursor-pointer select-none"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Complete and save transaction */}
          <button
            id="quick-save-btn"
            type="button"
            onClick={handleSave}
            className="w-full py-4 bg-[#22C55E] hover:bg-[#1ebd56] active:bg-[#1a9f4a] border-2 border-black font-extrabold text-black shrink-0 flex items-center justify-center gap-2 mt-3 transition-colors shadow-[4px_4px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3px]" />
            儲存 ＆ 完成
          </button>

        </div>
      </div>

    </div>
  );
}

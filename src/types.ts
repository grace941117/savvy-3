export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  photoUrl: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  category: "飲食" | "交通" | "娛樂" | "購物" | "帳單" | "其他";
  type: "expense" | "income";
  date: string; // YYYY-MM-DD form
  note: string;
  createdAt: string; // ISO creation stamp
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // Target date (YYYY-MM-DD)
  predictedDate?: string; // AI dynamic schedule projection
  aiAdvice?: string; // AI booster/motivational insights
  createdAt: string;
}

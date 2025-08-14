export interface UserProfile {
  id: string;
  username: string;
  email: string;
  balance: number;
  role: 'player' | 'admin';
  createdAt?: string;
}

export interface GameModel {
  id?: string;
  gameNumber: number;
  status: 'open' | 'closed' | 'finished';
  winningNumber?: number;
  winningColor?: 'rojo' | 'negro' | 'verde';
  createdAt?: string;
}

export type BetType = 'color' | 'numero';

export interface BetModel {
  id?: string;
  gameNumber: number;
  bets: { type: BetType; value: 'rojo' | 'negro' | 'verde' | number; amount: number }[];
  payout?: number;
  createdAt?: string;
}


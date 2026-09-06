export interface CashoutMethod {
  id: string;
  name: string;
  logo: string;
  category: string;
  bg_color: string;
  payment_title: string;
  status: boolean;
  fee: string;
  minimum: number;
}

export const DEFAULT_METHODS: CashoutMethod[] = [
  {
    id: "cashout-01",
    name: "PayPal",
    logo: "🅿️",
    category: "Fiat",
    bg_color: "#003087",
    payment_title: "Enter your PayPal email address",
    status: true,
    fee: "0%",
    minimum: 1000,
  },
  {
    id: "cashout-02",
    name: "Litecoin (LTC)",
    logo: "🪙",
    category: "Crypto",
    bg_color: "#1f2238",
    payment_title: "Enter your LTC receiving address",
    status: true,
    fee: "0%",
    minimum: 250,
  },
  {
    id: "cashout-03",
    name: "USDT (TRC20)",
    logo: "💵",
    category: "Crypto",
    bg_color: "#122822",
    payment_title: "Enter your USDT (TRC20) wallet address",
    status: true,
    fee: "0%",
    minimum: 1000,
  },
  {
    id: "cashout-04",
    name: "TRON (TRX)",
    logo: "💎",
    category: "Crypto",
    bg_color: "#162033",
    payment_title: "Enter your TRX wallet address",
    status: true,
    fee: "0%",
    minimum: 100,
  },
];
"use client";

import { useState } from "react";
import {
  CreditCard,
  Send,
  Download,
  QrCode,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet as WalletIcon,
  ShieldCheck,
  CheckCircle2,
  X,
  History,
  Copy,
  Check,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface TransactionItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  type: "debit" | "credit";
  category: "ticket" | "topup" | "purchase" | "transfer";
}

const TRANSACTIONS: TransactionItem[] = [
  {
    id: "tx-1",
    title: "Event Ticket",
    subtitle: "Kampmax Fest 2025",
    date: "Today, 10:24 AM",
    amount: 2000,
    type: "debit",
    category: "ticket",
  },
  {
    id: "tx-2",
    title: "Top Up",
    subtitle: "Wallet Funding via Bank Transfer",
    date: "Yesterday, 3:12 PM",
    amount: 5000,
    type: "credit",
    category: "topup",
  },
  {
    id: "tx-3",
    title: "Product Purchase",
    subtitle: "Wireless Earbuds (TechHub)",
    date: "Sep 21, 2025",
    amount: 25000,
    type: "debit",
    category: "purchase",
  },
  {
    id: "tx-4",
    title: "Transfer Received",
    subtitle: "From Chioma",
    date: "Sep 18, 2025",
    amount: 3000,
    type: "credit",
    category: "transfer",
  },
];

export default function KampmaxPayPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(12450);
  const [activeModal, setActiveModal] = useState<"fund" | "send" | "receive" | "card" | null>(null);
  const [fundAmount, setFundAmount] = useState("5000");
  const [fundSuccess, setFundSuccess] = useState(false);
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [copiedAccount, setCopiedAccount] = useState(false);

  const handleFundWallet = () => {
    const num = Number(fundAmount) || 0;
    if (num > 0) {
      setBalance((b) => b + num);
      setFundSuccess(true);
      setTimeout(() => {
        setFundSuccess(false);
        setActiveModal(null);
      }, 1500);
    }
  };

  const handleSendMoney = () => {
    const num = Number(sendAmount) || 0;
    if (num > 0 && num <= balance) {
      setBalance((b) => b - num);
      setActiveModal(null);
      setSendAmount("");
      setSendRecipient("");
    }
  };

  return (
    <PageContainer className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size="md" />
          <span className="text-lg font-black text-primary-900 tracking-tight">Pay</span>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● Protected by Kampmax Escrow
        </span>
      </div>

      {/* Royal Blue Kampmax Pay Wallet Card matching Screen 10 */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-[#0256E0] via-[#0066FF] to-[#0047BA] text-white p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-blue-100 tracking-wide">Wallet Balance</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
              ₦{balance.toLocaleString()}.00
            </h2>
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={() => setActiveModal("fund")}
            className="px-5 py-2.5 rounded-full bg-white hover:bg-blue-50 active:scale-95 text-primary-700 text-xs font-extrabold shadow-md transition-all"
          >
            Fund Wallet
          </button>
          <span className="text-[11px] text-blue-100 font-medium">
            Account: 9012345678 (Wema)
          </span>
        </div>
      </div>

      {/* 4 Quick Actions in row matching Screen 10 */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
        <button
          onClick={() => setActiveModal("send")}
          className="group flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:border-primary-300 hover:shadow-xs active:scale-95 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-1.5 group-hover:bg-primary-600 group-hover:text-white transition-colors">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-neutral-800">Send</span>
        </button>

        <button
          onClick={() => setActiveModal("receive")}
          className="group flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:border-primary-300 hover:shadow-xs active:scale-95 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Download className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-neutral-800">Receive</span>
        </button>

        <button
          onClick={() => setActiveModal("send")}
          className="group flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:border-primary-300 hover:shadow-xs active:scale-95 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <QrCode className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-neutral-800">Pay</span>
        </button>

        <button
          onClick={() => setActiveModal("card")}
          className="group flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:border-primary-300 hover:shadow-xs active:scale-95 transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5 group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-neutral-800">Virtual Card</span>
        </button>
      </div>

      {/* Recent Transactions List matching Screen 10 */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Recent Transactions</h3>
          <button className="text-xs font-semibold text-primary-600 hover:underline">
            See all
          </button>
        </div>

        <div className="space-y-2.5">
          {TRANSACTIONS.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                    tx.category === "ticket"
                      ? "bg-rose-50 text-rose-600"
                      : tx.category === "topup"
                      ? "bg-emerald-50 text-emerald-600"
                      : tx.category === "purchase"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-purple-50 text-purple-600"
                  )}
                >
                  {tx.category === "ticket" ? "🎟️" : tx.category === "topup" ? "⚡" : "🛍️"}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-neutral-900">{tx.title}</h4>
                  <p className="text-xs text-neutral-500">{tx.subtitle}</p>
                  <p className="text-[10px] text-neutral-400">{tx.date}</p>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={cn(
                    "text-sm font-black",
                    tx.type === "credit" ? "text-emerald-600" : "text-neutral-900"
                  )}
                >
                  {tx.type === "credit" ? `+₦${tx.amount.toLocaleString()}` : `-₦${tx.amount.toLocaleString()}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal 1: Fund Wallet */}
      {activeModal === "fund" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>

            {fundSuccess ? (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-neutral-900">Wallet Funded!</h3>
                <p className="text-xs text-neutral-500">₦{Number(fundAmount).toLocaleString()} added to your Kampmax balance.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-neutral-900">Fund Your Wallet</h3>
                  <p className="text-xs text-neutral-500">Top up via Virtual Bank Transfer or Card</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">Amount (₦)</label>
                    <input
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="w-full h-11 px-3.5 mt-1 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 focus:ring-2 focus:ring-primary-600 outline-none"
                    />
                  </div>

                  {/* Virtual Account Box */}
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1 text-xs">
                    <p className="font-bold text-blue-900">Your Dedicated Kampmax Account</p>
                    <p className="text-neutral-600">Bank: <strong>Wema Bank / Monnify</strong></p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-neutral-900">9012345678</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText("9012345678");
                          setCopiedAccount(true);
                          setTimeout(() => setCopiedAccount(false), 2000);
                        }}
                        className="text-primary-600 font-semibold flex items-center gap-1 hover:underline"
                      >
                        {copiedAccount ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedAccount ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleFundWallet}
                    className="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    Simulate Instant Credit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Send Money */}
      {activeModal === "send" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Send Money / Pay Vendor</h3>
              <p className="text-xs text-neutral-500">Instant peer-to-peer campus transfers with 0 fees</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700">Recipient Phone, Username or Store ID</label>
                <input
                  type="text"
                  placeholder="@campusbite or 08012345678"
                  value={sendRecipient}
                  onChange={(e) => setSendRecipient(e.target.value)}
                  className="w-full h-11 px-3.5 mt-1 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:ring-2 focus:ring-primary-600 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="e.g. 2000"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full h-11 px-3.5 mt-1 border border-neutral-200 rounded-xl text-sm font-bold text-neutral-900 focus:ring-2 focus:ring-primary-600 outline-none"
                />
                <p className="text-[10px] text-neutral-400 mt-1">Available balance: ₦{balance.toLocaleString()}</p>
              </div>

              <button
                onClick={handleSendMoney}
                className="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Receive QR */}
      {activeModal === "receive" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Receive Campus Payment</h3>
              <p className="text-xs text-neutral-500">Scan this QR code to transfer directly to your wallet</p>
            </div>

            <div className="w-40 h-40 bg-neutral-50 rounded-2xl p-3 border-2 border-dashed border-primary-200 mx-auto flex items-center justify-center">
              <QrCode className="w-full h-full text-primary-700" />
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-900">{user?.name || "Daniel"}</p>
              <p className="text-[11px] text-neutral-500">Kampmax Tag: @daniel_owo</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Virtual Card */}
      {activeModal === "card" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900">Kampmax Virtual Dollar & Naira Card</h3>
              <p className="text-xs text-neutral-500">Use for campus store orders, software subscriptions & event tickets</p>
            </div>

            {/* Stylized Virtual Card Mock */}
            <div className="rounded-2xl bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-800 text-white p-5 space-y-4 shadow-xl border border-neutral-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400">Kampmax Black</span>
                <span className="text-xs font-mono">VISA</span>
              </div>
              <div className="pt-2">
                <p className="font-mono text-sm tracking-widest text-neutral-200">
                  4532 •••• •••• 8891
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                <span>EXP: 09/29</span>
                <span>CVV: 742</span>
                <span className="font-bold text-white uppercase">{user?.name || "Daniel Owo"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

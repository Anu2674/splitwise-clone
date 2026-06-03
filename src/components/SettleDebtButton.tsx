"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  groupId: string;
  receiverId: string;
  receiverName: string;
  amount: number;
}

export default function SettleDebtButton({ groupId, receiverId, receiverName, amount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function settle() {
    if (!confirm(`Record payment of ₹${amount.toFixed(2)} to ${receiverName}?`)) return;
    setLoading(true);
    await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, receiverId, amount }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); settle(); }}
      disabled={loading}
      className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1 rounded-lg transition disabled:opacity-50"
    >
      {loading ? "..." : "Settle up"}
    </button>
  );
}

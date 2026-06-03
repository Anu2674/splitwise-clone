"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SplitEditor from "@/components/SplitEditor";
import { SplitType, SplitInput } from "@/types";

const SPLIT_TYPES: { value: SplitType; label: string }[] = [
  { value: "equal", label: "Equal" },
  { value: "unequal", label: "Unequal" },
  { value: "percentage", label: "Percentage" },
  { value: "share", label: "By Shares" },
];

interface Group {
  id: string;
  name: string;
  members: { userId: string; user: { id: string; name: string; email: string } }[];
}

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preGroupId = searchParams.get("groupId") || "";

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState(preGroupId);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [splits, setSplits] = useState<SplitInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/groups").then((r) => r.json()).then((gs: Group[]) => {
      setGroups(gs);
      if (!groupId && gs.length > 0) setGroupId(gs[0].id);
    });
  }, []);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const members = selectedGroup?.members.map((m) => ({ id: m.user.id, name: m.user.name })) ?? [];

  useEffect(() => {
    if (members.length > 0 && splits.length === 0) {
      setSplits(members.map((m) => ({ userId: m.id, value: 1 })));
    }
  }, [groupId, groups]);

  function validate(): string | null {
    if (!groupId) return "Select a group";
    if (!description.trim()) return "Add a description";
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return "Enter a valid amount";
    if (splits.length === 0) return "Select at least one member";
    if (splitType === "unequal") {
      const total = splits.reduce((s, x) => s + x.value, 0);
      if (Math.abs(total - amt) > 0.01) return `Split amounts must total ₹${amt} (currently ₹${total.toFixed(2)})`;
    }
    if (splitType === "percentage") {
      const total = splits.reduce((s, x) => s + x.value, 0);
      if (Math.abs(total - 100) > 0.01) return `Percentages must total 100% (currently ${total}%)`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, description, amount: parseFloat(amount), splitType, splits }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setError(data.error || "Failed to create expense");
    else router.push(`/expenses/${data.id}`);
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-600">New Expense</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Expense</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group *</label>
            <select
              value={groupId}
              onChange={(e) => { setGroupId(e.target.value); setSplits([]); }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Dinner at Barbeque Nation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              required
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Split Method</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {SPLIT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setSplitType(t.value); setSplits(members.map((m) => ({ userId: m.id, value: t.value === "share" ? 1 : 0 }))); }}
                className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${splitType === t.value ? "bg-teal-500 text-white border-teal-500" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <SplitEditor
            members={members}
            splitType={splitType}
            splits={splits}
            totalAmount={parseFloat(amount) || 0}
            onChange={setSplits}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg py-3 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Add Expense"}
          </button>
          <Link
            href={groupId ? `/groups/${groupId}` : "/dashboard"}
            className="px-5 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

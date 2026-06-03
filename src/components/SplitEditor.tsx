"use client";
import { SplitType, SplitInput } from "@/types";

interface Member {
  id: string;
  name: string;
}

interface Props {
  members: Member[];
  splitType: SplitType;
  splits: SplitInput[];
  totalAmount: number;
  onChange: (splits: SplitInput[]) => void;
}

export default function SplitEditor({ members, splitType, splits, totalAmount, onChange }: Props) {
  const getSplit = (userId: string) => splits.find((s) => s.userId === userId)?.value ?? 0;

  const toggle = (userId: string) => {
    const exists = splits.some((s) => s.userId === userId);
    if (exists) onChange(splits.filter((s) => s.userId !== userId));
    else onChange([...splits, { userId, value: 0 }]);
  };

  const setValue = (userId: string, value: number) => {
    onChange(splits.map((s) => (s.userId === userId ? { ...s, value } : s)));
  };

  if (splitType === "equal") {
    const each = splits.length > 0 ? (totalAmount / splits.length).toFixed(2) : "0.00";
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 mb-2">Select members to include:</p>
        {members.map((m) => {
          const included = splits.some((s) => s.userId === m.id);
          return (
            <label key={m.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={included} onChange={() => toggle(m.id)} className="accent-teal-500" />
                <span className="text-sm text-gray-700">{m.name}</span>
              </div>
              {included && <span className="text-sm text-gray-500">₹{each}</span>}
            </label>
          );
        })}
      </div>
    );
  }

  if (splitType === "unequal") {
    const total = splits.reduce((s, x) => s + (x.value || 0), 0);
    const remaining = totalAmount - total;
    return (
      <div className="space-y-2">
        {members.map((m) => {
          const included = splits.some((s) => s.userId === m.id);
          return (
            <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <input type="checkbox" checked={included} onChange={() => toggle(m.id)} className="accent-teal-500" />
              <span className="flex-1 text-sm text-gray-700">{m.name}</span>
              {included && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400">₹</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={getSplit(m.id) || ""}
                    onChange={(e) => setValue(m.id, parseFloat(e.target.value) || 0)}
                    className="w-24 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          );
        })}
        <p className={`text-xs font-medium ${Math.abs(remaining) < 0.01 ? "text-green-600" : "text-red-500"}`}>
          {Math.abs(remaining) < 0.01 ? "✓ Split balances" : `Remaining: ₹${remaining.toFixed(2)}`}
        </p>
      </div>
    );
  }

  if (splitType === "percentage") {
    const total = splits.reduce((s, x) => s + (x.value || 0), 0);
    return (
      <div className="space-y-2">
        {members.map((m) => {
          const included = splits.some((s) => s.userId === m.id);
          const pct = getSplit(m.id);
          return (
            <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <input type="checkbox" checked={included} onChange={() => toggle(m.id)} className="accent-teal-500" />
              <span className="flex-1 text-sm text-gray-700">{m.name}</span>
              {included && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={pct || ""}
                    onChange={(e) => setValue(m.id, parseFloat(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="%"
                  />
                  <span className="text-xs text-gray-400">% = ₹{((totalAmount * pct) / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          );
        })}
        <p className={`text-xs font-medium ${Math.abs(total - 100) < 0.01 ? "text-green-600" : "text-red-500"}`}>
          Total: {total}% {Math.abs(total - 100) < 0.01 ? "✓" : `(must be 100%)`}
        </p>
      </div>
    );
  }

  // share
  const totalShares = splits.reduce((s, x) => s + (x.value || 0), 0);
  return (
    <div className="space-y-2">
      {members.map((m) => {
        const included = splits.some((s) => s.userId === m.id);
        const sh = getSplit(m.id);
        const amount = totalShares > 0 ? (totalAmount * sh) / totalShares : 0;
        return (
          <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <input type="checkbox" checked={included} onChange={() => toggle(m.id)} className="accent-teal-500" />
            <span className="flex-1 text-sm text-gray-700">{m.name}</span>
            {included && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={sh || ""}
                  onChange={(e) => setValue(m.id, parseFloat(e.target.value) || 0)}
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="shares"
                />
                <span className="text-xs text-gray-400">= ₹{amount.toFixed(2)}</span>
              </div>
            )}
          </div>
        );
      })}
      {totalShares > 0 && <p className="text-xs text-gray-400">Total shares: {totalShares}</p>}
    </div>
  );
}

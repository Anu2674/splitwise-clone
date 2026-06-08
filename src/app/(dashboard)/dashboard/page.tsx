import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGroupBalances, simplifyDebts } from "@/lib/balance";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      expenses: { include: { splits: true } },
      settlements: true,
    },
  });

  let totalOwed = 0;
  let totalOwe = 0;

  // Individual balance: collect all debts across all groups
  const allDebts: { name: string; amount: number; youOwe: boolean; groupName: string }[] = [];

  for (const g of groups) {
    const balances = calculateGroupBalances(g.expenses, g.settlements, g.members);
    const mine = balances.find((b) => b.userId === session.user.id);
    if (mine) {
      if (mine.net > 0) totalOwed += mine.net;
      else totalOwe += Math.abs(mine.net);
    }
    const debts = simplifyDebts(balances);
    debts.forEach((d) => {
      if (d.fromUserId === session.user.id) {
        allDebts.push({ name: d.toUserName, amount: d.amount, youOwe: true, groupName: g.name });
      } else if (d.toUserId === session.user.id) {
        allDebts.push({ name: d.fromUserName, amount: d.amount, youOwe: false, groupName: g.name });
      }
    });
  }

  const netBalance = totalOwed - totalOwe;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {session.user.name}!</p>
        </div>
        <Link
          href="/groups/new"
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          + New Group
        </Link>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className={`rounded-2xl p-6 text-white ${netBalance >= 0 ? "bg-gradient-to-br from-teal-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-rose-600"}`}>
          <p className="text-sm opacity-80 mb-1">Overall Balance</p>
          <p className="text-3xl font-bold">₹{Math.abs(netBalance).toFixed(2)}</p>
          <p className="text-sm opacity-80 mt-1">{netBalance >= 0 ? "you are owed" : "you owe"}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">You are owed</p>
          <p className="text-3xl font-bold text-green-600">₹{totalOwed.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">across {groups.length} group{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">You owe</p>
          <p className="text-3xl font-bold text-red-500">₹{totalOwe.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">across {groups.length} group{groups.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Individual Balance Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">Individual Balances</h2>
              <p className="text-xs text-gray-400 mt-0.5">Across all groups</p>
            </div>
            {allDebts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm text-gray-500 font-medium">All settled up!</p>
                <p className="text-xs text-gray-400 mt-1">No pending balances</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {allDebts.map((d, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{d.name}</p>
                      <p className="text-xs text-gray-400">{d.groupName}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${d.youOwe ? "text-red-500" : "text-green-600"}`}>
                        {d.youOwe ? `-₹${d.amount.toFixed(2)}` : `+₹${d.amount.toFixed(2)}`}
                      </p>
                      <p className="text-xs text-gray-400">{d.youOwe ? "you owe" : "owes you"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Groups List */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Your Groups ({groups.length})</h2>
            <Link href="/groups" className="text-sm text-teal-600 hover:underline">View all →</Link>
          </div>
          {groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-3xl mb-3">👥</p>
              <p className="text-gray-500 font-medium">No groups yet</p>
              <p className="text-gray-400 text-sm mt-1">Create a group to start splitting expenses</p>
              <Link href="/groups/new" className="mt-4 inline-block bg-teal-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-teal-600 transition">
                Create first group
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((g) => {
                const balances = calculateGroupBalances(g.expenses, g.settlements, g.members);
                const mine = balances.find((b) => b.userId === session.user.id);
                return (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-teal-100 transition group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold group-hover:bg-teal-100 transition">
                        {g.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{g.name}</p>
                        <p className="text-xs text-gray-400">{g.members.length} members · {g.expenses.length} expenses</p>
                      </div>
                    </div>
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      !mine || mine.net === 0 ? "bg-gray-50 text-gray-500" :
                      mine.net > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                    }`}>
                      {!mine || mine.net === 0 ? "✓ Settled up" :
                        mine.net > 0 ? `↑ Owed ₹${mine.net.toFixed(2)}` : `↓ Owe ₹${Math.abs(mine.net).toFixed(2)}`}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

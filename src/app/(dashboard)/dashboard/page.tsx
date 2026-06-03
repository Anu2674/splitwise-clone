import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGroupBalances } from "@/lib/balance";
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

  for (const g of groups) {
    const balances = calculateGroupBalances(g.expenses, g.settlements, g.members);
    const mine = balances.find((b) => b.userId === session.user.id);
    if (mine) {
      if (mine.net > 0) totalOwed += mine.net;
      else totalOwe += Math.abs(mine.net);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total balance</p>
          <p className={`text-2xl font-bold ${totalOwed - totalOwe >= 0 ? "text-green-600" : "text-red-500"}`}>
            ₹{Math.abs(totalOwed - totalOwe).toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{totalOwed - totalOwe >= 0 ? "you are owed" : "you owe"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">You are owed</p>
          <p className="text-2xl font-bold text-green-600">₹{totalOwed.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">across {groups.length} group{groups.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">You owe</p>
          <p className="text-2xl font-bold text-red-500">₹{totalOwe.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">across {groups.length} group{groups.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Groups</h2>
        <Link
          href="/groups/new"
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + New Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400 text-sm">No groups yet.</p>
          <Link href="/groups/new" className="mt-3 inline-block text-teal-600 font-medium text-sm hover:underline">
            Create your first group →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            const balances = calculateGroupBalances(g.expenses, g.settlements, g.members);
            const mine = balances.find((b) => b.userId === session.user.id);
            return (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                    {g.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.members.length} members</p>
                  </div>
                </div>
                {mine && (
                  <p className={`text-sm font-medium ${mine.net > 0 ? "text-green-600" : mine.net < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {mine.net > 0 ? `You are owed ₹${mine.net.toFixed(2)}` : mine.net < 0 ? `You owe ₹${Math.abs(mine.net).toFixed(2)}` : "Settled up"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

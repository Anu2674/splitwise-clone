import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { calculateGroupBalances, simplifyDebts } from "@/lib/balance";
import SettleDebtButton from "@/components/SettleDebtButton";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { id } = await params;

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });
  if (!member) notFound();

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      expenses: {
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: { include: { user: { select: { id: true, name: true } } } },
        },
        orderBy: { date: "desc" },
      },
      settlements: {
        include: {
          payer: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!group) notFound();

  const balances = calculateGroupBalances(group.expenses, group.settlements, group.members);
  const debts = simplifyDebts(balances);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/groups" className="hover:text-gray-600">Groups</Link>
            <span>/</span>
            <span className="text-gray-600">{group.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
        </div>
        <div className="flex gap-3">
          <Link
            href={`/expenses/new?groupId=${id}`}
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + Add Expense
          </Link>
          <Link
            href={`/groups/${id}/settings`}
            className="border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Members
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balances */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Balances</h2>
            <div className="space-y-3">
              {balances.map((b) => (
                <div key={b.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {b.userName[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">{b.userName}</span>
                  </div>
                  <span className={`text-sm font-semibold ${b.net > 0 ? "text-green-600" : b.net < 0 ? "text-red-500" : "text-gray-400"}`}>
                    {b.net > 0 ? `+₹${b.net.toFixed(2)}` : b.net < 0 ? `-₹${Math.abs(b.net).toFixed(2)}` : "Settled"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {debts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Who owes whom</h2>
              <div className="space-y-3">
                {debts.map((d, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">{d.fromUserName}</span> owes{" "}
                      <span className="font-medium">{d.toUserName}</span>
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-red-500 font-semibold">₹{d.amount.toFixed(2)}</span>
                      {d.fromUserId === session.user.id && (
                        <SettleDebtButton
                          groupId={id}
                          receiverId={d.toUserId}
                          receiverName={d.toUserName}
                          amount={d.amount}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent settlements */}
          {group.settlements.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Recent Settlements</h2>
              <div className="space-y-2">
                {group.settlements.slice(0, 5).map((s) => (
                  <p key={s.id} className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{s.payer.name}</span> paid{" "}
                    <span className="font-medium text-gray-700">{s.receiver.name}</span>{" "}
                    <span className="text-green-600 font-semibold">₹{s.amount.toFixed(2)}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Expenses ({group.expenses.length})</h2>
            </div>
            {group.expenses.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-400 text-sm">No expenses yet.</p>
                <Link href={`/expenses/new?groupId=${id}`} className="mt-2 inline-block text-teal-600 text-sm font-medium hover:underline">
                  Add first expense →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {group.expenses.map((exp) => {
                  const myShare = exp.splits.find((s) => s.userId === session.user.id);
                  const iPaid = exp.paidById === session.user.id;
                  return (
                    <Link
                      key={exp.id}
                      href={`/expenses/${exp.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition"
                    >
                      <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 text-sm font-bold shrink-0">
                        ₹
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{exp.description}</p>
                        <p className="text-xs text-gray-400">
                          Paid by {iPaid ? "you" : exp.paidBy.name} · {new Date(exp.date).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-gray-900">₹{exp.amount.toFixed(2)}</p>
                        {myShare && !iPaid && (
                          <p className="text-xs text-red-500">you owe ₹{myShare.amount.toFixed(2)}</p>
                        )}
                        {iPaid && myShare && (
                          <p className="text-xs text-green-600">you lent ₹{(exp.amount - myShare.amount).toFixed(2)}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

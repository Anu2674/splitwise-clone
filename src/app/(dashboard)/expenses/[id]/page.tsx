import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ChatBox from "@/components/ChatBox";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { id } = await params;

  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      paidBy: { select: { id: true, name: true, email: true } },
      splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      messages: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      group: { select: { id: true, name: true } },
    },
  });

  if (!expense) notFound();

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: expense.groupId, userId: session.user.id } },
  });
  if (!member) notFound();

  const splitTypeLabel: Record<string, string> = {
    equal: "Split equally",
    unequal: "Split unequally",
    percentage: "Split by percentage",
    share: "Split by shares",
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href={`/groups/${expense.group.id}`} className="hover:text-gray-600">{expense.group.name}</Link>
        <span>/</span>
        <span className="text-gray-600 truncate">{expense.description}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{expense.description}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Paid by <span className="font-medium text-gray-700">{expense.paidBy.name}</span> ·{" "}
            {new Date(expense.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">₹{expense.amount.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{splitTypeLabel[expense.splitType]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Splits */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Split Details</h2>
          <div className="space-y-3">
            {expense.splits.map((s) => {
              const isMe = s.userId === session.user.id;
              const isPayer = s.userId === expense.paidById;
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {s.user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {s.user.name} {isMe ? "(you)" : ""}
                      </p>
                      {isPayer && <p className="text-xs text-teal-600">paid</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isPayer && !isMe ? "text-green-600" : isMe && !isPayer ? "text-red-500" : "text-gray-700"}`}>
                      ₹{s.amount.toFixed(2)}
                    </p>
                    {expense.splitType === "percentage" && s.share != null && (
                      <p className="text-xs text-gray-400">{s.share}%</p>
                    )}
                    {expense.splitType === "share" && s.share != null && (
                      <p className="text-xs text-gray-400">{s.share} shares</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Chat <span className="text-xs text-gray-400 font-normal">(real-time)</span>
          </h2>
          <ChatBox
            expenseId={expense.id}
            currentUserId={session.user.id}
            initialMessages={JSON.parse(JSON.stringify(expense.messages))}
          />
        </div>
      </div>

      <div className="mt-5">
        <Link href={`/groups/${expense.group.id}`} className="text-sm text-teal-600 hover:underline">
          ← Back to {expense.group.name}
        </Link>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { expenses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <Link
          href="/groups/new"
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + New Group
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-400">No groups yet. Create one to start splitting!</p>
          <Link href="/groups/new" className="mt-3 inline-block text-teal-600 font-medium text-sm hover:underline">
            Create a group →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition"
            >
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                {g.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{g.name}</p>
                {g.description && <p className="text-xs text-gray-400 truncate">{g.description}</p>}
              </div>
              <div className="text-right text-xs text-gray-400">
                <p>{g.members.length} members</p>
                <p>{g._count.expenses} expenses</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

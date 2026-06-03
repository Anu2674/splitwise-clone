import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGroupBalances, simplifyDebts } from "@/lib/balance";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      expenses: { include: { splits: true } },
      settlements: true,
    },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balances = calculateGroupBalances(group.expenses, group.settlements, group.members);
  const debts = simplifyDebts(balances);

  return NextResponse.json({ balances, debts });
}

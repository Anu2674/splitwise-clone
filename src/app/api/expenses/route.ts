import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SplitType, SplitInput } from "@/types";

function computeSplits(
  type: SplitType,
  totalAmount: number,
  inputs: SplitInput[]
): { userId: string; amount: number }[] {
  if (type === "equal") {
    const each = Math.round((totalAmount / inputs.length) * 100) / 100;
    return inputs.map((s) => ({ userId: s.userId, amount: each }));
  }

  if (type === "unequal") {
    return inputs.map((s) => ({ userId: s.userId, amount: s.value }));
  }

  if (type === "percentage") {
    return inputs.map((s) => ({
      userId: s.userId,
      amount: Math.round((totalAmount * s.value) / 100 * 100) / 100,
    }));
  }

  // share
  const totalShares = inputs.reduce((sum, s) => sum + s.value, 0);
  return inputs.map((s) => ({
    userId: s.userId,
    amount: Math.round((totalAmount * (s.value / totalShares)) * 100) / 100,
  }));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, description, amount, splitType, splits, date } = await req.json();

  if (!groupId || !description || !amount || !splitType || !splits?.length)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const computedSplits = computeSplits(splitType, amount, splits);

  const expense = await prisma.expense.create({
    data: {
      groupId,
      paidById: session.user.id,
      description,
      amount,
      splitType,
      date: date ? new Date(date) : new Date(),
      splits: { create: computedSplits },
    },
    include: {
      paidBy: { select: { id: true, name: true, email: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(expense, { status: 201 });
}

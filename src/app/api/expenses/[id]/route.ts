import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SplitType, SplitInput } from "@/types";

function computeSplits(type: SplitType, totalAmount: number, inputs: SplitInput[]) {
  if (type === "equal") {
    const each = Math.round((totalAmount / inputs.length) * 100) / 100;
    return inputs.map((s) => ({ userId: s.userId, amount: each }));
  }
  if (type === "unequal") return inputs.map((s) => ({ userId: s.userId, amount: s.value }));
  if (type === "percentage") return inputs.map((s) => ({ userId: s.userId, amount: Math.round((totalAmount * s.value) / 100 * 100) / 100 }));
  const totalShares = inputs.reduce((sum, s) => sum + s.value, 0);
  return inputs.map((s) => ({ userId: s.userId, amount: Math.round((totalAmount * (s.value / totalShares)) * 100) / 100 }));
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      paidBy: { select: { id: true, name: true, email: true } },
      splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      messages: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      group: { select: { id: true, name: true } },
    },
  });

  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: expense.groupId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(expense);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (expense.paidById !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { description, amount, splitType, splits } = await req.json();
  const computedSplits = computeSplits(splitType, amount, splits);

  await prisma.expenseSplit.deleteMany({ where: { expenseId: id } });

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      description,
      amount,
      splitType,
      splits: { create: computedSplits },
    },
    include: {
      paidBy: { select: { id: true, name: true, email: true } },
      splits: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (expense.paidById !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

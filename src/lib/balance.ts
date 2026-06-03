export interface BalanceEntry {
  userId: string;
  userName: string;
  userEmail: string;
  net: number; // positive = others owe you, negative = you owe others
}

export interface DebtEntry {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
}

export function calculateGroupBalances(
  expenses: {
    paidById: string;
    amount: number;
    splits: { userId: string; amount: number }[];
  }[],
  settlements: { payerId: string; receiverId: string; amount: number }[],
  members: { userId: string; user: { id: string; name: string; email: string } }[]
): BalanceEntry[] {
  const balanceMap: Record<string, number> = {};
  members.forEach((m) => (balanceMap[m.userId] = 0));

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.userId === expense.paidById) continue;
      balanceMap[expense.paidById] = (balanceMap[expense.paidById] || 0) + split.amount;
      balanceMap[split.userId] = (balanceMap[split.userId] || 0) - split.amount;
    }
  }

  for (const s of settlements) {
    balanceMap[s.payerId] = (balanceMap[s.payerId] || 0) + s.amount;
    balanceMap[s.receiverId] = (balanceMap[s.receiverId] || 0) - s.amount;
  }

  return members.map((m) => ({
    userId: m.userId,
    userName: m.user.name,
    userEmail: m.user.email,
    net: Math.round((balanceMap[m.userId] || 0) * 100) / 100,
  }));
}

export function simplifyDebts(balances: BalanceEntry[]): DebtEntry[] {
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ ...b }));
  const debts: DebtEntry[] = [];

  let i = 0,
    j = 0;
  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const amount = Math.min(credit.net, -debt.net);

    if (amount > 0.01) {
      debts.push({
        fromUserId: debt.userId,
        fromUserName: debt.userName,
        toUserId: credit.userId,
        toUserName: credit.userName,
        amount: Math.round(amount * 100) / 100,
      });
    }

    credit.net -= amount;
    debt.net += amount;

    if (Math.abs(credit.net) < 0.01) i++;
    if (Math.abs(debt.net) < 0.01) j++;
  }

  return debts;
}

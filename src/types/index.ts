import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
    };
  }
}

export type SplitType = "equal" | "unequal" | "percentage" | "share";

export interface SplitInput {
  userId: string;
  value: number; // amount / percentage / shares depending on type
}

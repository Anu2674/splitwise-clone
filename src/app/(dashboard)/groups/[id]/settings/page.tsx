"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Group {
  id: string;
  name: string;
  members: Member[];
}

export default function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadGroup() {
    const res = await fetch(`/api/groups/${id}`);
    if (res.ok) setGroup(await res.json());
  }

  useEffect(() => { loadGroup(); }, [id]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const res = await fetch(`/api/groups/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setError(data.error || "Failed to add member");
    else { setSuccess(`${data.user.name} added!`); setEmail(""); loadGroup(); }
  }

  async function removeMember(userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from the group?`)) return;
    const res = await fetch(`/api/groups/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) loadGroup();
  }

  if (!group) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/groups" className="hover:text-gray-600">Groups</Link>
        <span>/</span>
        <Link href={`/groups/${id}`} className="hover:text-gray-600">{group.name}</Link>
        <span>/</span>
        <span className="text-gray-600">Members</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manage Members</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="font-semibold text-gray-900 mb-4">Add Member by Email</h2>
        <form onSubmit={addMember} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add"}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Current Members ({group.members.length})</h2>
        <div className="space-y-3">
          {group.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {m.user.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                  <p className="text-xs text-gray-400">{m.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === "admin" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>
                  {m.role}
                </span>
                {m.role !== "admin" && (
                  <button
                    onClick={() => removeMember(m.userId, m.user.name)}
                    className="text-xs text-red-400 hover:text-red-600 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Link href={`/groups/${id}`} className="text-sm text-teal-600 hover:underline">← Back to group</Link>
      </div>
    </div>
  );
}

import { ArrowLeft, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AdminUser } from '../types';
import { movieDiaryApi } from '../api/movieDiaryApi';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const data = await movieDiaryApi.getUsers();
        if (isMounted) {
          setUsers(data);
          setError(null);
        }
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load users.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen p-8 text-[#B9A5D2]" style={{ backgroundColor: '#261834' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center text-[#B9A5D2] transition-colors hover:text-[#E0BAAA]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Diary
        </button>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-[#E0BAAA]" />
            <div>
              <h1 className="text-4xl font-bold">Admin Dashboard</h1>
              <p className="text-sm opacity-80">Users, roles, and permissions</p>
            </div>
          </div>
          <span className="rounded-md border border-[#E0BAAA] px-3 py-1 text-sm text-[#E0BAAA]">
            Admin
          </span>
        </div>

        {isLoading && (
          <div className="rounded-lg bg-[#223662] p-6">Loading users...</div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-500/60 bg-red-900/80 p-4 text-red-100">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          <div className="overflow-hidden rounded-lg bg-[#223662]">
            <table className="w-full border-collapse text-left">
              <thead>
              <tr className="border-b border-[#B9A5D2]/20">
                <th className="p-4 text-[#E0BAAA]">User</th>
                <th className="p-4 text-[#E0BAAA]">Role</th>
                <th className="p-4 text-[#E0BAAA]">Movies</th>
                <th className="p-4 text-[#E0BAAA]">Lists</th>
                <th className="p-4 text-[#E0BAAA]">Permissions</th>
              </tr>
              </thead>
              <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#B9A5D2]/10">
                  <td className="p-4">
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-sm opacity-75">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="rounded border border-[#B9A5D2]/40 px-2 py-1 text-sm">{user.role}</span>
                  </td>
                  <td className="p-4">{user.movieCount}</td>
                  <td className="p-4">{user.listCount}</td>
                  <td className="p-4 text-sm opacity-90">{user.permissions.join(', ')}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="p-8 text-center opacity-70" colSpan={5}>No users found.</td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

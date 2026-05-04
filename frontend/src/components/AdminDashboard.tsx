import { ArrowLeft, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AdminUser, SuspiciousObservation } from '../types';
import { movieDiaryApi } from '../api/movieDiaryApi';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousObservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [updatingObservationId, setUpdatingObservationId] = useState<string | null>(null);
  const [showClearedObservations, setShowClearedObservations] = useState(false);
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const [data, suspiciousData] = await Promise.all([
          movieDiaryApi.getUsers(),
          movieDiaryApi.getSuspiciousUsers(),
        ]);
        if (isMounted) {
          setUsers(data);
          setSuspiciousUsers(suspiciousData);
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

  async function handleDeleteUser(user: AdminUser) {
    const confirmation = window.confirm(
      `Delete ${user.email}? This also removes all movies, frames, and lists owned by this user.`,
    );

    if (!confirmation) {
      return;
    }

    setDeletingUserId(user.id);
    setError(null);

    try {
      await movieDiaryApi.deleteUser(user.id);
      setUsers((previousUsers) => previousUsers.filter((existingUser) => existingUser.id !== user.id));
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete user.');
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleMarkReviewed(observationId: string) {
    setUpdatingObservationId(observationId);
    setError(null);

    try {
      const updated = await movieDiaryApi.markSuspiciousUserReviewed(observationId);
      setSuspiciousUsers((previous) => previous.map((entry) => (
        entry.id === observationId ? updated : entry
      )));
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update suspicious observation.');
    } finally {
      setUpdatingObservationId(null);
    }
  }

  async function handleClearObservation(observationId: string) {
    setUpdatingObservationId(observationId);
    setError(null);

    try {
      const updated = await movieDiaryApi.clearSuspiciousUser(observationId);
      setSuspiciousUsers((previous) => previous.map((entry) => (
        entry.id === observationId ? updated : entry
      )));
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update suspicious observation.');
    } finally {
      setUpdatingObservationId(null);
    }
  }

  const visibleSuspiciousUsers = suspiciousUsers.filter((entry) => showClearedObservations || entry.status !== 'CLEARED');

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
          <div className="space-y-6">
            <section className="overflow-hidden rounded-lg bg-[#223662]">
              <div className="border-b border-[#B9A5D2]/20 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[#E0BAAA]">Suspicious Activity Observation List</h2>
                    <p className="text-sm opacity-80">Flagged users detected from audit-log activity.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showClearedObservations}
                      onChange={(event) => setShowClearedObservations(event.target.checked)}
                    />
                    Show cleared
                  </label>
                </div>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                <tr className="border-b border-[#B9A5D2]/20">
                  <th className="p-4 text-[#E0BAAA]">User</th>
                  <th className="p-4 text-[#E0BAAA]">Role</th>
                  <th className="p-4 text-[#E0BAAA]">Reason</th>
                  <th className="p-4 text-[#E0BAAA]">Score</th>
                  <th className="p-4 text-[#E0BAAA]">Status</th>
                  <th className="p-4 text-[#E0BAAA]">Last Detected</th>
                  <th className="p-4 text-[#E0BAAA]">Actions</th>
                </tr>
                </thead>
                <tbody>
                {visibleSuspiciousUsers.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#B9A5D2]/10">
                    <td className="p-4">
                      <div className="font-semibold">{entry.userName}</div>
                      <div className="text-sm opacity-75">{entry.userEmail}</div>
                    </td>
                    <td className="p-4">{entry.role}</td>
                    <td className="p-4 text-sm">{entry.reason}</td>
                    <td className="p-4">{entry.score}</td>
                    <td className="p-4">
                      <span className="rounded border border-amber-400/60 px-2 py-1 text-sm text-amber-200">
                        {entry.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm opacity-80">{new Date(entry.lastDetectedAt).toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {entry.status === 'OBSERVED' && (
                          <button
                            type="button"
                            onClick={() => void handleMarkReviewed(entry.id)}
                            disabled={updatingObservationId === entry.id}
                            className="rounded border border-[#E0BAAA]/70 px-3 py-1 text-sm text-[#E0BAAA] transition-colors hover:bg-[#E0BAAA]/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingObservationId === entry.id ? 'Updating...' : 'Mark reviewed'}
                          </button>
                        )}
                        {entry.status !== 'CLEARED' && (
                          <button
                            type="button"
                            onClick={() => void handleClearObservation(entry.id)}
                            disabled={updatingObservationId === entry.id}
                            className="rounded border border-emerald-400/70 px-3 py-1 text-sm text-emerald-200 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingObservationId === entry.id ? 'Updating...' : 'Clear'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleSuspiciousUsers.length === 0 && (
                  <tr>
                    <td className="p-8 text-center opacity-70" colSpan={7}>No suspicious users flagged.</td>
                  </tr>
                )}
                </tbody>
              </table>
            </section>

            <div className="overflow-hidden rounded-lg bg-[#223662]">
              <table className="w-full border-collapse text-left">
                <thead>
                <tr className="border-b border-[#B9A5D2]/20">
                  <th className="p-4 text-[#E0BAAA]">User</th>
                  <th className="p-4 text-[#E0BAAA]">Role</th>
                  <th className="p-4 text-[#E0BAAA]">Movies</th>
                  <th className="p-4 text-[#E0BAAA]">Lists</th>
                  <th className="p-4 text-[#E0BAAA]">Permissions</th>
                  <th className="p-4 text-[#E0BAAA]">Actions</th>
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
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => void handleDeleteUser(user)}
                        disabled={deletingUserId === user.id || user.id === currentUserId}
                        className="rounded border border-red-500/70 px-3 py-1 text-sm text-red-200 transition-colors hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="p-8 text-center opacity-70" colSpan={6}>No users found.</td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

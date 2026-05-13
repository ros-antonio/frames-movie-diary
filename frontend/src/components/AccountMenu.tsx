import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AccountMenuProps {
  email?: string;
  name?: string;
  role: string;
  onSecurity?: () => void;
  onLogout: () => void;
}

export function AccountMenu({ email, name, role, onSecurity, onLogout }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setIsOpen((current) => !current)}
        className="btn-press flex min-h-[42px] items-center gap-2 rounded-md border border-[#B9A5D2]/25 bg-[#1E2F57]/70 px-4 py-2 text-left text-[15px] text-[#C8B9DE] transition-colors hover:border-[#E0BAAA]/35 hover:bg-[#28406F]/80 hover:text-[#F0E8FA]"
      >
        <UserRound className="h-4 w-4 shrink-0 text-[#E0BAAA]/90" />
        <span className="block max-w-32 truncate font-medium">{name ?? email ?? 'Account'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#E0BAAA]/80 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[#B9A5D2]/20 bg-[#162341] p-4 text-[#E9E2F5] shadow-xl"
        >
          <div className="mb-4 border-b border-[#B9A5D2]/15 pb-4">
            <p className="text-base font-semibold">{name ?? 'Signed-in user'}</p>
            <p className="mt-1 break-all text-sm opacity-80">{email ?? 'Email unavailable'}</p>
            <span className="mt-3 inline-flex rounded-md border border-[#E0BAAA]/35 px-2 py-1 text-[11px] font-medium tracking-[0.16em] text-[#E0BAAA]">
              {role}
            </span>
          </div>

          {onSecurity ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onSecurity();
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-md border border-[#E0BAAA]/30 px-3 py-2 text-left text-sm text-[#F0E8FA] transition-colors hover:bg-[#E0BAAA]/10"
            >
              <UserRound className="h-4 w-4" />
              Security center
            </button>
          ) : null}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-md border border-red-400/35 px-3 py-2 text-left text-sm text-red-100 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

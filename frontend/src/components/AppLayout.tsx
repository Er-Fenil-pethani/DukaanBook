import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Tag,
  Receipt,
  Settings,
  ClipboardList,
  LogOut,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/authStore';
import { useBusiness } from '@/stores/businessStore';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import toast from 'react-hot-toast';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['OWNER'],
      },
      {
        to: '/sales',
        label: 'Sales',
        icon: Receipt,
        roles: ['OWNER', 'CASHIER'],
      },
    ],
  },
  {
    heading: 'Operations',
    items: [
      {
        to: '/pos',
        label: 'POS Counter',
        icon: ShoppingCart,
        roles: ['OWNER', 'CASHIER'],
      },
      {
        to: '/products',
        label: 'Products',
        icon: Package,
        roles: ['OWNER'],
      },
      {
        to: '/categories',
        label: 'Categories',
        icon: Tag,
        roles: ['OWNER'],
      },
    ],
  },
  {
    heading: 'Management',
    items: [
      {
        to: '/staff',
        label: 'Staff',
        icon: Users,
        roles: ['OWNER'],
      },
      {
        to: '/business',
        label: 'Business',
        icon: Settings,
        roles: ['OWNER'],
      },
      {
        to: '/audit-logs',
        label: 'Audit Logs',
        icon: ClipboardList,
        roles: ['OWNER'],
      },
    ],
  },
];

export default function AppLayout() {
  const { user, clear } = useAuth();
  const business = useBusiness((state) => state.business);
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return null;
  }

  const role = user.role;

  const logout = () => {
    clear();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex">
      <aside className="w-60 shrink-0 bg-card border-r border-border flex flex-col h-full">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2.5 shrink-0">
          <div className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src="/dukaanbook-logo.png"
              alt="DukaanBook"
              className="h-9 w-9 rounded-lg object-cover"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="font-semibold leading-tight truncate">
              {business?.name ?? 'DukaanBook'}
            </span>

            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {role}
            </span>
          </div>
        </div>

        <nav className="flex-1 min-h-0 px-3 py-4 space-y-5 overflow-y-auto">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) =>
              item.roles.includes(role)
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div key={section.heading}>
                <h3 className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                  {section.heading}
                </h3>

                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              'absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full transition-all duration-200',
                              isActive ? 'bg-primary' : 'bg-transparent'
                            )}
                          />

                          <item.icon
                            className={cn(
                              'h-4 w-4 transition-colors',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground group-hover:text-foreground'
                            )}
                            strokeWidth={2}
                          />

                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-border text-[10px] text-muted-foreground font-mono uppercase tracking-wider shrink-0">
          v1.0
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-14 shrink-0 bg-card/60 backdrop-blur-sm border-b border-border flex items-center justify-between gap-4 px-6 z-30">
          <div className="text-sm text-muted-foreground hidden md:block">
            Welcome back,{' '}
            <span className="text-foreground font-medium">
              {user.name}
            </span>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <ThemeToggle />

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMenuOpen((current) => !current)}
                className="gap-2 h-9"
              >
                <span className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold ring-1 ring-primary/30">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>

                <span className="text-sm hidden xl:inline">
                  {user.email}
                </span>

                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden animate-fade-in">
                    <div className="px-3 py-2.5 border-b border-border">
                      <p className="text-sm font-medium truncate">
                        {user.name}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
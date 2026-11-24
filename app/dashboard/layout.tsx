"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getTodayStr } from "@/lib/date";
import FeedbackButton from "@/components/FeedbackButton";

/**
 * 새 메뉴 강조 배지. 이 날짜(KST)까지는 눌러봤든 아니든 계속 떠 있고, 지나면 사라진다.
 * 기간을 두는 이유: 몇 달 지난 기능에 "NEW"가 계속 붙어 있으면 배지 자체를 무시하게 된다.
 */
const NEW_BADGE_UNTIL = "20260930";

type MenuId = "home" | "quiz" | "chart" | "disclosure" | "data" | "watchlist" | "overview" | "settings" | "admin";

const menuItems: { id: MenuId; label: string; href: string; icon: React.ReactNode; adminOnly?: boolean; isNew?: boolean }[] = [
  {
    // 날짜별 종목 목록. 예전의 "시장 공부하기" 화면이 지금의 홈이다
    id: "home",
    label: "홈",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    // 예전의 "매일 퀴즈". 주소(/dashboard/quiz)는 그대로 둔다
    id: "quiz",
    label: "시장 공부하기",
    href: "/dashboard/quiz",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "chart",
    label: "차트",
    href: "/dashboard/chart",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20h16M7 16V9m0 0V6m0 3h0M12 14V5m5 12v-6" />
      </svg>
    ),
  },
  {
    id: "disclosure",
    label: "공시",
    href: "/dashboard/disclosure",
    // 아직 다듬는 중이라 관리자(개발자) 계정에만 보인다
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "data",
    label: "수집 데이터",
    href: "/dashboard/data",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
  },
  {
    id: "watchlist",
    label: "관심종목",
    href: "/dashboard/watchlist",
    isNew: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    // 예전 홈(상승이유 기여 현황). 운영자용이라 관리자에게만 보인다
    id: "overview",
    label: "기여 현황",
    href: "/dashboard/overview",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h4v4H4zM10 5h4v4h-4zM16 5h4v4h-4zM4 11h4v4H4zM10 11h4v4h-4zM16 11h4v4h-4zM4 17h4v2H4zM10 17h4v2h-4z" />
      </svg>
    ),
  },
  {
    id: "admin",
    label: "관리",
    href: "/dashboard/admin",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

/**
 * 신규 기능 안내 말풍선. 배지는 메뉴 안에 묻혀 잘 안 보여서 말풍선으로 띄웠다.
 * - "row"(데스크톱 사이드바): 해당 메뉴 줄 안 오른쪽에 붙여 왼쪽을 가리킨다.
 *   위로 띄우면 바로 윗 메뉴 위에 겹쳐서 어느 메뉴를 가리키는지 헷갈린다.
 * - "center"(모바일 하단 탭): 탭 위로 떠서 아래를 가리킨다.
 * pointer-events-none — 어떤 경우에도 탭을 가로막지 않는다.
 */
function NewFeatureTip({ align }: { align: "center" | "row" }) {
  if (align === "row") {
    return (
      <span className="pointer-events-none absolute right-2 top-1/2 z-20 -translate-y-1/2">
        <span className="animate-new-tip-x relative block whitespace-nowrap rounded-full bg-primary px-2 py-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-primary/30">
          새로운 기능
          <span className="absolute right-full top-1/2 -mr-1 -mt-1 h-2 w-2 rotate-45 bg-primary" />
        </span>
      </span>
    );
  }

  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2">
      <span className="animate-new-tip relative block whitespace-nowrap rounded-full bg-primary px-2 py-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-primary/30">
        새로운 기능
        <span className="absolute left-1/2 top-full -ml-1 -mt-1 h-2 w-2 rotate-45 bg-primary" />
      </span>
    </span>
  );
}

function getActiveMenu(pathname: string): MenuId {
  if (pathname.startsWith("/dashboard/chart")) return "chart";
  if (pathname.startsWith("/dashboard/overview")) return "overview";
  if (pathname.startsWith("/dashboard/quiz")) return "quiz";
  if (pathname.startsWith("/dashboard/disclosure")) return "disclosure";
  if (pathname.startsWith("/dashboard/data")) return "data";
  if (pathname.startsWith("/dashboard/watchlist")) return "watchlist";
  if (pathname.startsWith("/dashboard/settings")) return "settings";
  if (pathname.startsWith("/dashboard/admin")) return "admin";
  return "home";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const activeMenu = getActiveMenu(pathname);

  const [resultsCount, setResultsCount] = useState(0);
  // 날짜 판정은 마운트 후에 한다 — 서버와 브라우저의 시각이 갈리는 순간에도 hydration이 어긋나지 않는다
  const [newBadges, setNewBadges] = useState<MenuId[]>([]);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (getTodayStr() > NEW_BADGE_UNTIL) return;
    setNewBadges(
      menuItems.filter((item) => item.isNew).map((item) => item.id)
    );
  }, []);

  useEffect(() => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setResultsCount(data.results?.length ?? 0);
      })
      .catch(() => {});
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setUnreadCount(
            (data.notifications ?? []).filter((n: { read: boolean }) => !n.read).length
          );
        }
      })
      .catch(() => {});
  }, [session?.user]);

  const userName = session?.user?.name ?? session?.user?.email ?? "사용자";
  const userInitial = userName.charAt(0).toUpperCase();

  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || session?.user?.role === "admin"
  );

  const [myOpen, setMyOpen] = useState(false);
  const handleSignOut = async () => {
                  // End this browser subscription before changing accounts.
                  try {
                    if ("serviceWorker" in navigator) {
                      const registration = await navigator.serviceWorker.getRegistration("/");
                      const subscription = await registration?.pushManager?.getSubscription();
                      if (subscription) {
                        await Promise.allSettled([
                          fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }), signal: AbortSignal.timeout(5000) }),
                          subscription.unsubscribe(),
                        ]);
                      }
                    }
                  }
                  finally { await signOut(); }
                };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Desktop only */}
        <aside className="hidden md:flex w-60 border-r border-border flex-col flex-shrink-0">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-base text-foreground/90 font-medium">주식 조건검색</span>
          </div>
          <nav className="flex-1 px-3 pt-1 space-y-0.5">
            {visibleMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  activeMenu === item.id
                    ? "bg-accent text-primary-hover font-medium"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {item.icon}
                {item.label}
                {newBadges.includes(item.id) && <NewFeatureTip align="row" />}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-border/60">
            <div className="text-xs text-muted-foreground/80 mb-1">저장된 목록</div>
            <div className="text-sm text-foreground/80">{resultsCount}개 결과 저장됨</div>
          </div>

          {/* 예전 상단 헤더의 프로필 메뉴 — 헤더를 없애면서 사이드바 맨 아래로 옮겼다 */}
          {session?.user && (
            <div className="relative p-3 border-t border-border/60" ref={profileMenuRef}>
              <button
                onClick={() => setProfileOpen((v) => !v)}
                aria-label="프로필 메뉴"
                aria-expanded={profileOpen}
                className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted transition-colors"
              >
                <span className="relative w-8 h-8 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                  {userInitial}
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-sm text-foreground/90">{userName}</span>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0.85, y: 8 }}
                    animate={{ opacity: 1, scaleY: 1, y: 0 }}
                    exit={{ opacity: 0, scaleY: 0.85, y: 8 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    style={{ transformOrigin: "bottom left" }}
                    className="absolute left-3 right-3 bottom-full mb-1 bg-background rounded-xl shadow-lg border border-border/60 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border/60">
                      <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                      {session.user.email && (
                        <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{session.user.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        router.push("/dashboard/notifications");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/90 hover:bg-muted/50 transition-colors"
                    >
                      알림
                      {unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-destructive rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        router.push("/dashboard/settings");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground/90 hover:bg-muted/50 transition-colors"
                    >
                      설정
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground border-t border-border/60 hover:bg-muted/50 transition-colors"
                    >
                      로그아웃
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </main>
      </div>

      {/* 의견 보내기 — 모든 대시보드 화면에 떠 있는 작은 버튼 */}
      {session?.user && <FeedbackButton />}

      {/* 하단 메뉴 — 모바일 전용. 화면 위에 떠 있는 알약 모양 */}
      {myOpen && (
        <button
          type="button"
          aria-label="내 메뉴 닫기"
          className="md:hidden fixed inset-0 z-40 cursor-default"
          onClick={() => setMyOpen(false)}
        />
      )}
      <nav
        aria-label="주 메뉴"
        className="md:hidden fixed left-3 right-3 z-50 flex items-center gap-0.5 rounded-full border border-border/70 bg-background/85 p-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.16)] backdrop-blur-xl"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.625rem)" }}
      >
        {visibleMenuItems.map((item) => {
          const on = activeMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => {
                setMyOpen(false);
                router.push(item.href);
              }}
              className={`relative flex h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors ${
                on ? "bg-primary/10 text-primary" : "text-foreground/70"
              }`}
            >
              {item.icon}
              {newBadges.includes(item.id) && <NewFeatureTip align="center" />}
              <span className={`max-w-full truncate px-1 text-[10px] leading-tight ${on ? "font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {session?.user && (
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              aria-label="내 메뉴"
              aria-expanded={myOpen}
              onClick={() => setMyOpen((v) => !v)}
              className={`flex h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-full transition-colors ${
                myOpen || activeMenu === "settings" ? "bg-primary/10 text-primary" : "text-foreground/70"
              }`}
            >
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
                {userInitial}
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive" />
                )}
              </span>
              <span className={`text-[10px] leading-tight ${myOpen || activeMenu === "settings" ? "font-bold" : "font-medium"}`}>MY</span>
            </button>
            {myOpen && (
              <div className="absolute bottom-full right-0 mb-3 w-52 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-lg">
                <p className="truncate border-b border-border/60 px-4 py-3 text-sm font-medium text-foreground">{userName}</p>
                <button
                  type="button"
                  onClick={() => {
                    setMyOpen(false);
                    router.push("/dashboard/notifications");
                  }}
                  className="flex h-12 w-full items-center px-4 text-sm text-foreground/90 hover:bg-muted/50"
                >
                  알림
                  {unreadCount > 0 && (
                    <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMyOpen(false);
                    router.push("/dashboard/settings");
                  }}
                  className="flex h-12 w-full items-center px-4 text-sm text-foreground/90 hover:bg-muted/50"
                >
                  설정
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex h-12 w-full items-center border-t border-border/60 px-4 text-sm text-muted-foreground hover:bg-muted/50"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}

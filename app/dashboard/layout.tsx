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

type MenuId = "home" | "history" | "quiz" | "disclosure" | "data" | "watchlist" | "settings" | "admin";

const menuItems: { id: MenuId; label: string; href: string; icon: React.ReactNode; adminOnly?: boolean; isNew?: boolean }[] = [
  {
    id: "home",
    label: "홈",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "시장 공부하기",
    href: "/dashboard/history",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    id: "quiz",
    label: "매일 퀴즈",
    href: "/dashboard/quiz",
    isNew: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "disclosure",
    label: "공시",
    href: "/dashboard/disclosure",
    isNew: true,
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
        <span className="animate-new-tip-x relative block whitespace-nowrap rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-indigo-600/30">
          새로운 기능
          <span className="absolute right-full top-1/2 -mr-1 -mt-1 h-2 w-2 rotate-45 bg-indigo-600" />
        </span>
      </span>
    );
  }

  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2">
      <span className="animate-new-tip relative block whitespace-nowrap rounded-full bg-indigo-600 px-2 py-1 text-[10px] font-bold leading-none text-white shadow-lg shadow-indigo-600/30">
        새로운 기능
        <span className="absolute left-1/2 top-full -ml-1 -mt-1 h-2 w-2 rotate-45 bg-indigo-600" />
      </span>
    </span>
  );
}

function getActiveMenu(pathname: string): MenuId {
  if (pathname.startsWith("/dashboard/history")) return "history";
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

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Header */}
      <header className="h-14 md:h-16 border-b border-gray-200 flex items-center justify-between px-3 md:px-4 flex-shrink-0">
        <div className="flex items-center gap-3 md:gap-4 flex-1">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-lg text-gray-700 font-medium hidden md:block">주식 조건검색</span>
          </div>
          <div className="flex-1 max-w-2xl hidden sm:block">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="종목명 또는 키워드 검색"
                className="w-full pl-10 pr-4 h-11 bg-gray-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-2 md:ml-4">
          {session?.user && (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-sm text-gray-600 hidden md:block">{userName}</span>
              <button
                onClick={() => signOut()}
                className="px-2 md:px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="프로필 메뉴"
                  aria-expanded={profileOpen}
                  className="relative w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
                >
                  {userInitial}
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                  )}
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0.85, y: -8 }}
                      animate={{ opacity: 1, scaleY: 1, y: 0 }}
                      exit={{ opacity: 0, scaleY: 0.85, y: -8 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      style={{ transformOrigin: "top right" }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                        {session?.user?.email && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{session.user.email}</p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          router.push("/dashboard/notifications");
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        알림
                        {unreadCount > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-500 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          router.push("/dashboard/settings");
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        설정
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — Desktop only */}
        <aside className="hidden md:flex w-60 border-r border-gray-200 flex-col flex-shrink-0">
          <nav className="flex-1 px-3 pt-3 space-y-0.5">
            {visibleMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  activeMenu === item.id
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}
                {item.label}
                {newBadges.includes(item.id) && <NewFeatureTip align="row" />}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-1">시장 공부하기</div>
            <div className="text-sm text-gray-600">{resultsCount}개 결과 저장됨</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* 의견 보내기 — 모든 대시보드 화면에 떠 있는 작은 버튼 */}
      {session?.user && <FeedbackButton />}

      {/* Bottom Tab Bar — Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-1 z-50 safe-area-bottom">
        {visibleMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(item.href)}
            className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-[56px] transition-colors ${
              activeMenu === item.id
                ? "text-indigo-600"
                : "text-gray-400"
            }`}
          >
            <span className={activeMenu === item.id ? "text-indigo-600" : "text-gray-400"}>
              {item.icon}
            </span>
            {newBadges.includes(item.id) && <NewFeatureTip align="center" />}
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

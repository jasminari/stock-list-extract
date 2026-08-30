import Link from "next/link";

export default function ComingSoonNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
        <Link
          href="/"
          className="text-lg font-extrabold tracking-tight text-gray-900 md:text-[19px]"
        >
          StockExtract
        </Link>

        <div className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
          <a href="#screens" className="transition-colors hover:text-gray-900">
            화면 미리보기
          </a>
          <a href="#features" className="transition-colors hover:text-gray-900">
            기능
          </a>
          <a href="#roadmap" className="transition-colors hover:text-gray-900">
            출시 계획
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm text-gray-600 transition-colors hover:text-gray-900 sm:block"
          >
            로그인
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
          >
            체험하기
          </Link>
        </div>
      </div>
    </nav>
  );
}

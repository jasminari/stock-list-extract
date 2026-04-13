"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex">
      {/* 왼쪽 - 로그인 폼 */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white">
        <div className="px-8 py-6">
          <Link href="/" className="text-lg font-bold text-gray-900 tracking-tight">
            StockExtract
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              다시 만나서 반가워요!
            </h1>
            <Link
              href="/register"
              className="text-sm text-blue-600 hover:underline"
            >
              처음이신가요? 가입하기
            </Link>

            {error && (
              <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  아이디
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="아이디 입력"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors pr-12"
                    placeholder="비밀번호 입력"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 오른쪽 - 소개 영역 */}
      <div className="hidden lg:flex w-1/2 bg-gray-50 flex-col items-center justify-center px-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center leading-relaxed">
          조건검색 결과를 자동으로 정리하고
          <br />
          팀원과 함께 분석하세요.
        </h2>

        {/* 미리보기 카드 */}
        <div className="mt-10 w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="ml-2 text-[11px] text-gray-400">가공 뷰</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="py-2 text-left font-medium">종목명</th>
                <th className="py-2 text-left font-medium">키워드</th>
                <th className="py-2 text-right font-medium">거래대금</th>
                <th className="py-2 text-right font-medium">등락률</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-50">
                <td className="py-2 font-medium">삼성전자</td>
                <td className="py-2 text-blue-500">반도체</td>
                <td className="py-2 text-right">
                  <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-[11px]">3,200억</span>
                </td>
                <td className="py-2 text-right text-red-500">+5.2%</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 font-medium">SK하이닉스</td>
                <td className="py-2 text-blue-500">HBM</td>
                <td className="py-2 text-right">
                  <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-[11px]">2,800억</span>
                </td>
                <td className="py-2 text-right text-red-500 font-bold">+18.3%</td>
              </tr>
              <tr>
                <td className="py-2 font-medium">에코프로</td>
                <td className="py-2 text-blue-500">2차전지</td>
                <td className="py-2 text-right text-gray-600">1,500억</td>
                <td className="py-2 text-right">+7.1%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-gray-400 text-center">
          거래대금 자동 정렬 · 등락률 컬러코딩 · 키워드 메모
        </p>
      </div>
    </main>
  );
}

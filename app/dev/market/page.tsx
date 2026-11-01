import {notFound} from 'next/navigation';
import ProcessedResultTable from '@/components/ProcessedResultTable';
import {formatDbStocks} from '@/lib/format';
import stocks from '@/data/dev/market-20261030.json';
export const dynamic='force-dynamic';
export default function DevMarket(){
 if(process.env.DEV_PREVIEW!=='1')notFound();
 return <div className="min-h-screen bg-white text-gray-800">
 <header className="h-16 border-b flex items-center px-6 gap-8"><strong className="text-lg">주식 조건검색</strong><span className="rounded-lg bg-amber-50 text-amber-800 px-3 py-1 text-sm">DEV · 읽기 전용 검증</span></header>
 <div className="flex"><aside className="hidden md:block w-60 shrink-0 border-r min-h-screen p-3"><div className="p-3 text-gray-500">홈</div><div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">시장 공부하기</div><div className="p-3 text-gray-500">매일 퀴즈</div><div className="p-3 text-gray-500">공시</div><div className="p-3 text-gray-500">관심종목</div></aside>
 <main className="flex-1 min-w-0 p-4 md:p-6"><p className="mb-4 text-sm">내 검색　›　시장 공부하기</p><h1 className="mb-2 font-semibold">2026년 10월 30일 금요일</h1><p className="text-xs text-gray-500 mb-5">상승 배경 → 관련 재료 → DART 사업 소개 · 공개 시장 데이터 검증본</p><ProcessedResultTable stocks={formatDbStocks(stocks)} conditionName="주식쉐도잉" date="20261030" /></main></div></div>;
}

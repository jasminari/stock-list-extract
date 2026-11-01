"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, BookOpen, Check, ChevronRight, ClipboardList, Pause, Play, RotateCcw, CalendarDays, Star } from "lucide-react";
import styles from "./NotifoldLanding.module.css";

const stocks = [
  { name: "삼성SDI", rate: "+0.93%", topic: "실적 · 3분기 흑자 전환", initial: "S", color: "blue" },
  { name: "라온로보틱스", rate: "+24.19%", topic: "실적 · 영업이익 259% 증가", initial: "R", color: "purple" },
  { name: "한미약품", rate: "+6.82%", topic: "기술수출 · 파브리병 신약", initial: "H", color: "green" },
  { name: "서울반도체", rate: "+3.93%", topic: "기술개발 · 탈희토류 LED", initial: "S", color: "orange" },
];

function Brand() {
  return <span className={styles.brand}><span className={styles.brandIcon}><ClipboardList size={17} strokeWidth={2} /></span>Stock<span className={styles.brandAccent}>Extract</span></span>;
}

function MarketMotion() {
  return <div className={styles.marketMotion} aria-label="종목과 상승이유가 한곳으로 정리되는 애니메이션">
    <div className={styles.visualHeading}><BookOpen size={16} /><span>오늘의 시장, 한눈에</span><span className={styles.smallDate}>10.30</span></div>
    <div className={styles.stockStack}>{stocks.map((stock, index) => <div className={`${styles.stockCard} ${styles[`stock${index}`]}`} key={stock.name}>
      <span className={`${styles.stockIcon} ${styles[stock.color]}`}>{stock.initial}</span>
      <div className={styles.stockText}><strong>{stock.name}</strong><span>{stock.topic}</span></div>
      <b>{stock.rate}</b>
    </div>)}</div>
    <div className={styles.organized}><span className={styles.brandIcon}><Check size={14} /></span>오른 이유까지 정리했어요</div>
    <span className={styles.visualFootnote}>2026.10.30 화면 데이터 · 연출된 정리 과정</span>
  </div>;
}

const historyRows = [
  { name: "삼성SDI", amount: "4,092억", turnover: "0.94%", price: "543,000", rate: "0.93%", keyword: "실적 · 3분기 흑자 전환", reason: "3분기 영업이익 4,078억원으로 전년 동기 대비 흑자 전환. 호실적이 당일 상승 배경으로 보도됨.", source: "근거 기사", business: false },
  { name: "LG에너지솔루션", amount: "1,507억", turnover: "0.18%", price: "359,500", rate: "0.98%", keyword: "리튬이온 전지", reason: "전기차·ESS·IT기기·전동공구 등에 쓰이는 전지 제품을 연구개발·제조·판매하는 회사임.", source: "DART · 반기보고서 (2026.06)", business: true },
  { name: "라온시큐어", amount: "1,456억", turnover: "67.4%", price: "19,450", rate: "16.82%", keyword: "AI 보안·인증 플랫폼", reason: "AI 보안·인증 플랫폼 기업으로, 생체인증 기반 다중인증과 블록체인 기반 분산신원인증 기술을 제공함.", source: "DART · 반기보고서 (2026.06)", business: true },
  { name: "삼성바이오로직스", amount: "1,418억", turnover: "0.21%", price: "1,487,000", rate: "8.86%", keyword: "바이오의약품 CDMO", reason: "바이오의약품 위탁생산과 세포주·공정 위탁개발 서비스를 제공하는 CDMO 회사임.", source: "DART · 반기보고서 (2026.06)", business: true },
];

function HistoryMotion() {
  return <div className={styles.screenStage}>
    <div className={styles.screenWindow}>
      <div className={styles.historyCapture} role="img" aria-label="시장 공부하기 화면 미리보기. 날짜별 종목과 상승이유를 보여줍니다.">
        <div className={styles.demoDate}><CalendarDays size={14} /><strong>2026년 10월 30일 금요일</strong><ChevronRight size={13} /></div>
        <div className={styles.demoTable}>
          <div className={styles.demoTableTitle}><strong>가공 데이터 <em>20</em>종목</strong><span>주식쉐도잉</span><small>2026년 10월 30일</small></div>
          <div className={styles.demoColumns}><span>종목명</span><span>거래대금</span><span>회전율</span><span>종가</span><span>등락률</span></div>
          {historyRows.map((row, index) => <div className={styles.demoRow} key={row.name}>
            <div className={styles.demoColumns}><strong title={row.name}><Star size={12} aria-hidden="true" /><span>{row.name}</span></strong><span className={index === 0 ? styles.amountHighlight : ""}>{row.amount}</span><span className={index === 2 ? styles.turnoverHighlight : ""}>{row.turnover}</span><span>{row.price}</span><span className={index === 2 ? styles.rateHighlight : ""}>{row.rate}</span></div>
            <div className={styles.demoReason}><span className={styles.demoKeyword}>{row.keyword}</span>{row.business && <small>사업 소개</small>}<p>{row.reason}</p><span className={styles.demoSource}>↗ {row.source}</span></div>
          </div>)}
        </div>
      </div>
    </div>
    <span className={styles.captureNote}>실제 화면을 재현한 UI · 2026.10.30 데이터</span>
  </div>;
}

function ReasonMotion() {
  const [expanded, setExpanded] = useState(false);
  return <div className={styles.reasonStage}>
    <div className={styles.reasonSheet}>
      <div className={styles.reasonTop}><span className={`${styles.stockIcon} ${styles.blue}`}>S</span><div><strong>삼성SDI</strong><span>006400 · 2026.10.30</span></div><b>+0.93%</b></div>
      <div className={styles.reasonNumbers}><span>종가<strong>543,000원</strong></span><span>거래대금<strong>4,092억</strong></span></div>
      <div className={styles.reasonSummary}><span className={styles.keyword}>실적 · 3분기 흑자 전환</span><p>3분기 영업이익 4,078억원으로<br />전년 동기 대비 흑자 전환.</p><p className={styles.reasonSub}>호실적이 당일 상승 배경으로 보도됨.</p></div>
      <button className={styles.sourceButton} onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>근거 기사 살펴보기 <ChevronRight size={15} className={expanded ? styles.rotated : ""} /></button>
      <div aria-hidden={!expanded} className={`${styles.articleReveal} ${expanded ? styles.articleOpen : ""}`}><div><span>근거 기사 제목</span><p>[ET특징주]삼성SDI,<br />3분기 호실적에 상승세</p><small>실제 서비스에 연결된 기사의 제목입니다.</small></div></div>
    </div>
    <span className={styles.captureNote}>실제 데이터로 재구성한 인터랙티브 미리보기</span>
  </div>;
}

const quizChoices = [
  "앞서 발표한 탈희토류 LED 개발 소식이 재부각되며 강세가 이어짐. 당일 신규 발표는 아님.",
  "해당 기업이 메모리 패키징 외주 물량과 협력사를 늘렸다는 보도에 에이팩트 주가가 10% 넘게 급등함",
  "3분기 영업이익 39억원으로 전년 동기 대비 약 259% 증가. 실적 성장 소식에 당일 급등한 것으로 보도됨.",
  "러시아 연구원 사망 소식에 감염병 관련주로 묶이며 전일 상한가를 기록한 뒤 조정 후 반등해 상한가 가격을 웃돌았다",
];

function QuizMotion() {
  const [selected, setSelected] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  return <div className={styles.quizStage}>
    <div className={`${styles.quizNative} ${manual ? styles.manualQuiz : ""}`}>
      <div className={styles.quizProgress} aria-label="5문제 중 첫 번째 문제">{[0,1,2,3,4].map(i => <span key={i} />)}<small>1/5</small></div>
      <div className={styles.quizBody}><span className={styles.quizDate}>2026년 10월 30일</span><h3>라온로보틱스, 이 날 주가가 오른 이유는?</h3>
        <div className={styles.quizChoices}>{quizChoices.map((choice, i) => <button key={choice} className={`${styles.quizChoice} ${!manual && i === 2 ? styles.autoChoice : ""} ${selected === i ? styles.choiceSelected : ""}`} onClick={() => {setManual(true); setSelected(selected === i ? null : i);}} aria-pressed={selected === i}><span>{i+1}</span>{choice}</button>)}</div>
        <p className={styles.quizDemoNote}>답안 선택을 체험하는 예시 화면입니다.</p>
      </div>
    </div>
    <div className={styles.quizHint}><span>답안을 눌러 선택해 보세요</span>{manual && <button onClick={() => {setManual(false); setSelected(null);}} aria-label="퀴즈 자동 시연 다시 시작"><RotateCcw size={14} /></button>}</div>
  </div>;
}

export default function NotifoldLanding() {
  const [paused, setPaused] = useState(false);
  return <div className={`${styles.landing} ${paused ? styles.paused : ""}`}>
    <a className={styles.skip} href="#main">본문으로 바로가기</a>
    <header className={styles.header}><nav className={styles.nav} aria-label="메인 메뉴">
      <Link href="/" aria-label="StockExtract 홈"><Brand /></Link>
      <div className={styles.navLinks}><a href="#screens">화면 미리보기</a><Link href="/login">시작하기 <ArrowUpRight size={15} /></Link></div>
    </nav></header>
    <main id="main" className={styles.main}>
      <section className={`${styles.section} ${styles.hero}`} aria-labelledby="hero-heading">
        <MarketMotion />
        <div className={styles.heroCopy}><h1 id="hero-heading">오늘 오른 종목,<br />왜 올랐는지까지.<span>StockExtract로<br className={styles.mobileBreak} /> 정리하세요</span></h1><Link className={styles.textLink} href="/login">웹에서 먼저 체험해보기 <ChevronRight size={16} /></Link><p className={styles.heroNote}>매일의 시장을, 나만의 공부로.</p></div>
      </section>
      <div className={styles.previewControls}><span>움직이는 화면으로 미리 만나보세요</span><button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? <Play size={12} /> : <Pause size={12} />}{paused ? "애니메이션 재생" : "애니메이션 멈춤"}</button></div>
      <section id="screens" className={styles.section} aria-labelledby="history-heading"><HistoryMotion /><div className={styles.copy}><h2 id="history-heading">흩어진 종목을 모으고,<br />오른 이유까지 한눈에</h2><p>장 마감 후 급등주를 자동으로 모아요. 거래대금과 등락률, 상승이유를 한 화면에서 확인하고 날짜별로 다시 살펴볼 수 있어요.</p><a className={styles.textLink} href="#reasons">어떤 이유로 올랐을까요 <ChevronRight size={15} /></a></div></section>
      <section id="reasons" className={styles.section} aria-labelledby="reason-heading"><ReasonMotion /><div className={styles.copy}><h2 id="reason-heading">숫자만으로는 모르는 이야기,<br />근거 기사와 함께 읽어요</h2><p>특징주 기사에서 상승이유를 정리하고, 핵심 키워드를 함께 보여드려요. 이유를 확인하지 못한 종목은 사업 소개와 구분해서 볼 수 있어요.</p><p className={styles.secondaryCopy}>궁금한 이유는 근거 기사를 열어 직접 확인하세요.</p></div></section>
      <section className={styles.section} aria-labelledby="quiz-heading"><QuizMotion /><div className={styles.copy}><h2 id="quiz-heading">읽고 지나간 오늘의 시장,<br />짧은 퀴즈로 내 것으로</h2><p>오늘 오른 종목의 상승이유로 만든 다섯 문제. 한 번 더 떠올리며 공부한 내용을 복습해 보세요. 매일의 작은 공부가 차곡차곡 쌓여요.</p><Link className={styles.textLink} href="/login">오늘의 시장 공부 시작하기 <ChevronRight size={15} /></Link></div></section>
      <section className={styles.cta}><span className={styles.ctaIcon}><ClipboardList size={27} /></span><h2>오늘의 상승이유가,<br />내일의 공부가 되도록.</h2><p>StockExtract를 웹에서 먼저 만나보세요.</p><Link className={styles.primaryButton} href="/login">지금 시작하기 <ArrowRight size={17} /></Link><span className={styles.appNote}>모바일 앱은 준비 중이에요.</span></section>
    </main>
    <footer className={styles.footer}><Brand /><div><Link href="/login">로그인</Link><a href="#screens">화면 미리보기</a><span>© {new Date().getFullYear()} StockExtract</span></div><p>화면 속 종목과 수치는 촬영일 기준이며, 투자 권유가 아닌 서비스 이용 예시입니다.</p></footer>
  </div>;
}

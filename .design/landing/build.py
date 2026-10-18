# -*- coding: utf-8 -*-
"""랜딩 아트보드 생성기.
값은 전부 components/landing/*.tsx 와 Tailwind 기본 토큰에서 그대로 옮겼다.
데스크톱(1440, lg 브레이크포인트)과 모바일(390, base)을 같은 소스에서 뽑는다.
"""

IND, IND5, IND7, IND2, IND1, IND0 = "#4f46e5", "#6366f1", "#4338ca", "#c7d2fe", "#e0e7ff", "#eef2ff"
G9, G8, G7, G6, G5, G4, G3, G2, G1, G05 = ("#111827", "#1f2937", "#374151", "#4b5563",
    "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb")

ICON = {
 "home": "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
 "book": "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
 "quiz": "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
 "gear": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
 "gearDot": "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
 "clipboard": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
 "calendar": "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
 "chevron": "M19 9l-7 7-7-7",
 "link": "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
 "search": "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
 "clock": "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
 "arrow": "M13 7l5 5m0 0l-5 5m5-5H6",
 "check": "M5 13l4 4L19 7",
 "spark": "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
}


def svg(path, size, sw=2, color=None):
    c = " color: %s;" % color if color else ""
    return ('<svg style="height: %dpx; width: %dpx; flex-shrink: 0;%s" fill="none" stroke="currentColor" '
            'stroke-width="%s" viewBox="0 0 24 24" aria-hidden="true">'
            '<path stroke-linecap="round" stroke-linejoin="round" d="%s"></path></svg>' % (size, size, c, sw, path))


GEAR_SVG = ('<svg style="height: 20px; width: 20px; flex-shrink: 0;" fill="none" stroke="currentColor" '
            'stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">'
            '<path stroke-linecap="round" stroke-linejoin="round" d="%s"></path>'
            '<path stroke-linecap="round" stroke-linejoin="round" d="%s"></path></svg>' % (ICON["gear"], ICON["gearDot"]))

TIP = ('<span style="position: absolute; bottom: 100%%; left: 50%%; margin-bottom: 6px; transform: translateX(-50%%); '
       'white-space: nowrap; border-radius: 9999px; background: %s; padding: 4px 8px; font-size: 10px; font-weight: 700; '
       'line-height: 1; color: #ffffff; box-shadow: 0 10px 15px -3px rgba(79,70,229,0.3), 0 4px 6px -4px rgba(79,70,229,0.3);">'
       '새로운 기능<span style="position: absolute; left: 50%%; top: 100%%; margin-left: -4px; margin-top: -4px; '
       'height: 8px; width: 8px; transform: rotate(45deg); background: %s;"></span></span>' % (IND, IND))


def tabbar(active, tip=False):
    tabs = [("home", "홈", svg(ICON["home"], 20)), ("history", "시장 공부하기", svg(ICON["book"], 20)),
            ("quiz", "매일 퀴즈", svg(ICON["quiz"], 20)), ("settings", "설정", GEAR_SVG)]
    out = ['<div style="display: flex; align-items: center; justify-content: space-around; '
           'border-top: 1px solid %s; background: #ffffff; padding: 4px 4px 12px;">' % G2]
    for tid, label, icon in tabs:
        color = IND if tid == active else G4
        t = TIP if (tip and tid == "quiz") else ""
        out.append('<div style="position: relative; display: flex; min-width: 56px; flex-direction: column; '
                   'align-items: center; gap: 2px; border-radius: 8px; padding: 6px 8px; color: %s;">%s%s'
                   '<span style="font-size: 10px; font-weight: 500; line-height: 1.25;">%s</span></div>'
                   % (color, t, icon, label))
    out.append("</div>")
    return "".join(out)


APP_HEADER = ('<div style="display: flex; height: 56px; flex-shrink: 0; align-items: center; justify-content: space-between; '
  'border-bottom: 1px solid %s; padding: 0 12px;">'
  '<div style="display: flex; height: 32px; width: 32px; align-items: center; justify-content: center; '
  'border-radius: 9999px; background: %s; color: #ffffff;">%s</div>'
  '<div style="display: flex; align-items: center; gap: 8px;">'
  '<span style="border: 1px solid %s; border-radius: 8px; padding: 6px 10px; font-size: 12px; color: %s;">로그아웃</span>'
  '<div style="display: flex; height: 32px; width: 32px; align-items: center; justify-content: center; '
  'border-radius: 9999px; background: %s; font-size: 13px; font-weight: 500; color: #ffffff;">J</div>'
  '</div></div>' % (G2, IND, svg(ICON["clipboard"], 16), G3, G6, IND5))


def phone(inner, height, scale):
    sc = "" if scale == 1 else "transform: scale(%s); " % scale
    return ('<div style="display: flex; width: 100%%; justify-content: center; height: %dpx;">'
            '<div style="%stransform-origin: top;">'
            '<div style="width: 406px; border-radius: 48px; background: %s; padding: 8px; '
            'box-shadow: 0 40px 70px -30px rgba(17,24,39,0.45);">'
            '<div style="display: flex; height: 844px; width: 390px; flex-direction: column; overflow: hidden; '
            'border-radius: 40px; background: #ffffff;">'
            '<div style="height: 44px; flex-shrink: 0; background: #ffffff;"></div>%s</div></div></div></div>'
            % (height, sc, G9, inner))


# ---------- 폰 화면 ----------

STOCKS = [
    ("두산에너빌리티", "9,019억", True, "+7.62%", False, "체코 원전",
     "체코 원전 계약금지 가처분 취소 판결에 급등", "두산에너빌리티, 체코 원전 본계약 재개 기대"),
    ("한전기술", "2,048억", True, "+19.80%", True, "체코 계약",
     "25조 규모 체코 신규 원전 계약 체결 소식", "한전기술 상한가 근접… 체코 원전 수주 기대감"),
    ("삼성전기", "1,246억", False, "+8.46%", False, "애플 유리기판",
     "애플과 유리기판 공급 협의 진행 소식", None),
]


def history_screen():
    rows = []
    for name, amount, hot_amt, rate, hot_rate, kw, reason, article in STOCKS:
        amt_style = ("width: 62px; border-radius: 4px; background: #ffedd5; padding: 2px 4px; text-align: right; "
                     "font-size: 12px; font-weight: 500; color: #c2410c;") if hot_amt else (
                     "width: 62px; text-align: right; font-size: 12px; font-weight: 500; color: %s;" % G7)
        rate_color = "#ef4444" if hot_rate else G7
        art = ""
        if article:
            art = ('<div style="display: flex; align-items: center; gap: 4px; overflow: hidden; font-size: 11px; color: %s;">%s'
                   '<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">%s</span></div>'
                   % (IND5, svg(ICON["link"], 12), article))
        rows.append(
            '<div style="border-top: 1px solid %s; padding: 6px 8px 8px;">'
            '<div style="display: flex; align-items: center; gap: 8px;">'
            '<span style="flex: 1; font-size: 12px; font-weight: 500; color: %s;">%s</span>'
            '<span style="%s">%s</span>'
            '<span style="width: 58px; text-align: right; font-size: 12px; font-weight: 500; color: %s;">%s</span></div>'
            '<div style="margin-left: 4px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px; '
            'border-left: 2px solid %s; padding-left: 10px;">'
            '<span style="align-self: flex-start; border-radius: 9999px; background: %s; padding: 2px 8px; '
            'font-size: 10px; font-weight: 500; color: %s;">%s</span>'
            '<p style="font-size: 11px; line-height: 1.375; color: %s;">%s</p>%s</div></div>'
            % (G1, G9, name, amt_style, amount, rate_color, rate, IND2, IND0, IND, kw, G6, reason, art))

    for name, amount, rate in [("금호건설", "412억", "+4.21%"), ("삼성SDI", "1,880억", "+3.09%")]:
        rows.append('<div style="display: flex; align-items: center; gap: 8px; border-top: 1px solid %s; padding: 10px 8px;">'
                    '<span style="flex: 1; font-size: 12px; font-weight: 500; color: %s;">%s</span>'
                    '<span style="width: 62px; text-align: right; font-size: 12px; color: %s;">%s</span>'
                    '<span style="width: 58px; text-align: right; font-size: 12px; font-weight: 500; color: %s;">%s</span></div>'
                    % (G1, G9, name, G7, amount, G7, rate))

    return ('<div style="display: flex; flex: 1; flex-direction: column; overflow: hidden; background: #ffffff;">%s'
        '<div style="border-bottom: 1px solid %s; padding: 10px 12px;">'
        '<div style="display: inline-flex; align-items: center; gap: 8px; border: 1px solid %s; border-radius: 10px; '
        'padding: 8px 12px; color: %s;">%s'
        '<span style="font-size: 13px; font-weight: 700; color: %s;">2026년 8월 28일 금요일</span>%s</div></div>'
        '<div style="flex: 1; overflow: hidden; padding: 8px;">'
        '<div style="overflow: hidden; border: 1px solid %s; border-radius: 12px; background: #ffffff;">'
        '<div style="border-bottom: 1px solid %s; padding: 12px 16px;">'
        '<div style="display: flex; align-items: center; justify-content: space-between;">'
        '<span style="font-size: 14px; font-weight: 600; color: %s;">가공 데이터 '
        '<span style="font-weight: 700; color: %s;">50</span>종목</span>'
        '<span style="font-size: 10px; color: %s;">장중급등</span></div>'
        '<p style="margin-top: 2px; font-size: 10px; color: %s;">2026년 08월 28일</p></div>'
        '<div style="display: flex; align-items: center; gap: 8px; background: %s; padding: 8px; font-size: 10px; color: %s;">'
        '<span style="flex: 1;">종목명</span><span style="width: 62px; text-align: right;">거래대금</span>'
        '<span style="width: 58px; text-align: right;">등락률</span></div>%s</div></div>%s</div>'
        % (APP_HEADER, G2, G2, G4, svg(ICON["calendar"], 16), G9, svg(ICON["chevron"], 14),
           G2, G1, G8, IND, G4, G4, G05, G5, "".join(rows), tabbar("history", tip=True)))


CHOICES = [("1", "체코 신규 원전 계약 체결 소식", False), ("2", "분기 실적이 시장 기대를 넘었다", True),
           ("3", "대주주 지분 매각 공시", False), ("4", "코스피 지수 편입 결정", False)]


def quiz_screen():
    ch = []
    for no, text, sel in CHOICES:
        if sel:
            box = "border: 2px solid %s; border-bottom-width: 4px; background: %s; color: #3730a3;" % (IND5, IND0)
            num = "background: rgba(255,255,255,0.7); color: currentColor;"
        else:
            box = "border: 2px solid %s; border-bottom-width: 4px; background: #ffffff; color: %s;" % (G2, G7)
            num = "background: %s; color: %s;" % (G1, G4)
        ch.append('<div style="display: flex; align-items: flex-start; gap: 12px; border-radius: 16px; %s '
                  'padding: 14px 16px; font-size: 14px; font-weight: 500; line-height: 1.625;">'
                  '<span style="margin-top: 2px; display: flex; height: 24px; width: 24px; flex-shrink: 0; '
                  'align-items: center; justify-content: center; border-radius: 8px; font-size: 12px; font-weight: 700; %s">%s</span>'
                  '<span style="flex: 1;">%s</span></div>' % (box, num, no, text))

    fire = ('<svg style="height: 16px; width: 16px;" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
            '<path d="M12 2c.5 3.5-1.5 4.5-3 6.5C7.3 10.7 6 12.4 6 14.5A6 6 0 0018 15c0-3.5-2.5-5-3.5-7.5-.7-1.7-1-3.5-2.5-5.5zm0 17a3 3 0 01-3-3c0-1.4 1-2.4 1.8-3.4.6-.8 1.2-1.6 1.2-2.6 1 1.3 2 2 2.6 3 .4.7.4 1.4.4 2a3 3 0 01-3 4z"></path></svg>')

    return ('<div style="display: flex; flex: 1; flex-direction: column; overflow: hidden; background: #ffffff;">%s'
        '<div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px;">'
        '<div style="flex: 1;"><div style="margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">'
        '<span style="font-size: 12px; font-weight: 500; color: %s;">2 / 5</span>'
        '<span style="font-size: 12px; color: %s;">오늘의 퀴즈</span></div>'
        '<div style="height: 6px; overflow: hidden; border-radius: 9999px; background: %s;">'
        '<div style="height: 100%%; width: 40%%; border-radius: 9999px; background: %s;"></div></div></div>'
        '<div style="display: flex; flex-shrink: 0; align-items: center; gap: 6px; border-radius: 8px; background: #fff7ed; '
        'padding: 6px 10px; color: #ea580c;">%s<span style="font-size: 14px; font-weight: 700;">7</span>'
        '<span style="font-size: 12px;">일</span></div></div>'
        '<div style="flex: 1; overflow: hidden; padding: 8px 16px 0;">'
        '<div style="margin-bottom: 12px; display: inline-block; border-radius: 8px; background: %s; padding: 4px 10px; '
        'font-size: 11px; font-weight: 500; color: %s;">상승이유</div>'
        '<h2 style="margin-bottom: 16px; font-size: 18px; font-weight: 700; line-height: 1.375; color: %s;">'
        '8월 28일 한전기술이 19.8%% 오른 이유는?</h2>'
        '<div style="margin-bottom: 20px; border-radius: 12px; border-left: 4px solid %s; background: %s; '
        'padding: 12px 16px; font-size: 13px; line-height: 1.625; color: %s;">'
        '거래대금 2,048억 · 종가 78,300원 · 회전율 24.1%%</div>'
        '<div style="display: flex; flex-direction: column; gap: 10px;">%s</div></div>'
        '<div style="border-top: 1px solid %s; background: #ffffff; padding: 12px 16px;">'
        '<div style="border-radius: 12px; background: %s; padding: 14px 0; text-align: center; font-size: 14px; '
        'font-weight: 700; color: #ffffff;">확인</div></div>%s</div>'
        % (APP_HEADER, G5, G4, G1, IND, fire, G1, G5, G9, IND2, G05, G6, "".join(ch), G2, IND, tabbar("quiz")))


GRASS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
GRASS_SEQ = [0,1,0,2,3,1,0,1,2,4,3,0,0,1,2,3,3,1,0,1,2,4,3,2,1,0,0,1,
             0,2,3,4,2,1,0,1,1,2,3,4,2,0,0,1,2,2,3,1,0,2,3,4,4,2,1,0,
             1,0,2,3,2,0,1,3,4,2,1,1,0,0,0,1,3,2,4,1,0,2,2,1,0,3,4,1]


def home_screen():
    cols = []
    for c in range(12):
        cells = "".join('<div style="height: 11px; width: 11px; border-radius: 2px; background: %s;"></div>'
                        % GRASS[GRASS_SEQ[(c * 7 + r) % len(GRASS_SEQ)]] for r in range(7))
        cols.append('<div style="display: flex; flex-direction: column; gap: 3px;">%s</div>' % cells)

    actions = []
    for path, bg, color, title, desc in [
        (ICON["search"], IND0, IND5, "조건검색 실행", "키움 REST API로 종목 추출"),
        (ICON["clock"], "#f0fdf4", "#22c55e", "저장 이력", "날짜별로 다시 보기")]:
        actions.append('<div style="display: flex; flex: 1; flex-direction: column; gap: 10px; border: 1px solid %s; '
            'border-radius: 12px; background: #ffffff; padding: 14px;">'
            '<div style="display: flex; height: 40px; width: 40px; align-items: center; justify-content: center; '
            'border-radius: 12px; background: %s; color: %s;">%s</div>'
            '<div><div style="font-size: 13px; font-weight: 500; color: %s;">%s</div>'
            '<div style="margin-top: 2px; font-size: 11px; line-height: 1.375; color: %s;">%s</div></div></div>'
            % (G2, bg, color, svg(path, 22), G9, title, G5, desc))

    return ('<div style="display: flex; flex: 1; flex-direction: column; overflow: hidden; background: #ffffff;">%s'
        '<div style="flex: 1; overflow: hidden; padding: 20px 16px;">'
        '<h1 style="margin-bottom: 2px; font-size: 20px; font-weight: 700; color: %s;">대시보드</h1>'
        '<p style="margin-bottom: 20px; font-size: 12px; color: %s;">종목 상승이유 기여 현황</p>'
        '<div style="margin-bottom: 20px; display: flex; gap: 12px;">'
        '<div style="flex: 1; overflow: hidden; border: 1px solid %s; border-radius: 12px; background: #ffffff; padding: 16px;">'
        '<div style="margin-bottom: 10px; font-size: 11px; color: %s;">올해 138일 기록</div>'
        '<div style="display: flex; gap: 3px;">%s</div></div>'
        '<div style="display: flex; flex-direction: column; gap: 8px;">'
        '<div style="border-radius: 8px; background: %s; padding: 8px 12px; font-size: 12px; font-weight: 500; color: #ffffff;">2026</div>'
        '<div style="border-radius: 8px; border: 1px solid %s; background: #ffffff; padding: 8px 12px; font-size: 12px; '
        'font-weight: 500; color: %s;">2025</div></div></div>'
        '<div style="display: flex; gap: 12px;">%s</div></div>%s</div>'
        % (APP_HEADER, G9, G5, G2, G4, "".join(cols), IND, G2, G6, "".join(actions), tabbar("home")))


# ---------- 페이지 섹션 ----------

DESKTOP = dict(pad=24, nav_links=True, nav_login=True, logo=19,
    hero_pt=80, hero_pb=64, hero_dir="row", hero_gap=56, hero_left="width: 596px; flex-shrink: 0;",
    h1=62, hp=19, hp_br=True, btn_dir="row", ph_h=880, ph_s=1, quiz_card=True, ticker_pb=80,
    sec_py=96, h2=44, head_mb=56, sub=17, cols3=True, scr_gap=32, scr_h=750, scr_s=0.86,
    cta_py=96, cta_px=64, cta_cpy=80, cta_h2=46, cta_p=18, cta_btn=18, form_dir="row")

MOBILE = dict(pad=24, nav_links=False, nav_login=False, logo=18,
    hero_pt=64, hero_pb=48, hero_dir="column", hero_gap=48, hero_left="width: 100%;",
    h1=36, hp=16, hp_br=False, btn_dir="column", ph_h=600, ph_s=0.68, quiz_card=False, ticker_pb=56,
    sec_py=80, h2=30, head_mb=48, sub=16, cols3=False, scr_gap=48, scr_h=600, scr_s=0.68,
    cta_py=64, cta_px=24, cta_cpy=56, cta_h2=30, cta_p=16, cta_btn=16, form_dir="column")


def wrap(inner, pad, max_w=1152):
    return '<div style="margin: 0 auto; max-width: %dpx; padding: 0 %dpx;">%s</div>' % (max_w, pad, inner)


def nav(c):
    links = ""
    if c["nav_links"]:
        links = ('<div style="display: flex; align-items: center; gap: 32px; font-size: 14px; color: %s;">'
                 '<a href="#screens" style="color: %s;">화면 미리보기</a>'
                 '<a href="#features" style="color: %s;">기능</a>'
                 '<a href="#roadmap" style="color: %s;">출시 계획</a></div>' % (G6, G6, G6, G6))
    login = '<a href="#" style="font-size: 14px; color: %s;">로그인</a>' % G6 if c["nav_login"] else ""
    return ('<nav style="border-bottom: 1px solid %s; background: rgba(255,255,255,0.9);">'
        '<div style="margin: 0 auto; display: flex; height: 64px; max-width: 1152px; align-items: center; '
        'justify-content: space-between; gap: 32px; padding: 0 %dpx;">'
        '<a href="#" style="font-size: %dpx; font-weight: 800; letter-spacing: -0.025em; color: %s;">StockExtract</a>%s'
        '<div style="display: flex; align-items: center; gap: 16px;">%s'
        '<a href="#" style="border-radius: 12px; background: %s; padding: 10px 16px; font-size: 14px; font-weight: 700; '
        'color: #ffffff; box-shadow: 0 10px 15px -3px rgba(79,70,229,0.2), 0 4px 6px -4px rgba(79,70,229,0.2);">체험하기</a>'
        '</div></div></nav>' % (G1, c["pad"], c["logo"], G9, links, login, IND))


TICKER = [("삼성전자","+2.68%",1),("SK하이닉스","+3.00%",1),("LG에너지솔루션","-0.42%",0),("삼성바이오로직스","+1.01%",1),
    ("현대차","+1.05%",1),("기아","+0.88%",1),("셀트리온","-0.31%",0),("NAVER","+0.68%",1),("카카오","+2.14%",1),
    ("POSCO홀딩스","+4.68%",1),("삼성SDI","+1.07%",1),("LG화학","-0.55%",0),("한화에어로스페이스","+0.22%",1),
    ("KB금융","+0.07%",1),("하나금융지주","+0.15%",1),("삼성물산","+1.96%",1)]


def ticker(c):
    chips = "".join('<div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; margin: 0 6px; '
        'border-radius: 9999px; background: #ffffff; border: 1px solid %s; white-space: nowrap;">'
        '<span style="font-size: 14px; font-weight: 600; color: %s;">%s</span>'
        '<span style="font-size: 12px; font-weight: 700; color: %s;">%s</span></div>'
        % (G2, G8, n, "#ef4444" if up else "#3b82f6", r) for n, r, up in TICKER)
    return ('<div style="padding-bottom: %dpx;"><div style="overflow: hidden; padding: 8px 0; '
        '-webkit-mask-image: linear-gradient(to right, transparent, black 8%%, black 92%%, transparent); '
        'mask-image: linear-gradient(to right, transparent, black 8%%, black 92%%, transparent);">'
        '<div style="display: flex; width: max-content;">%s</div></div></div>' % (c["ticker_pb"], chips))


def hero(c):
    br = "<br>" if c["hp_br"] else " "
    quiz = ""
    if c["quiz_card"]:
        quiz = ('<div style="position: absolute; left: -36px; bottom: 96px; width: 264px; border: 1px solid %s; '
            'border-radius: 20px; background: #ffffff; padding: 18px; box-shadow: 0 25px 50px -12px rgba(209,213,219,0.4);">'
            '<div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">'
            '<div style="display: flex; height: 28px; width: 28px; align-items: center; justify-content: center; '
            'border-radius: 10px; background: %s;">%s</div>'
            '<span style="font-size: 12px; font-weight: 700; color: %s;">매일 퀴즈</span>'
            '<span style="margin-left: auto; font-size: 11px; color: %s;">5문제 · 3분</span></div>'
            '<p style="font-size: 14px; font-weight: 700; line-height: 1.375; color: %s;">8월 28일 한전기술이<br>19.8%% 오른 이유는?</p>'
            '<div style="margin-top: 12px; display: flex; align-items: center; gap: 8px; border: 1px solid %s; '
            'border-radius: 12px; background: %s; padding: 10px 12px;">%s'
            '<span style="font-size: 12px; font-weight: 600; color: %s;">체코 신규 원전 계약 체결</span></div></div>'
            % (G2, IND0, svg(ICON["quiz"], 18, 1.8, IND), IND, G4, G9, IND2, IND0,
               svg(ICON["check"], 16, 2.5, IND), IND7))

    copy = ('<div style="%s">'
        '<span style="display: inline-flex; align-items: center; gap: 8px; border-radius: 9999px; background: %s; '
        'padding: 6px 14px; font-size: 13px; font-weight: 700; color: %s;">'
        '<span style="height: 6px; width: 6px; border-radius: 9999px; background: %s;"></span>'
        'iOS · Android 앱 출시 준비 중</span>'
        '<h1 style="margin-top: 28px; word-break: keep-all; font-size: %dpx; font-weight: 800; line-height: 1.08; '
        'letter-spacing: -0.025em; color: %s;">오늘 오른 종목,<br>'
        '<span style="color: %s;">왜 올랐는지</span>까지<br>주머니 속에서.</h1>'
        '<p style="margin-top: 24px; word-break: keep-all; font-size: %dpx; line-height: 1.625; color: %s;">'
        '장 마감 후 급등주를 자동으로 모으고, 특징주 기사를 찾아 상승이유를 정리합니다.%s'
        '모바일 앱은 준비 중이에요 — 웹에서는 지금 바로 써볼 수 있어요.</p>'
        '<div style="margin-top: 36px; display: flex; flex-direction: %s; gap: 12px;">'
        '<a href="#" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; '
        'border-radius: 12px; background: %s; padding: 16px 32px; font-size: 17px; font-weight: 700; color: #ffffff; '
        'box-shadow: 0 10px 15px -3px rgba(79,70,229,0.25), 0 4px 6px -4px rgba(79,70,229,0.25);">체험하기%s</a>'
        '<a href="#notify" style="display: inline-flex; align-items: center; justify-content: center; border-radius: 12px; '
        'border: 1px solid %s; background: #ffffff; padding: 16px 28px; font-size: 17px; font-weight: 700; color: %s;">'
        '출시 알림 받기</a></div>'
        '<p style="margin-top: 16px; font-size: 13px; color: %s;">카카오 로그인 3초 · 오늘 데이터까지 그대로 열려 있어요</p></div>'
        % (c["hero_left"], IND1, IND7, IND5, c["h1"], G9, IND, c["hp"], G5, br, c["btn_dir"], IND,
           svg(ICON["arrow"], 18), G3, G7, G4))

    device = ('<div style="position: relative; flex: 1; min-width: 0; width: 100%%;">%s%s</div>'
              % (phone(history_screen(), c["ph_h"], c["ph_s"]), quiz))

    row = ('<div style="display: flex; flex-direction: %s; align-items: center; gap: %dpx;">%s%s</div>'
           % (c["hero_dir"], c["hero_gap"], copy, device))

    return ('<section style="position: relative; overflow-x: clip; '
        'background: linear-gradient(to bottom, %s 0%%, #ffffff 50%%, #ffffff 100%%);">'
        '<div style="margin: 0 auto; max-width: 1152px; padding: %dpx %dpx %dpx;">%s</div>%s</section>'
        % (IND0, c["hero_pt"], c["pad"], c["hero_pb"], row, ticker(c)))


def section_head(c, title_html, sub_text):
    sub = ('<p style="margin-top: 16px; word-break: keep-all; font-size: %dpx; color: %s;">%s</p>'
           % (c["sub"], G5, sub_text)) if sub_text else ""
    return ('<div style="margin-bottom: %dpx; text-align: center;">'
        '<h2 style="word-break: keep-all; font-size: %dpx; font-weight: 800; letter-spacing: -0.025em; color: %s;">%s</h2>%s</div>'
        % (c["head_mb"], c["h2"], G9, title_html, sub))


def grid(c, items, gap, three=True):
    cols = "repeat(3, minmax(0, 1fr))" if (three and c["cols3"]) else "minmax(0, 1fr)"
    return ('<div style="display: grid; grid-template-columns: %s; gap: %dpx;">%s</div>'
            % (cols, gap, "".join(items)))


def screens(c):
    data = [("시장 공부하기", "오른 종목과 상승이유, 근거 기사까지 한 화면에서 확인해요.", history_screen()),
            ("매일 퀴즈", "그날의 상승이유로 만든 5문제. 연속 학습일이 쌓여요.", quiz_screen()),
            ("대시보드", "공부한 날이 잔디로 쌓이고, 날짜별로 다시 볼 수 있어요.", home_screen())]
    items = []
    for title, desc, scr in data:
        items.append('<div style="display: flex; flex-direction: column; align-items: center; gap: 24px;">%s'
            '<div style="max-width: 300px; text-align: center;">'
            '<h3 style="margin-bottom: 8px; font-size: 18px; font-weight: 700; color: %s;">%s</h3>'
            '<p style="word-break: keep-all; font-size: 14px; line-height: 1.625; color: %s;">%s</p></div></div>'
            % (phone(scr, c["scr_h"], c["scr_s"]), G9, title, G5, desc))
    return ('<section id="screens" style="background: #ffffff; padding: %dpx 0;">%s</section>'
        % (c["sec_py"], wrap(section_head(c, "앱에서 이렇게 보여요", "웹에서 쓰던 화면 그대로, 손에 잡히는 크기로.")
                             + grid(c, items, c["scr_gap"]), c["pad"])))


FEATURES = [("AI 상승이유 요약", "특징주 기사를 읽고 왜 올랐는지 한두 문장으로 정리해요.", "NEW", "spark"),
    ("매일 퀴즈", "오늘 오른 종목의 상승이유로 5문제. 연속 학습일이 쌓여요.", "NEW", "quiz"),
    ("매일 자동 수집", "장 마감 후 급등주를 알아서 모아둬요. 아침이면 준비 완료.", None, "clock")]


def features(c):
    items = []
    for title, desc, badge, ico in FEATURES:
        b = ('<span style="border-radius: 4px; background: %s; padding: 2px 6px; font-size: 10px; font-weight: 700; '
             'color: #ffffff;">%s</span>' % (IND, badge)) if badge else ""
        items.append('<div style="height: 100%%; border: 1px solid %s; border-radius: 16px; background: #ffffff; padding: 28px;">'
            '<div style="margin-bottom: 20px; display: flex; height: 48px; width: 48px; align-items: center; '
            'justify-content: center; border-radius: 12px; background: %s; color: %s;">%s</div>'
            '<div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">'
            '<h3 style="font-size: 18px; font-weight: 700; color: %s;">%s</h3>%s</div>'
            '<p style="word-break: keep-all; font-size: 15px; line-height: 1.625; color: %s;">%s</p></div>'
            % (G2, IND0, IND, svg(ICON[ico], 26, 1.5), G9, title, b, G5, desc))
    head = ('<h2 style="margin-bottom: %dpx; word-break: keep-all; text-align: center; font-size: %dpx; font-weight: 800; '
        'letter-spacing: -0.025em; color: %s;">공부는 당신이,<br><span style="color: %s;">정리는 우리가.</span></h2>'
        % (c["head_mb"], c["h2"], G9, IND))
    return ('<section id="features" style="background: %s; padding: %dpx 0;">%s</section>'
            % (G05, c["sec_py"], wrap(head + grid(c, items, 24), c["pad"])))


STEPS = [("01", "웹 서비스 운영 중", "매일 장 마감 후 급등주를 모으고 상승이유를 정리하고 있어요. 지금 바로 체험할 수 있습니다.", "진행 중", True),
    ("02", "앱 비공개 베타", "출시 알림을 신청하신 분들께 먼저 초대장을 보내드려요.", "[베타 시작 예정]", False),
    ("03", "App Store · Google Play", "iOS와 Android에 정식 출시합니다.", "[출시 예정]", False)]


def roadmap(c):
    items = []
    for no, title, desc, badge, active in STEPS:
        border = IND2 if active else G2
        num = ("background: %s; color: #ffffff;" % IND) if active else ("background: %s; color: %s;" % (G1, G4))
        bdg = ("background: %s; color: %s;" % (IND0, IND7)) if active else ("background: %s; color: %s;" % (G1, G5))
        items.append('<div style="display: flex; height: 100%%; flex-direction: column; gap: 14px; border: 1px solid %s; '
            'border-radius: 16px; background: #ffffff; padding: 28px;">'
            '<div style="display: flex; align-items: center; gap: 12px;">'
            '<div style="display: flex; height: 44px; width: 44px; align-items: center; justify-content: center; '
            'border-radius: 16px; font-size: 16px; font-weight: 800; %s">%s</div>'
            '<span style="border-radius: 9999px; padding: 4px 10px; font-size: 12px; font-weight: 700; %s">%s</span></div>'
            '<h3 style="font-size: 19px; font-weight: 700; color: %s;">%s</h3>'
            '<p style="word-break: keep-all; font-size: 15px; line-height: 1.625; color: %s;">%s</p></div>'
            % (border, num, no, bdg, badge, G9, title, G5, desc))
    return ('<section id="roadmap" style="background: #ffffff; padding: %dpx 0;">%s</section>'
        % (c["sec_py"], wrap(section_head(c, "앱 출시까지, 지금 여기", "출시 전까지 웹 서비스는 매일 그대로 돌아갑니다.")
                             + grid(c, items, 24), c["pad"])))


def cta(c):
    card = ('<div style="border-radius: 24px; background: linear-gradient(to bottom right, %s, %s); '
        'padding: %dpx %dpx; text-align: center; box-shadow: 0 25px 50px -12px rgba(79,70,229,0.25);">'
        '<h2 style="word-break: keep-all; font-size: %dpx; font-weight: 800; line-height: 1.25; letter-spacing: -0.025em; '
        'color: #ffffff;">앱은 준비 중,<br>시장은 오늘도 열려요</h2>'
        '<p style="margin-top: 20px; word-break: keep-all; font-size: %dpx; color: %s;">'
        '출시되면 가장 먼저 알려드릴게요. 그때까지는 웹에서 만나요.</p>'
        '<div style="margin-top: 36px;">'
        '<a href="#" style="display: inline-flex; align-items: center; gap: 8px; border-radius: 16px; background: #ffffff; '
        'padding: 16px 36px; font-size: %dpx; font-weight: 800; color: %s;">체험하기%s</a></div>'
        '<div id="notify" style="margin: 28px auto 0; display: flex; width: 100%%; max-width: 440px; '
        'flex-direction: %s; gap: 10px; border-radius: 16px; background: rgba(255,255,255,0.15); padding: 8px;">'
        '<div style="height: 48px; flex: 1; border-radius: 12px; background: #ffffff; padding: 0 16px; '
        'display: flex; align-items: center; font-size: 15px; color: %s;">이메일 주소</div>'
        '<div style="height: 48px; white-space: nowrap; border-radius: 12px; background: %s; padding: 0 20px; '
        'display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #ffffff;">'
        '출시 알림 받기</div></div></div>'
        % (IND, IND5, c["cta_cpy"], c["cta_px"], c["cta_h2"], c["cta_p"], IND1, c["cta_btn"], IND,
           svg(ICON["arrow"], 20), c["form_dir"], G4, G9))
    return ('<section style="background: #ffffff; padding: %dpx 0;">%s</section>'
            % (c["cta_py"], wrap(card, c["pad"], 896)))


def footer(c):
    return ('<footer style="border-top: 1px solid %s; padding: 32px 0;">'
        '<div style="margin: 0 auto; max-width: 1152px; padding: 0 %dpx; display: flex; align-items: center; '
        'justify-content: space-between; font-size: 14px; color: %s;">'
        '<span>StockExtract</span><span>키움증권 REST API 연동</span></div></footer>' % (G1, c["pad"], G4))


HEAD = """<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
  <style>
    *, *::before, *::after { box-sizing: border-box; border: 0 solid #e5e7eb; }
    body { margin: 0; background: #ffffff; -webkit-font-smoothing: antialiased; }
    h1, h2, h3, p, figure { margin: 0; }
    a { color: #4f46e5; text-decoration: none; }
    a:hover { color: #4338ca; }
  </style>
</helmet>
"""

TAIL = "</x-dc>\n</body>\n</html>\n"


def page(c, width):
    body = "".join([nav(c), hero(c), screens(c), features(c), roadmap(c), cta(c), footer(c)])
    root = ('<div style="width: %dpx; background: #ffffff; font-family: \'Inter\', \'Apple SD Gothic Neo\', '
            '\'Malgun Gothic\', system-ui, sans-serif; color: %s;">%s</div>' % (width, G9, body))
    return HEAD + root + "\n" + TAIL


open("Main.dc.html", "w").write(page(DESKTOP, 1440))
open("Mobile.dc.html", "w").write(page(MOBILE, 390))
print("Main.dc.html  %d bytes" % len(open("Main.dc.html").read()))
print("Mobile.dc.html %d bytes" % len(open("Mobile.dc.html").read()))

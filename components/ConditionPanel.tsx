import { LoadingIcon } from "@/components/ui/loading-icon";

interface Condition {
  seq: string;
  name: string;
}

interface ConditionPanelProps {
  conditions: Condition[];
  selectedSeq: string;
  condLoading: boolean;
  condError: string;
  searching: boolean;
  searchError: string;
  lastFileName: string;
  onSelectCondition: (seq: string, name: string) => void;
  onRefresh: () => void;
  onSearch: () => void;
  onDownload: (fileName: string) => void;
}

export default function ConditionPanel({
  conditions,
  selectedSeq,
  condLoading,
  condError,
  searching,
  searchError,
  lastFileName,
  onSelectCondition,
  onRefresh,
  onSearch,
  onDownload,
}: ConditionPanelProps) {
  return (
    <div className="bg-background rounded-xl border border-border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">조건검색식 선택</h2>
        <button
          onClick={onRefresh}
          disabled={condLoading}
          className="text-xs text-primary hover:text-primary-hover disabled:opacity-40"
        >
          {condLoading ? <span className="inline-flex items-center gap-2"><LoadingIcon className="h-5 w-5" decorative />불러오는 중...</span> : "새로고침"}
        </button>
      </div>

      {condError && (
        <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {condError}
        </div>
      )}

      {conditions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {conditions.map((c) => (
            <button
              key={c.seq}
              onClick={() => onSelectCondition(c.seq, c.name)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                selectedSeq === c.seq
                  ? "bg-primary border-primary text-white"
                  : "bg-background border-input text-foreground/90 hover:border-primary/60"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : (
        !condLoading && (
          <p className="text-sm text-muted-foreground/80">
            조건검색식을 불러오려면 새로고침을 눌러주세요.
          </p>
        )
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onSearch}
          disabled={!selectedSeq || searching}
          className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {searching ? "검색 중..." : "조건검색 실행"}
        </button>
        {lastFileName && (
          <button
            onClick={() => onDownload(lastFileName)}
            className="px-4 py-2 border border-input text-foreground/90 text-sm rounded-lg hover:bg-muted/50 transition-colors"
          >
            Excel 다운로드
          </button>
        )}
      </div>

      {searchError && (
        <div className="mt-3 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          {searchError}
        </div>
      )}
    </div>
  );
}

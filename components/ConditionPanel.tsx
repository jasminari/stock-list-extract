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
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">조건검색식 선택</h2>
        <button
          onClick={onRefresh}
          disabled={condLoading}
          className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40"
        >
          {condLoading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {condError && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
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
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : (
        !condLoading && (
          <p className="text-sm text-gray-400">
            조건검색식을 불러오려면 새로고침을 눌러주세요.
          </p>
        )
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onSearch}
          disabled={!selectedSeq || searching}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {searching ? "검색 중..." : "조건검색 실행"}
        </button>
        {lastFileName && (
          <button
            onClick={() => onDownload(lastFileName)}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Excel 다운로드
          </button>
        )}
      </div>

      {searchError && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {searchError}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

// ⋯ 버튼 하나 → 누르면 📥 엑셀 / 🖨 인쇄 메뉴 (💼 영업 정산 화면, 버튼 수 줄이기)
//   바깥을 누르거나 메뉴를 고르면 닫힘
export default function ExportMenu({ onExcel, onPrint }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = (fn) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="sl-more" ref={ref}>
      <button
        type="button"
        className={`sl-more-btn${open ? " is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="엑셀 · 인쇄"
        aria-expanded={open}
        title="엑셀 · 인쇄"
      >
        ⋯
      </button>
      {open && (
        <div className="sl-more-menu" role="menu">
          <button type="button" role="menuitem" onClick={run(onExcel)}>
            📥 엑셀
          </button>
          <button type="button" role="menuitem" onClick={run(onPrint)}>
            🖨 인쇄
          </button>
        </div>
      )}
    </div>
  );
}

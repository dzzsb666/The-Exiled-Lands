import { X, Check, Copy, ExternalLink, MapPin } from "lucide-react";
import type { Category, Point } from "../types";
import { categoryIcon } from "../icons";
interface Props {
  point: Point;
  category: Category;
  found: boolean;
  note: string;
  onClose(): void;
  onFound(): void;
  onNote(note: string): void;
  onShare(): void;
  onFocus(): void;
}
export default function DetailPanel(p: Props) {
  const Icon = categoryIcon(p.category.id);
  return (
    <section className="detail-panel" aria-label="点位详情">
      <div className="detail-top">
        <span style={{ color: p.category.color }}>
          <Icon size={18} />
          {p.category.name || p.category.title}
        </span>
        <button
          className="icon-button"
          aria-label="关闭详情"
          onClick={p.onClose}
        >
          <X size={18} />
        </button>
      </div>
      <h2>{p.point.name || p.point.title}</h2>
      {p.point.name && <p className="english-name">{p.point.title}</p>}
      {!p.point.name && (
        <div className="translation-pending">
          游戏内简体中文待核对，暂保留英文原名。
        </div>
      )}
      {p.point.note && <div className="point-note">{p.point.note}</div>}
      <button
        className={`found-button ${p.found ? "done" : ""}`}
        onClick={p.onFound}
      >
        <Check size={18} />
        {p.found ? "已发现 · 点击取消" : "标为已发现"}
      </button>
      <div className="detail-actions">
        <button onClick={p.onFocus}>
          <MapPin size={14} />
          定位
        </button>
        <button onClick={p.onShare}>
          <Copy size={14} />
          复制链接
        </button>
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://mapgenie.io/conan-exiles/maps/exiled-lands?locationIds=${p.point.id}`}
        >
          <ExternalLink size={14} />
          原始资料
        </a>
      </div>
      <label className="note-label" htmlFor="point-note">
        个人备注 <span>自动保存到本机</span>
      </label>
      <textarea
        id="point-note"
        maxLength={5000}
        rows={4}
        placeholder="记录路线、刷新情况或提醒…"
        value={p.note}
        onChange={(e) => p.onNote(e.target.value)}
      />
      <div className="detail-meta">
        <span>点位 ID {p.point.id}</span>
        <span>
          地图像素 {Math.round(p.point.x)}, {Math.round(p.point.y)}
        </span>
      </div>
      {p.point.translationSource && (
        <details className="translation-source">
          <summary>中文来源</summary>
          <p>{p.point.translationSource}</p>
        </details>
      )}
    </section>
  );
}

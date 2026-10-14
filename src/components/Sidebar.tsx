import {
  Search,
  X,
  ChevronDown,
  Check,
  Download,
  Upload,
  MapPin,
  SlidersHorizontal,
  Languages,
  EyeOff,
} from "lucide-react";
import { categoryIcon } from "../icons";
import type { Category, Group, Point, Progress } from "../types";
import { useState } from "react";
interface Props {
  groups: Group[];
  categories: Category[];
  points: Point[];
  filtered: Point[];
  enabled: Set<number>;
  found: Set<number>;
  progress: Progress;
  query: string;
  tab: string;
  hideFound: boolean;
  onlyPending: boolean;
  onQuery(value: string): void;
  onTab(value: string): void;
  onToggle(id: number): void;
  onGroup(ids: number[]): void;
  onAll(visible: boolean): void;
  onSelect(point: Point): void;
  onHideFound(value: boolean): void;
  onPending(value: boolean): void;
  onClose(): void;
  onExport(): void;
  onImport(): void;
  onPin(id: string): void;
}
export default function Sidebar(p: Props) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const searched = p.query.trim().length > 0;
  return (
    <aside className="sidebar" aria-label="地图筛选">
      <div className="sidebar-heading">
        <div>
          <h1>流放之地</h1>
          <p>
            交互地图 <span>· 中文核对版</span>
          </p>
        </div>
        <button
          className="icon-button mobile-only"
          aria-label="收起筛选"
          onClick={p.onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="sidebar-tabs" role="tablist" aria-label="地图工具">
        {["筛选", "探索进度", "个人标记"].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={p.tab === t}
            className={p.tab === t ? "active" : ""}
            onClick={() => p.onTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="search-box">
        <Search size={17} />
        <input
          aria-label="搜索地点或分类"
          placeholder="搜索地点、配方、分类…"
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
        />
        {p.query && (
          <button aria-label="清空搜索" onClick={() => p.onQuery("")}>
            <X size={15} />
          </button>
        )}
        <kbd>/</kbd>
      </div>
      {p.tab === "筛选" && (
        <>
          <div className="filter-actions">
            <button onClick={() => p.onAll(true)}>显示全部</button>
            <span />
            <button onClick={() => p.onAll(false)}>隐藏全部</button>
            <small>{p.filtered.length.toLocaleString()} 个点位</small>
          </div>
          <div className="quick-filters">
            <button
              className={p.hideFound ? "chosen" : ""}
              onClick={() => p.onHideFound(!p.hideFound)}
            >
              <EyeOff size={13} />
              隐藏已发现
            </button>
            <button
              className={p.onlyPending ? "chosen" : ""}
              onClick={() => p.onPending(!p.onlyPending)}
            >
              <Languages size={13} />
              待核对
            </button>
          </div>
        </>
      )}
      <div className="sidebar-scroll">
        {searched ? (
          <section className="search-results">
            <div className="section-label">
              搜索结果 <span>{p.filtered.length}</span>
            </div>
            {p.filtered.length === 0 ? (
              <div className="empty-state">
                <Search size={26} />
                <p>没有匹配的点位</p>
                <small>可以尝试英文原名，或调整筛选条件。</small>
              </div>
            ) : (
              p.filtered.slice(0, 100).map((point) => {
                const c = p.categories.find((c) => c.id === point.categoryId)!;
                const Icon = categoryIcon(c.id);
                return (
                  <button
                    className="result-row"
                    key={point.id}
                    onClick={() => p.onSelect(point)}
                  >
                    <Icon size={18} style={{ color: c.color }} />
                    <span>
                      <strong>{point.name || point.title}</strong>
                      <small>
                        {c.name || c.title}
                        {!point.name ? " · 中文待核对" : ""}
                      </small>
                    </span>
                    {p.found.has(point.id) && <Check size={15} />}
                  </button>
                );
              })
            )}
            {p.filtered.length > 100 && (
              <p className="muted text-center">
                显示前 100 条，输入更多文字缩小范围。
              </p>
            )}
          </section>
        ) : p.tab === "筛选" ? (
          p.groups.map((g) => {
            const cats = p.categories.filter((c) => c.groupId === g.id);
            const all = cats.every((c) => p.enabled.has(c.id));
            const closed = collapsed.has(g.id);
            return (
              <section className="category-group" key={g.id}>
                <div className="group-title">
                  <button
                    className="group-collapse"
                    aria-expanded={!closed}
                    onClick={() =>
                      setCollapsed((old) => {
                        const s = new Set(old);
                        s.has(g.id) ? s.delete(g.id) : s.add(g.id);
                        return s;
                      })
                    }
                  >
                    <ChevronDown
                      size={13}
                      className={closed ? "collapsed" : ""}
                    />
                    {g.name}
                  </button>
                  <button
                    className="group-all"
                    onClick={() => p.onGroup(cats.map((c) => c.id))}
                  >
                    {all ? "隐藏" : "显示"}
                  </button>
                </div>
                {!closed &&
                  cats.map((c) => {
                    const Icon = categoryIcon(c.id),
                      active = p.enabled.has(c.id);
                    return (
                      <button
                        className={`category-row ${active ? "" : "disabled"}`}
                        key={c.id}
                        aria-pressed={active}
                        onClick={() => p.onToggle(c.id)}
                      >
                        <Icon size={18} style={{ color: c.color }} />
                        <span className="category-name">
                          {c.name || c.title}
                          {!c.name && <i title="游戏内简体中文待确认">?</i>}
                        </span>
                        <span className="category-count">{c.count}</span>
                        <span className={`checkbox ${active ? "checked" : ""}`}>
                          {active && <Check size={11} />}
                        </span>
                      </button>
                    );
                  })}
              </section>
            );
          })
        ) : p.tab === "探索进度" ? (
          <section className="progress-view">
            <h2>我的探索进度</h2>
            <p className="muted">保存在当前浏览器，可导出备份。</p>
            <div className="progress-total">
              <strong>
                {p.found.size}
                <small> / {p.points.length}</small>
              </strong>
              <span>
                {((p.found.size / p.points.length) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="progress-bar">
              <i
                style={{ width: `${(p.found.size / p.points.length) * 100}%` }}
              />
            </div>
            {p.groups.map((g) => {
              const ids = new Set(
                p.categories.filter((c) => c.groupId === g.id).map((c) => c.id),
              );
              const list = p.points.filter((point) =>
                ids.has(point.categoryId),
              );
              const n = list.filter((point) => p.found.has(point.id)).length;
              return (
                <div className="progress-row" key={g.id}>
                  <span>{g.name}</span>
                  <small>
                    {n} / {list.length}
                  </small>
                  <div className="progress-bar">
                    <i
                      style={{
                        width: `${(n / list.length) * 100}%`,
                        background: g.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="backup-actions">
              <button onClick={p.onExport}>
                <Download size={15} />
                导出进度
              </button>
              <button onClick={p.onImport}>
                <Upload size={15} />
                导入进度
              </button>
            </div>
            <div className="info-note">
              进度、备注和个人标记随备份一同保存。清理浏览器数据前，请先导出备份。
            </div>
          </section>
        ) : (
          <section className="pins-view">
            <h2>个人标记</h2>
            <p className="muted">点击地图右上角的标记按钮，再点击地图添加。</p>
            {!p.progress.pins.length ? (
              <div className="empty-state">
                <MapPin size={28} />
                <p>还没有个人标记</p>
                <small>标记基地、路线或想再来的地方。</small>
              </div>
            ) : (
              p.progress.pins.map((pin) => (
                <button
                  key={pin.id}
                  className="result-row"
                  onClick={() => p.onPin(pin.id)}
                >
                  <MapPin size={18} />
                  <span>
                    <strong>{pin.name}</strong>
                    <small>{pin.note || "点击查看或编辑"}</small>
                  </span>
                </button>
              ))
            )}
          </section>
        )}
      </div>
      <div className="sidebar-bottom">
        <SlidersHorizontal size={13} />
        <span>本机保存</span>
        <a href="/data/pending-translations.csv" download>
          <Languages size={14} />
          下载译名核对表
        </a>
      </div>
    </aside>
  );
}

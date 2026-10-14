import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MapIcon,
  Menu,
  Plus,
  Minus,
  Maximize,
  MapPin,
  Type,
  Info,
  X,
  Check,
  ExternalLink,
  Download,
  Undo2,
} from "lucide-react";
import type { MapData, PersonalPin, Point, Progress } from "./types";
import {
  STORAGE_KEY,
  downloadFile,
  loadProgress,
  validateProgress,
} from "./storage";
import MapCanvas from "./components/MapCanvas";
import type { MapApi } from "./components/MapCanvas";
import Sidebar from "./components/Sidebar";
import DetailPanel from "./components/DetailPanel";

export default function App() {
  const [data, setData] = useState<MapData | null>(null),
    [error, setError] = useState("");
  const [progress, setProgress] = useState<Progress>(loadProgress),
    [enabled, setEnabled] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState(""),
    [tab, setTab] = useState("筛选"),
    [hideFound, setHideFound] = useState(false),
    [onlyPending, setOnlyPending] = useState(false);
  const [selected, setSelected] = useState<Point | null>(null),
    [mobileOpen, setMobileOpen] = useState(false),
    [labels, setLabels] = useState(false),
    [addMode, setAddMode] = useState(false);
  const [pinEditor, setPinEditor] = useState<PersonalPin | null>(null),
    [info, setInfo] = useState(false),
    [toast, setToast] = useState(""),
    [undo, setUndo] = useState<PersonalPin | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const updatePosition = useCallback(
    (x: number, y: number) => setPosition({ x, y }),
    [],
  );
  const api = useRef<MapApi | null>(null),
    importInput = useRef<HTMLInputElement>(null),
    initialLink = useRef(false);
  useEffect(() => {
    const c = new AbortController();
    fetch("/data/map.json", { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw new Error("地图数据加载失败");
        return r.json();
      })
      .then((d: MapData) => {
        setData(d);
        setEnabled(new Set(d.categories.map((c) => c.id)));
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("地图数据暂时无法加载，请刷新重试。");
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      setToast("浏览器存储不可用，请导出进度备份。");
    }
  }, [progress]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      setToast("");
      setUndo(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const edit = /INPUT|TEXTAREA|SELECT/.test(
        (e.target as HTMLElement)?.tagName,
      );
      if (e.key === "Escape") {
        setInfo(false);
        setPinEditor(null);
        setAddMode(false);
        setMobileOpen(false);
        setSelected(null);
      }
      if (e.key === "/" && !edit) {
        e.preventDefault();
        setMobileOpen(true);
        document
          .querySelector<HTMLInputElement>('[aria-label="搜索地点或分类"]')
          ?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const found = useMemo(() => new Set(progress.found), [progress.found]);
  const categories = useMemo(
    () => new Map(data?.categories.map((c) => [c.id, c])),
    [data],
  );
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.points.filter((p) => {
      const c = categories.get(p.categoryId)!;
      return (
        (q || enabled.has(p.categoryId)) &&
        (!hideFound || !found.has(p.id)) &&
        (!onlyPending || !p.name) &&
        (!q ||
          [p.name, p.title, c.name, c.title, String(p.id)].some((s) =>
            s?.toLowerCase().includes(q),
          ))
      );
    });
  }, [data, query, enabled, hideFound, found, onlyPending, categories]);
  const select = useCallback((point: Point) => {
    setSelected(point);
    setPinEditor(null);
    setMobileOpen(false);
    api.current?.focus(point);
    const url = new URL(location.href);
    url.searchParams.set("point", String(point.id));
    history.replaceState(null, "", url);
  }, []);
  useEffect(() => {
    if (!data || initialLink.current) return;
    const id = Number(new URLSearchParams(location.search).get("point"));
    const point = data.points.find((p) => p.id === id);
    if (point) {
      select(point);
    }
    initialLink.current = true;
  }, [data, select]);
  const toggle = (id: number) =>
    setEnabled((old) => {
      const s = new Set(old);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  const group = (ids: number[]) =>
    setEnabled((old) => {
      const s = new Set(old),
        all = ids.every((id) => s.has(id));
      for (const id of ids) all ? s.delete(id) : s.add(id);
      return s;
    });
  const closeDetail = () => {
    setSelected(null);
    const url = new URL(location.href);
    url.searchParams.delete("point");
    history.replaceState(null, "", url);
  };
  const markFound = () => {
    if (!selected) return;
    setProgress((old) => ({
      ...old,
      found: found.has(selected.id)
        ? old.found.filter((id) => id !== selected.id)
        : [...old.found, selected.id],
    }));
  };
  const share = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setToast("点位链接已复制");
    } catch {
      setToast("复制失败，可直接复制浏览器地址栏的链接。");
    }
  };
  const exportProgress = () => {
    downloadFile("流放之地-探索进度.json", JSON.stringify(progress, null, 2));
    setToast("探索进度已导出");
  };
  const importProgress = async (file: File) => {
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error("备份文件过大");
      const p = validateProgress(JSON.parse(await file.text()));
      const validIds = new Set(data?.points.map((p) => p.id));
      if (p.found.some((id) => !validIds.has(id)))
        throw new Error("备份包含当前地图不存在的点位");
      setProgress((old) => {
        const pins = new Map(old.pins.map((pin) => [pin.id, pin]));
        p.pins.forEach((pin) => pins.set(pin.id, pin));
        return {
          version: 1,
          found: [...new Set([...old.found, ...p.found])],
          notes: { ...old.notes, ...p.notes },
          pins: [...pins.values()],
        };
      });
      setToast("已合并备份中的进度、备注和标记");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "无法读取备份文件");
    }
  };
  const addPin = (x: number, y: number) => {
    setAddMode(false);
    setPinEditor({ id: crypto.randomUUID(), x, y, name: "", note: "" });
    setSelected(null);
  };
  const savePin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!pinEditor) return;
    const f = new FormData(e.currentTarget),
      name = String(f.get("name")).trim();
    if (!name) return;
    const pin = { ...pinEditor, name, note: String(f.get("note")).trim() };
    setProgress((old) => ({
      ...old,
      pins: [...old.pins.filter((p) => p.id !== pin.id), pin],
    }));
    setPinEditor(null);
    setToast("个人标记已保存");
  };
  const removePin = () => {
    if (!pinEditor) return;
    const removed = pinEditor;
    setProgress((old) => ({
      ...old,
      pins: old.pins.filter((p) => p.id !== removed.id),
    }));
    setPinEditor(null);
    setUndo(removed);
    setToast("个人标记已删除");
  };
  if (error)
    return (
      <div className="load-screen">
        <MapIcon size={34} />
        <h1>{error}</h1>
        <button onClick={() => location.reload()}>重新加载</button>
      </div>
    );
  if (!data)
    return (
      <div className="load-screen">
        <MapIcon size={34} />
        <h1>正在展开流放之地…</h1>
      </div>
    );
  const pending = data.points.filter((p) => !p.name).length;
  return (
    <div className={`app ${mobileOpen ? "sidebar-open" : ""}`}>
      <header className="topbar">
        <button
          className="mobile-menu icon-button"
          aria-label="打开筛选"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={21} />
        </button>
        <div className="brand">
          <MapIcon size={23} />
          <span>
            流放之地
            <span className="brand-divider" />
            交互地图
          </span>
        </div>
        <div className="topbar-right">
          <span className="edition">中文核对版</span>
          <button
            className="about-button"
            aria-label="地图说明"
            onClick={() => setInfo(true)}
          >
            <Info size={15} />
            <span>地图说明</span>
          </button>
          <a
            className="github-link"
            href="https://github.com/dzzsb666/The-Exiled-Lands"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
            <ExternalLink size={12} />
          </a>
        </div>
      </header>
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="收起侧栏"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar
        groups={data.groups}
        categories={data.categories}
        points={data.points}
        filtered={filtered}
        enabled={enabled}
        found={found}
        progress={progress}
        query={query}
        tab={tab}
        hideFound={hideFound}
        onlyPending={onlyPending}
        onQuery={setQuery}
        onTab={setTab}
        onToggle={toggle}
        onGroup={group}
        onAll={(v) =>
          setEnabled(new Set(v ? data.categories.map((c) => c.id) : []))
        }
        onSelect={select}
        onHideFound={setHideFound}
        onPending={setOnlyPending}
        onClose={() => setMobileOpen(false)}
        onExport={exportProgress}
        onImport={() => importInput.current?.click()}
        onPin={(id) => {
          const pin = progress.pins.find((p) => p.id === id);
          if (pin) {
            setPinEditor(pin);
            api.current?.focus(pin);
            setMobileOpen(false);
          }
        }}
      />
      <main className="map-area">
        <MapCanvas
          points={filtered}
          categories={data.categories}
          found={found}
          selected={selected?.id ?? null}
          pins={progress.pins}
          labels={labels}
          addMode={addMode}
          apiRef={api}
          onSelect={select}
          onPinSelect={setPinEditor}
          onAdd={addPin}
          onPosition={updatePosition}
        />
        <div className="map-topline">
          <span>{query ? `搜索：${query}` : "流放之地"}</span>
          <b>{filtered.length.toLocaleString()} 个点位</b>
        </div>
        <div className="map-tools">
          <button
            aria-label="添加个人标记"
            title="添加个人标记"
            className={addMode ? "active" : ""}
            onClick={() => {
              setAddMode(!addMode);
              setSelected(null);
            }}
          >
            <MapPin size={19} />
          </button>
          <button
            aria-label="显示点位名称"
            title="显示点位名称"
            className={labels ? "active" : ""}
            aria-pressed={labels}
            onClick={() => setLabels(!labels)}
          >
            <Type size={19} />
          </button>
        </div>
        <div className="zoom-tools">
          <button
            aria-label="放大地图"
            title="放大地图"
            onClick={() => api.current?.zoomIn()}
          >
            <Plus size={21} />
          </button>
          <button
            aria-label="缩小地图"
            title="缩小地图"
            onClick={() => api.current?.zoomOut()}
          >
            <Minus size={21} />
          </button>
          <button
            aria-label="查看全图"
            title="查看全图"
            onClick={() => api.current?.reset()}
          >
            <Maximize size={17} />
          </button>
        </div>
        {addMode && (
          <div className="add-instruction">
            <MapPin size={16} />
            点击地图放置个人标记
            <button onClick={() => setAddMode(false)}>取消</button>
          </div>
        )}
        {selected && (
          <DetailPanel
            key={selected.id}
            point={selected}
            category={categories.get(selected.categoryId)!}
            found={found.has(selected.id)}
            note={progress.notes[selected.id] || ""}
            onClose={closeDetail}
            onFound={markFound}
            onNote={(note) =>
              setProgress((old) => ({
                ...old,
                notes: { ...old.notes, [selected.id]: note },
              }))
            }
            onShare={share}
            onFocus={() => api.current?.focus(selected)}
          />
        )}
        <div className="map-bottom">
          <span className="coordinate-readout">
            {position
              ? `X ${Math.round(position.x)} · Y ${Math.round(position.y)}`
              : "拖动移动 · 滚轮缩放"}
          </span>
          <span>
            地图 © Funcom <span className="footer-dot">·</span>点位资料{" "}
            <a href={data.source} target="_blank" rel="noreferrer">
              MapGenie
            </a>
          </span>
        </div>
      </main>
      <input
        className="sr-only"
        aria-label="导入探索进度文件"
        type="file"
        accept=".json,application/json"
        ref={importInput}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importProgress(file);
          e.target.value = "";
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          {undo && (
            <button
              onClick={() => {
                setProgress((old) => ({ ...old, pins: [...old.pins, undo] }));
                setUndo(null);
                setToast("已恢复个人标记");
              }}
            >
              <Undo2 size={14} />
              撤销
            </button>
          )}
        </div>
      )}
      {pinEditor && (
        <div className="modal-backdrop" onClick={() => setPinEditor(null)}>
          <section
            className="modal pin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pin-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="pin-title">
                {progress.pins.some((p) => p.id === pinEditor.id)
                  ? "编辑个人标记"
                  : "添加个人标记"}
              </h2>
              <button
                className="icon-button"
                aria-label="关闭标记编辑"
                onClick={() => setPinEditor(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={savePin}>
              <label>
                名称
                <input
                  autoFocus
                  required
                  maxLength={120}
                  name="name"
                  defaultValue={pinEditor.name}
                  placeholder="给这个位置起个名字"
                />
              </label>
              <label>
                备注
                <textarea
                  rows={4}
                  maxLength={5000}
                  name="note"
                  defaultValue={pinEditor.note}
                  placeholder="记录你想记住的事情…"
                />
              </label>
              <p className="muted">
                地图像素 {Math.round(pinEditor.x)}, {Math.round(pinEditor.y)}
              </p>
              <div className="modal-actions">
                {progress.pins.some((p) => p.id === pinEditor.id) && (
                  <button type="button" className="danger" onClick={removePin}>
                    删除标记
                  </button>
                )}
                <button type="button" onClick={() => setPinEditor(null)}>
                  取消
                </button>
                <button className="primary" type="submit">
                  保存标记
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {info && (
        <div className="modal-backdrop" onClick={() => setInfo(false)}>
          <section
            className="modal info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="info-title">地图说明</h2>
              <button
                className="icon-button"
                aria-label="关闭地图说明"
                onClick={() => setInfo(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p>
              包含本地点位快照中的{" "}
              <strong>{data.points.length.toLocaleString()}</strong> 个点位、
              <strong>{data.categories.length}</strong>{" "}
              个分类。可拖动缩放、筛选、搜索、标记已发现和添加个人标记。
            </p>
            <h3>中文名称</h3>
            <p>
              沿用此前已验收地图和用户明确确认的中文名称。还有{" "}
              {pending.toLocaleString()}{" "}
              个点位的中文名称待核对，保留英文原名。分类旁的问号也表示待核对。
            </p>
            <a
              className="download-link"
              href="/data/pending-translations.csv"
              download
            >
              <Download size={16} />
              下载待核对中英对照表
            </a>
            <h3>探索记录</h3>
            <p>
              进度、备注和个人标记保存在当前浏览器；在“探索进度”中可导出备份、导入合并。不同设备之间通过备份文件迁移。
            </p>
            <h3>数据与地图来源</h3>
            <p>
              底图来自 Funcom 官方论坛公开的 4000 × 4000
              地图。点位使用本地保存的 MapGenie
              快照，以十个方尖碑作为控制点投影到底图；控制点最大投影偏差约 13
              像素，未在当前游戏客户端逐点实测。
            </p>
            <p>
              点位原始 ID
              和英文名称保留在详情中，可跳转查看原始资料。原站的账号、评论、付费内容及说明图片未导入；本网站使用独立实现的交互功能。
            </p>
            <p className="muted">
              点位快照：{data.snapshotDate} · 游戏地图与素材权利归各自权利人。
            </p>
            <a
              href="https://forums.funcom.com/t/is-there-an-unmarked-map-of-the-exiled-lands-siptah/225634/5"
              target="_blank"
              rel="noreferrer"
            >
              底图来源 <ExternalLink size={12} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}

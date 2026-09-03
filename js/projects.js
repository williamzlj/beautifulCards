// projects.js - 多项目管理（本地 localStorage）
// 每个项目保存：{ id, name, input, meta, cards, createdAt, updatedAt }
// 模板/参数为全局共享，不随项目切换变化。
// 只读查看模式：body.view-mode，隐藏编辑入口，仅查看；用 hash #view=<projectId> 标识。
window.Projects = (function() {
  'use strict';

  // ===== DOM 引用 =====
  const $ = id => document.getElementById(id);
  let els = {};
  let currentId = null;
  let suppressSave = false;  // 切换项目加载快照时避免回写

  // 安全取元素（不存在则 null，避免在 editor.html 未包含项目面板时报错）
  function el(id) {
    return $(id);
  }

  function genId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function init() {
    els = {
      select: $('proj-select'),
      btnNew: $('proj-new'),
      btnRename: $('proj-rename'),
      btnDup: $('proj-dup'),
      btnUp: $('proj-up'),
      btnDown: $('proj-down'),
      btnExport: $('proj-export'),
      btnImport: $('proj-import'),
      btnDelete: $('proj-delete'),
      btnView: $('proj-view'),
      importFile: $('proj-import-file'),
      exitView: $('exit-view-btn'),
      input: $('input-text'),
      metaBook: $('meta-book'),
      metaAuthor: $('meta-author'),
      metaDate: $('meta-date'),
      metaNote: $('meta-note')
    };

    // 首次使用：若无项目，用当前界面数据建一个默认项目
    let projects = window.Storage.listProjects();
    if (projects.order.length === 0) {
      const snap = window.appAPI ? window.appAPI.getSnapshot() : { input: '', meta: {}, cards: [] };
      const p = {
        id: genId(),
        name: '默认项目',
        input: snap.input,
        meta: snap.meta,
        cards: snap.cards,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      window.Storage.saveProject(p);
      window.Storage.setActiveProjectId(p.id);
    }

    // 决定当前项目：URL 中的 ?id=xxx（必填），否则回退到活动项目
    const query = parseQuery();
    let startMode = query.mode === 'view' ? 'view' : 'edit';
    const hashId = parseViewHash();
    currentId = query.id || hashId || window.Storage.getActiveProjectId();
    if (!currentId || !window.Storage.getProject(currentId)) {
      currentId = window.Storage.listProjects().order[0];
    }

    bindEvents();
    refreshSelect();

    // 顶栏显示项目名
    const titleBar = document.getElementById('proj-title-bar');
    if (titleBar) {
      const p = window.Storage.getProject(currentId);
      if (p) titleBar.textContent = '· ' + p.name + (startMode === 'view' ? '（只读）' : '');
    }

    // 先加载项目
    loadProject(currentId);

    // 如果 mode=view，切到只读查看（此时 loadProject 已完成）
    if (startMode === 'view' || hashId) {
      enterView(currentId, true);
    }
  }

  function parseQuery() {
    const q = new URLSearchParams(location.search || '');
    return { id: q.get('id'), mode: (q.get('mode') || 'edit') };
  }
  function parseViewHash() {
    return null; // editor 页不再用 hash，走 query
  }

  function bindEvents() {
    if (els.select)     els.select.addEventListener('change', () => switchTo(els.select.value));
    if (els.btnNew)     els.btnNew.addEventListener('click', newProject);
    if (els.btnRename)  els.btnRename.addEventListener('click', renameProject);
    if (els.btnDup)     els.btnDup.addEventListener('click', duplicateProject);
    if (els.btnUp)      els.btnUp.addEventListener('click', () => moveProject(-1));
    if (els.btnDown)    els.btnDown.addEventListener('click', () => moveProject(1));
    if (els.btnExport)  els.btnExport.addEventListener('click', exportProject);
    if (els.btnImport)  els.btnImport.addEventListener('click', () => els.importFile.click());
    if (els.btnDelete)  els.btnDelete.addEventListener('click', deleteProject);
    if (els.btnView)    els.btnView.addEventListener('click', () => enterView(currentId, false));
    if (els.exitView)   els.exitView.addEventListener('click', () => exitView());
    if (els.importFile) els.importFile.addEventListener('change', onImportFile);

    // 自动保存：输入文本 / 卡片信息变化时写回当前项目
    const saveDebounced = debounce(() => saveCurrent(), 600);
    [els.input, els.metaBook, els.metaAuthor, els.metaDate, els.metaNote].forEach(el => {
      if (el) el.addEventListener('input', () => { if (!suppressSave) saveDebounced(); });
    });

    // hash 变化（如浏览器后退）
    window.addEventListener('hashchange', () => {
      const id = parseViewHash();
      if (id) enterView(id, true);
      else exitView(true);
    });
  }

  // ===== 列表渲染 =====
  function refreshSelect() {
    if (!els.select) return;
    const projects = window.Storage.listProjects();
    els.select.innerHTML = '';
    projects.order.forEach(id => {
      const p = projects.byId[id];
      if (!p) return;
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = p.name;
      els.select.appendChild(opt);
    });
    if (currentId) els.select.value = currentId;
  }

  function orderedList() {
    const projects = window.Storage.listProjects();
    return projects.order.map(id => projects.byId[id]).filter(Boolean);
  }

  // ===== 切换 / 加载 =====
  function saveCurrent() {
    if (suppressSave || !currentId) return;
    const p = window.Storage.getProject(currentId);
    if (!p) return;
    const snap = window.appAPI ? window.appAPI.getSnapshot() : null;
    if (!snap) return;
    p.input = snap.input;
    p.meta = snap.meta;
    p.cards = snap.cards;
    p.updatedAt = Date.now();
    window.Storage.saveProject(p);
  }

  function loadProject(id) {
    const p = window.Storage.getProject(id);
    if (!p) return;
    currentId = id;
    window.Storage.setActiveProjectId(id);
    suppressSave = true;
    if (window.appAPI) window.appAPI.loadSnapshot({ input: p.input, meta: p.meta, cards: p.cards });
    suppressSave = false;
    if (els.select && els.select.value !== id) els.select.value = id;
  }

  function switchTo(id) {
    if (id === currentId) return;
    saveCurrent();
    // 若当前在只读模式，退出后切换
    if (document.body.classList.contains('view-mode')) exitView(true);
    loadProject(id);
  }

  // ===== CRUD =====
  function newProject() {
    const name = prompt('新项目名称：', '项目 ' + (orderedList().length + 1));
    if (!name) return;
    saveCurrent();
    const p = {
      id: genId(),
      name: name,
      input: '',
      meta: { book: '', author: '', date: '', note: '' },
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    window.Storage.saveProject(p);
    refreshSelect();
    loadProject(p.id);
    toast('已新建项目「' + name + '」');
  }

  function renameProject() {
    const p = window.Storage.getProject(currentId);
    if (!p) return;
    const name = prompt('重命名项目：', p.name);
    if (!name) return;
    p.name = name;
    p.updatedAt = Date.now();
    window.Storage.saveProject(p);
    refreshSelect();
    toast('已重命名为「' + name + '」');
  }

  function duplicateProject() {
    saveCurrent();
    const src = window.Storage.getProject(currentId);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = genId();
    copy.name = src.name + ' 副本';
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();
    window.Storage.saveProject(copy);
    // 放到源项目后面（saveProject 会在末尾追加，这里先去除再插入到源项目之后）
    const projects = window.Storage.listProjects();
    const order = projects.order.filter(id => id !== copy.id);
    const idx = order.indexOf(src.id);
    order.splice(Math.min(idx + 1, order.length), 0, copy.id);
    window.Storage.reorderProjects(order);
    refreshSelect();
    loadProject(copy.id);
    toast('已复制为「' + copy.name + '」');
  }

  function deleteProject() {
    const p = window.Storage.getProject(currentId);
    if (!p) return;
    if (!confirm('确定删除项目「' + p.name + '」？此操作不可恢复。')) return;
    window.Storage.deleteProject(currentId);
    const remaining = window.Storage.listProjects().order;
    if (remaining.length > 0) {
      refreshSelect();
      loadProject(remaining[0]);
    } else {
      // 删光了：直接新建一个空项目（避免重复 init 绑定事件）
      const fresh = {
        id: genId(),
        name: '默认项目',
        input: '',
        meta: { book: '', author: '', date: '', note: '' },
        cards: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      window.Storage.saveProject(fresh);
      refreshSelect();
      loadProject(fresh.id);
    }
    toast('已删除');
  }

  function moveProject(dir) {
    const projects = window.Storage.listProjects();
    const order = projects.order.slice();
    const idx = order.indexOf(currentId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= order.length) return;
    const tmp = order[idx];
    order[idx] = order[target];
    order[target] = tmp;
    window.Storage.reorderProjects(order);
    refreshSelect();
  }

  // ===== 导入 / 导出 =====
  function exportProject() {
    saveCurrent();
    const p = window.Storage.getProject(currentId);
    if (!p) return;
    const data = {
      app: 'beautifulCards',
      type: 'project',
      name: p.name,
      input: p.input,
      meta: p.meta,
      cards: p.cards,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '卡片项目-' + p.name + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('已导出项目文件');
  }

  function onImportFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || (data.type !== 'project' && typeof data.input === 'undefined')) {
          toast('文件格式不正确');
          return;
        }
        saveCurrent();
        const p = {
          id: genId(),
          name: data.name || '导入的项目',
          input: data.input || '',
          meta: data.meta || { book: '', author: '', date: '', note: '' },
          cards: data.cards || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        window.Storage.saveProject(p);
        refreshSelect();
        loadProject(p.id);
        toast('已导入项目「' + p.name + '」');
      } catch (err) {
        toast('解析文件失败');
      }
    };
    reader.readAsText(file);
  }

  // ===== 只读查看模式 =====
  function enterView(id, fromHash) {
    const p = window.Storage.getProject(id);
    if (!p) { toast('项目不存在'); return; }
    // 进入只读前先保存当前编辑，再加载目标项目
    if (!document.body.classList.contains('view-mode')) saveCurrent();
    currentId = id;
    window.Storage.setActiveProjectId(id);
    refreshSelect();
    suppressSave = true;
    if (window.appAPI) window.appAPI.loadSnapshot({ input: p.input, meta: p.meta, cards: p.cards });
    suppressSave = false;
    document.body.classList.add('view-mode');
    els.exitView.style.display = 'block';
    const titleBar = document.getElementById('proj-title-bar');
    if (titleBar) titleBar.textContent = '· ' + p.name + '（只读）';
    if (!fromHash) {
      history.pushState(null, '', '#view=' + id);
    }
  }

  function exitView(keepHash) {
    // 仅移除 view-mode 外观
    document.body.classList.remove('view-mode');
    if (els.exitView) els.exitView.style.display = 'none';
    // editor 页的退出按钮：直接跳回项目管理首页
    if (els.exitView && location.pathname.endsWith('editor.html')) {
      // 延迟跳转，避免误触
      setTimeout(() => { location.href = 'index.html'; }, 30);
      return;
    }
    if (!keepHash && location.hash) {
      try { history.pushState(null, '', location.pathname + location.search); } catch (e) {}
    }
    // 退出只读回到活动项目
    const active = window.Storage.getActiveProjectId();
    if (active) loadProject(active);
  }

  // ===== 工具 =====
  function debounce(fn, ms) {
    let t;
    return function() {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.style.display = 'none'; }, 2000);
  }

  return {
    init,
    saveCurrent
  };
})();

// app.js - 主应用逻辑
(function() {
  'use strict';

  // ===== 全局状态 =====
  const state = {
    cards: [],            // 卡片数据 [{id, title, body}]
    mode: 'grid',         // grid | page
    pageIndex: 0,         // 翻页模式当前索引
    editingCardId: null,
    exportType: 'image',  // image | pdf
    gridSize: 'M',        // 网格显示宽度 S=5/行 M=4/行 L=3/行 XL=2/行
    pageZoom: 1           // 翻页模式缩放（0.5 ~ 2）
  };

  // 网格宽度 → 每行卡片数
  const GRID_COLS = { S: 5, M: 4, L: 3, XL: 2 };

  // ===== DOM 引用 =====
  const $ = id => document.getElementById(id);
  const els = {
    templateSelect: $('template-select'),
    sizeSelect: $('size-select'),
    gridSizeSelect: $('grid-size-select'),
    pageFabPrev: $('page-fab-prev'),
    pageFabNext: $('page-fab-next'),
    pageZoomBox: $('page-zoom'),
    pPageZoom: $('p-page-zoom'),
    vPageZoom: $('v-page-zoom'),
    btnZoomReset: $('btn-zoom-reset'),
    exportImgWidth: $('export-img-width'),
    btnTplLib: $('btn-tpl-lib'),
    tplLibModal: $('tpl-lib-modal'),
    tplLibParamList: $('tpl-lib-param-list'),
    tplLibVisualList: $('tpl-lib-visual-list'),
    tplLibClose: $('tpl-lib-close'),
    input: $('input-text'),
    btnParse: $('btn-parse'),
    btnClearInput: $('btn-clear-input'),
    btnSaveTemplate: $('btn-save-template'),
    toggleSidebar: $('toggle-sidebar'),
    btnExportPng: $('btn-export-png'),
    btnExportPdf: $('btn-export-pdf'),
    previewArea: $('preview-area'),
    emptyHint: $('empty-hint'),
    cardCount: $('card-count'),
    pageNav: $('page-nav'),
    pageInfo: $('page-info'),
    btnPrev: $('btn-prev'),
    btnNext: $('btn-next'),
    btnFirst: $('btn-first'),
    btnLast: $('btn-last'),
    btnModeButtons: document.querySelectorAll('.btn-mode'),
    // 参数控件
    pBgColor: $('p-bg-color'),
    pTitleColor: $('p-title-color'),
    pTextColor: $('p-text-color'),
    pTitleSize: $('p-title-size'),
    vTitleSize: $('v-title-size'),
    pTextSize: $('p-text-size'),
    vTextSize: $('v-text-size'),
    pFont: $('p-title-font'),         // 兼容旧引用（实际指向标题字体）
    pAlign: $('p-title-align'),       // 兼容旧引用（实际指向标题对齐）
    pTitleFont: $('p-title-font'),
    pTitleAlign: $('p-title-align'),
    pTextFont: $('p-text-font'),
    pTextAlign: $('p-text-align'),
    pPadding: $('p-padding'),
    vPadding: $('v-padding'),
    pPadX: $('p-pad-x'),
    vPadX: $('v-pad-x'),
    pPadTop: $('p-pad-top'),
    vPadTop: $('v-pad-top'),
    pPadBottom: $('p-pad-bottom'),
    vPadBottom: $('v-pad-bottom'),
    pLineHeight: $('p-line-height'),
    vLineHeight: $('v-line-height'),
    pDecor: $('p-decor'),
    pNoteSize: $('p-note-size'),
    vNoteSize: $('v-note-size'),
    pBookSize: $('p-book-size'),
    vBookSize: $('v-book-size'),
    pAuthorSize: $('p-author-size'),
    vAuthorSize: $('v-author-size'),
    pAuthorPad: $('p-author-pad'),
    vAuthorPad: $('v-author-pad'),
    pDateSize: $('p-date-size'),
    vDateSize: $('v-date-size'),
    pPageSize: $('p-page-size'),
    vPageSize: $('v-page-size'),
    pShowNumber: $('p-show-number'),
    // 编辑弹层
    editModal: $('edit-modal'),
    editTitle: $('edit-title'),
    editBody: $('edit-body'),
    editCancel: $('edit-cancel'),
    editSave: $('edit-save'),
    // 导出弹层
    exportModal: $('export-modal'),
    exportTitle: $('export-title'),
    exportImageOptions: $('export-image-options'),
    exportPdfOptions: $('export-pdf-options'),
    exportImgFormat: $('export-img-format'),
    exportPdfSize: $('export-pdf-size'),
    exportPdfPerPage: $('export-pdf-per-page'),
    exportCancel: $('export-cancel'),
    exportConfirm: $('export-confirm'),
    toast: $('toast'),
    // 全局卡片信息
    metaBook: $('meta-book'),
    metaAuthor: $('meta-author'),
    metaDate: $('meta-date'),
    metaNote: $('meta-note'),
    // 编辑弹窗中的备注
    editNote: $('edit-note')
  };

  // ===== 初始化 =====
  function init() {
    refreshTemplateList();

    // 恢复上次模板与参数（预设 / 参数模板 / 可视化模板均记忆）
    const last = window.Storage.loadLastParams();
    if (last && last.template) {
      const sel = last.template;
      const exists = Array.from(els.templateSelect.options).some(o => o.value === sel);
      if (exists && (sel.startsWith('custom:') || sel.startsWith('visual:'))) {
        els.templateSelect.value = sel;
        applyTemplateSelection();
      } else if (window.TEMPLATES[sel]) {
        els.templateSelect.value = sel;
        window.CURRENT_TEMPLATE = sel;
        window.CURRENT_PARAMS = { ...window.TEMPLATES[sel].params, ...(last.params || {}) };
      } else {
        els.templateSelect.value = window.CURRENT_TEMPLATE;
      }
    } else {
      els.templateSelect.value = window.CURRENT_TEMPLATE;
    }
    normalizeParams();

    // 恢复视图状态（卡片尺寸、网格显示宽度、翻页缩放）
    const lastView = window.Storage.loadViewState();
    if (lastView) {
      if (lastView.size && els.sizeSelect.querySelector('option[value="' + lastView.size + '"]')) {
        els.sizeSelect.value = lastView.size;
        window.CURRENT_SIZE = lastView.size;
      }
      if (lastView.gridSize && GRID_COLS[lastView.gridSize]) {
        state.gridSize = lastView.gridSize;
        els.gridSizeSelect.value = lastView.gridSize;
      }
      if (lastView.pageZoom) {
        state.pageZoom = Math.min(2, Math.max(0.5, lastView.pageZoom));
        els.pPageZoom.value = Math.round(state.pageZoom * 100);
        els.vPageZoom.textContent = Math.round(state.pageZoom * 100) + '%';
      }
    }

    // 恢复上次输入
    const lastInput = window.Storage.loadLastInput();
    if (lastInput) els.input.value = lastInput;

    // 恢复全局卡片信息
    const lastMeta = window.Storage.loadMeta();
    if (lastMeta) {
      window.META = { ...window.META, ...lastMeta };
    }
    syncMetaToUI();

    bindEvents();
    syncParamsToUI();
    render();

    // 暴露 appState 给 template-editor 使用
    window.appState = {
      get cards() { return state.cards; },
      onCustomTemplateSaved: function(name) {
        refreshTemplateList();
        // 切换到新保存的模板
        els.templateSelect.value = 'visual:' + name;
        applyTemplateSelection();
      }
    };

    // 暴露项目数据接口给 projects.js
    window.appAPI = {
      // 读取当前项目快照
      getSnapshot() {
        return {
          input: els.input.value,
          meta: { ...window.META },
          cards: JSON.parse(JSON.stringify(state.cards))
        };
      },
      // 加载某个项目快照到界面
      loadSnapshot(data) {
        data = data || {};
        els.input.value = data.input || '';
        window.META = { book: '', author: '', date: '', note: '', ...(data.meta || {}) };
        let cards = data.cards || [];
        // 无卡片但有输入文本时自动解析，刷新后即可见
        if (cards.length === 0 && data.input && data.input.trim() && window.parseInput) {
          cards = window.parseInput(data.input);
        }
        state.cards = cards;
        state.pageIndex = 0;
        syncMetaToUI();
        render();
      },
      // 卡片解析/编辑后通知项目保存
      notifyCardsChanged() {
        if (window.Projects && typeof window.Projects.saveCurrent === 'function') {
          window.Projects.saveCurrent();
        }
      }
    };

    // 初始化多项目管理
    if (window.Projects && typeof window.Projects.init === 'function') {
      window.Projects.init();
    }
  }

  // 刷新模板下拉（预设 + 参数模板 + 可视化模板 + 新建）
  function refreshTemplateList() {
    // 保留当前选中的值
    const prevValue = els.templateSelect.value;
    els.templateSelect.innerHTML = '';
    // 预设模板
    Object.keys(window.TEMPLATES).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = window.TEMPLATES[key].name;
      els.templateSelect.appendChild(opt);
    });
    // 分隔
    const sep1 = document.createElement('option');
    sep1.disabled = true;
    sep1.textContent = '── 参数模板 ──';
    els.templateSelect.appendChild(sep1);
    // 用户保存的参数模板
    const saved = window.Storage.listTemplates();
    Object.keys(saved).forEach(name => {
      const opt = document.createElement('option');
      opt.value = 'custom:' + name;
      opt.textContent = '★ ' + name;
      els.templateSelect.appendChild(opt);
    });
    // 分隔
    const sep2 = document.createElement('option');
    sep2.disabled = true;
    sep2.textContent = '── 可视化模板 ──';
    els.templateSelect.appendChild(sep2);
    // 已保存的可视化模板
    const visual = window.Storage.listCustomTemplates();
    Object.keys(visual).forEach(name => {
      const opt = document.createElement('option');
      opt.value = 'visual:' + name;
      opt.textContent = '✦ ' + name;
      els.templateSelect.appendChild(opt);
    });
    // 新建可视化模板
    const newOpt = document.createElement('option');
    newOpt.value = 'visual:new';
    newOpt.textContent = '✚ 新建可视化模板';
    els.templateSelect.appendChild(newOpt);
    // 还原之前的选中
    if (prevValue) {
      const exists = Array.from(els.templateSelect.options).some(o => o.value === prevValue);
      if (exists) els.templateSelect.value = prevValue;
    }
  }

  // ===== 参数规范化（兼容旧数据：把 font/align 拆成标题/正文各一份） =====
  function normalizeParams() {
    const p = window.CURRENT_PARAMS;
    const baseFont = p.font || "'LXGW WenKai TC', serif";
    const baseAlign = p.align || 'left';
    if (!p.titleFont)  p.titleFont  = baseFont;
    if (!p.titleAlign) p.titleAlign = baseAlign;
    if (!p.textFont)   p.textFont   = baseFont;
    if (!p.textAlign)  p.textAlign  = baseAlign;
    if (p.noteSize == null)   p.noteSize   = 15;
    if (p.bookSize == null)   p.bookSize   = 16;
    if (p.authorSize == null) p.authorSize = 17;
    if (p.authorPad == null)  p.authorPad  = 0;
    if (p.dateSize == null)   p.dateSize   = 12;
    if (p.pageSize == null)   p.pageSize   = 76;
    if (p.showNumber == null) p.showNumber = true;
    // 独立边距（在基础内边距上叠加）
    if (p.padX == null)      p.padX      = 0;
    if (p.padTop == null)    p.padTop    = 0;
    if (p.padBottom == null) p.padBottom = 0;
    // 同步回 font/align，保持旧字段一致（footer/header 继承用）
    p.font = p.textFont;
    p.align = p.textAlign;
  }

  // ===== META 字段同步 =====
  function syncMetaToUI() {
    els.metaBook.value = window.META.book || '';
    els.metaAuthor.value = window.META.author || '';
    els.metaDate.value = window.META.date || '';
    els.metaNote.value = window.META.note || '';
  }
  function readMetaFromUI() {
    window.META.book = els.metaBook.value;
    window.META.author = els.metaAuthor.value;
    window.META.date = els.metaDate.value;
    window.META.note = els.metaNote.value;
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    els.btnParse.addEventListener('click', onParse);
    els.btnClearInput.addEventListener('click', () => {
      if (!els.input.value.trim()) return;
      if (!confirm('确定清空文本框内容？')) return;
      els.input.value = '';
      els.input.focus();
    });
    els.input.addEventListener('input', debounce(() => {
      window.Storage.saveLastInput(els.input.value);
    }, 500));

    // 全局卡片信息输入
    const onMetaChange = debounce(() => {
      readMetaFromUI();
      render();
      window.Storage.saveMeta(window.META);
    }, 200);
    [els.metaBook, els.metaAuthor, els.metaDate, els.metaNote].forEach(el =>
      el.addEventListener('input', onMetaChange)
    );

    els.templateSelect.addEventListener('change', onTemplateChange);
    els.sizeSelect.addEventListener('change', () => {
      window.CURRENT_SIZE = els.sizeSelect.value;
      render();
      saveViewState();
    });

    // 网格显示宽度（每行卡片数）
    els.gridSizeSelect.addEventListener('change', () => {
      state.gridSize = els.gridSizeSelect.value;
      render();
      saveViewState();
    });

    // 翻页缩放
    els.pPageZoom.addEventListener('input', () => {
      state.pageZoom = +els.pPageZoom.value / 100;
      els.vPageZoom.textContent = els.pPageZoom.value + '%';
      render();
      saveViewState();
    });
    // 重置缩放
    els.btnZoomReset.addEventListener('click', () => {
      state.pageZoom = 1;
      els.pPageZoom.value = 100;
      els.vPageZoom.textContent = '100%';
      render();
      saveViewState();
      toast('缩放已重置为 100%');
    });

    // 模式切换
    els.btnModeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        els.btnModeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        els.pageNav.style.display = state.mode === 'page' ? 'flex' : 'none';
        render();
      });
    });

    // 翻页
    els.btnPrev.addEventListener('click', () => gotoPage(state.pageIndex - 1));
    els.btnNext.addEventListener('click', () => gotoPage(state.pageIndex + 1));
    els.btnFirst.addEventListener('click', () => gotoPage(0));
    els.btnLast.addEventListener('click', () => gotoPage(state.cards.length - 1));
    // 翻页模式左右大号圆形按钮
    els.pageFabPrev.addEventListener('click', () => gotoPage(state.pageIndex - 1));
    els.pageFabNext.addEventListener('click', () => gotoPage(state.pageIndex + 1));

    // 模板库管理
    els.btnTplLib.addEventListener('click', openTplLib);
    els.tplLibClose.addEventListener('click', () => els.tplLibModal.style.display = 'none');
    els.tplLibModal.addEventListener('click', e => {
      if (e.target === els.tplLibModal) els.tplLibModal.style.display = 'none';
    });

    // 参数变更 → 实时重渲染
    const onParamChange = debounce(() => {
      readParamsFromUI();
      render();
      window.Storage.saveLastParams(els.templateSelect.value, window.CURRENT_PARAMS);
    }, 100);
    [els.pBgColor, els.pTitleColor, els.pTextColor, els.pTitleSize, els.pTextSize,
     els.pTitleFont, els.pTitleAlign, els.pTextFont, els.pTextAlign,
     els.pPadding, els.pPadX, els.pPadTop, els.pPadBottom,
     els.pLineHeight, els.pDecor, els.pNoteSize,
     els.pBookSize, els.pAuthorSize, els.pAuthorPad, els.pDateSize, els.pPageSize, els.pShowNumber
    ].forEach(el => el.addEventListener('input', onParamChange));
    [els.pTitleSize, els.pTextSize, els.pPadding, els.pPadX, els.pPadTop, els.pPadBottom,
     els.pLineHeight, els.pNoteSize,
     els.pBookSize, els.pAuthorSize, els.pAuthorPad, els.pDateSize, els.pPageSize
    ].forEach(el => {
      el.addEventListener('input', () => updateRangeLabels());
    });

    // 保存模板
    els.btnSaveTemplate.addEventListener('click', onSaveTemplate);

    // 隐藏/显示编辑面板
    els.toggleSidebar.addEventListener('change', () => {
      const hidden = els.toggleSidebar.checked;
      document.querySelector('.sidebar').style.display = hidden ? 'none' : '';
      document.body.classList.toggle('sidebar-hidden', hidden);
      // 隐藏面板时让预览区重新布局
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    });

    // 导出
    els.btnExportPng.addEventListener('click', () => openExportModal('image'));
    els.btnExportPdf.addEventListener('click', () => openExportModal('pdf'));
    els.exportCancel.addEventListener('click', () => els.exportModal.style.display = 'none');
    els.exportConfirm.addEventListener('click', onExportConfirm);

    // 编辑弹层
    els.editCancel.addEventListener('click', () => els.editModal.style.display = 'none');
    els.editSave.addEventListener('click', onEditSave);

    // 键盘：左右翻页
    document.addEventListener('keydown', e => {
      if (els.editModal.style.display !== 'none' ||
          els.exportModal.style.display !== 'none') return;
      if (state.mode !== 'page' || state.cards.length === 0) return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') gotoPage(state.pageIndex - 1);
      if (e.key === 'ArrowRight') gotoPage(state.pageIndex + 1);
      if (e.key === 'Home') gotoPage(0);
      if (e.key === 'End') gotoPage(state.cards.length - 1);
    });

    // 窗口尺寸变化时重渲染（翻页模式按可用空间留白）
    window.addEventListener('resize', debounce(() => render(), 200));
  }

  // ===== 解析文本 =====
  function onParse() {
    const text = els.input.value;
    state.cards = window.parseInput(text);
    state.pageIndex = 0;
    window.Storage.saveLastInput(text);
    render();
    if (window.appAPI) window.appAPI.notifyCardsChanged();
    toast('已生成 ' + state.cards.length + ' 张卡片');
  }

  // ===== 模板切换 =====
  function onTemplateChange() {
    applyTemplateSelection();
  }
  // 根据下拉当前值应用对应模板（预设 / 参数模板 / 可视化模板 / 新建）
  function applyTemplateSelection() {
    const val = els.templateSelect.value;
    // 新建可视化模板：打开编辑器，下拉值回退
    if (val === 'visual:new') {
      // 找回之前选中的预设/自定义值
      const prev = window.CURRENT_TEMPLATE_TYPE === 'custom'
        ? ('visual:' + (window._lastCustomName || ''))
        : window.CURRENT_TEMPLATE;
      els.templateSelect.value = prev || window.CURRENT_TEMPLATE;
      window.TemplateEditor.open(null);
      return;
    }
    // 已保存的可视化模板
    if (val.startsWith('visual:')) {
      const name = val.slice(7);
      const visual = window.Storage.listCustomTemplates();
      if (visual[name]) {
        window.CURRENT_TEMPLATE_TYPE = 'custom';
        window.CURRENT_CUSTOM_DATA = visual[name];
        window._lastCustomName = name;
        // 参数面板对自定义模板无意义，禁用
        setParamsPanelEnabled(false);
        render();
        window.Storage.saveLastParams(els.templateSelect.value, window.CURRENT_PARAMS);
        return;
      }
    }
    // 参数级自定义模板
    if (val.startsWith('custom:')) {
      const name = val.slice(7);
      const saved = window.Storage.listTemplates();
      if (saved[name]) {
        window.CURRENT_TEMPLATE_TYPE = 'preset';
        window.CURRENT_TEMPLATE = saved[name].template;
        window.CURRENT_PARAMS = { ...saved[name].params };
        setParamsPanelEnabled(true);
      }
    } else if (window.TEMPLATES[val]) {
      // 预设模板
      window.CURRENT_TEMPLATE_TYPE = 'preset';
      window.CURRENT_TEMPLATE = val;
      window.CURRENT_PARAMS = { ...window.TEMPLATES[val].params };
      setParamsPanelEnabled(true);
    }
    normalizeParams();
    syncParamsToUI();
    render();
    window.Storage.saveLastParams(els.templateSelect.value, window.CURRENT_PARAMS);
  }

  // 启用/禁用参数面板（自定义可视化模板时不适用）
  function setParamsPanelEnabled(enabled) {
    const panel = document.getElementById('params-panel');
    if (!panel) return;
    panel.style.opacity = enabled ? '1' : '0.4';
    panel.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  // ===== UI 同步 =====
  function syncParamsToUI() {
    const p = window.CURRENT_PARAMS;
    els.pBgColor.value = p.bgColor;
    els.pTitleColor.value = p.titleColor;
    els.pTextColor.value = p.textColor;
    els.pTitleSize.value = p.titleSize;
    els.vTitleSize.textContent = p.titleSize;
    els.pTextSize.value = p.textSize;
    els.vTextSize.textContent = p.textSize;
    els.pTitleFont.value = p.titleFont || p.font;
    els.pTitleAlign.value = p.titleAlign || p.align;
    els.pTextFont.value = p.textFont || p.font;
    els.pTextAlign.value = p.textAlign || p.align;
    els.pPadding.value = p.padding;
    els.vPadding.textContent = p.padding;
    els.pPadX.value = p.padX;
    els.vPadX.textContent = p.padX;
    els.pPadTop.value = p.padTop;
    els.vPadTop.textContent = p.padTop;
    els.pPadBottom.value = p.padBottom;
    els.vPadBottom.textContent = p.padBottom;
    els.pLineHeight.value = Math.round(p.lineHeight * 100);
    els.vLineHeight.textContent = p.lineHeight;
    els.pDecor.checked = p.decor;
    els.pNoteSize.value = p.noteSize;
    els.vNoteSize.textContent = p.noteSize;
    els.pBookSize.value = p.bookSize;
    els.vBookSize.textContent = p.bookSize;
    els.pAuthorSize.value = p.authorSize;
    els.vAuthorSize.textContent = p.authorSize;
    els.pAuthorPad.value = p.authorPad;
    els.vAuthorPad.textContent = p.authorPad;
    els.pDateSize.value = p.dateSize;
    els.vDateSize.textContent = p.dateSize;
    els.pPageSize.value = p.pageSize;
    els.vPageSize.textContent = p.pageSize;
    els.pShowNumber.checked = p.showNumber !== false;
  }
  function readParamsFromUI() {
    const p = window.CURRENT_PARAMS;
    p.bgColor = els.pBgColor.value;
    p.titleColor = els.pTitleColor.value;
    p.textColor = els.pTextColor.value;
    p.titleSize = +els.pTitleSize.value;
    p.textSize = +els.pTextSize.value;
    p.titleFont = els.pTitleFont.value;
    p.titleAlign = els.pTitleAlign.value;
    p.textFont = els.pTextFont.value;
    p.textAlign = els.pTextAlign.value;
    // 保持 font/align 与正文字体/对齐一致，供 header/footer 继承
    p.font = p.textFont;
    p.align = p.textAlign;
    p.padding = +els.pPadding.value;
    p.padX = +els.pPadX.value;
    p.padTop = +els.pPadTop.value;
    p.padBottom = +els.pPadBottom.value;
    p.lineHeight = +els.pLineHeight.value / 100;
    p.decor = els.pDecor.checked;
    p.noteSize = +els.pNoteSize.value;
    p.bookSize = +els.pBookSize.value;
    p.authorSize = +els.pAuthorSize.value;
    p.authorPad = +els.pAuthorPad.value;
    p.dateSize = +els.pDateSize.value;
    p.pageSize = +els.pPageSize.value;
    p.showNumber = els.pShowNumber.checked;
  }
  function updateRangeLabels() {
    els.vTitleSize.textContent = els.pTitleSize.value;
    els.vTextSize.textContent = els.pTextSize.value;
    els.vPadding.textContent = els.pPadding.value;
    els.vPadX.textContent = els.pPadX.value;
    els.vPadTop.textContent = els.pPadTop.value;
    els.vPadBottom.textContent = els.pPadBottom.value;
    els.vNoteSize.textContent = els.pNoteSize.value;
    els.vBookSize.textContent = els.pBookSize.value;
    els.vAuthorSize.textContent = els.pAuthorSize.value;
    els.vAuthorPad.textContent = els.pAuthorPad.value;
    els.vDateSize.textContent = els.pDateSize.value;
    els.vPageSize.textContent = els.pPageSize.value;
    els.vLineHeight.textContent = (+els.pLineHeight.value / 100).toFixed(1);
  }

  // ===== 渲染 =====
  // 统一保存视图状态（卡片尺寸 / 网格宽度 / 翻页缩放）
  function saveViewState() {
    window.Storage.saveViewState({
      size: window.CURRENT_SIZE,
      gridSize: state.gridSize,
      pageZoom: state.pageZoom
    });
  }

  function render() {
    els.cardCount.textContent = state.cards.length + ' 张卡片';
    els.previewArea.innerHTML = '';

    if (state.cards.length === 0) {
      els.emptyHint.style.display = 'block';
      els.previewArea.appendChild(els.emptyHint);
      els.pageNav.style.display = 'none';
      els.pageFabPrev.style.display = 'none';
      els.pageFabNext.style.display = 'none';
      els.pageZoomBox.style.display = 'none';
      return;
    }
    els.emptyHint.style.display = 'none';

    if (state.mode === 'grid') {
      renderGrid();
      els.pageNav.style.display = 'none';
      els.pageFabPrev.style.display = 'none';
      els.pageFabNext.style.display = 'none';
      els.pageZoomBox.style.display = 'none';
    } else {
      renderPage();
      els.pageNav.style.display = 'flex';
      els.pageFabPrev.style.display = 'flex';
      els.pageFabNext.style.display = 'flex';
      els.pageZoomBox.style.display = 'flex';
      // 首页/末页时禁用对应按钮
      els.pageFabPrev.disabled = state.pageIndex <= 0;
      els.pageFabNext.disabled = state.pageIndex >= state.cards.length - 1;
    }
  }

  function renderGrid() {
    els.previewArea.classList.remove('page-mode');
    const size = window.SIZE_PRESETS[window.CURRENT_SIZE] || window.SIZE_PRESETS['3:4'];
    // 按每行卡片数计算卡片宽度（小5/中4/大3/特大2）
    const cols = GRID_COLS[state.gridSize] || 4;
    const gap = 20;            // 与 CSS .preview-area 的 gap 一致
    const pad = 24 * 2;        // .preview-area 左右 padding
    const contentW = Math.max(200, els.previewArea.clientWidth - pad);
    const w = Math.max(96, Math.floor((contentW - gap * (cols - 1)) / cols));
    const h = size.h * (w / size.w);

    state.cards.forEach((card, idx) => {
      const wrap = createCardEl(card, idx, w, h);
      wrap.classList.add('grid');
      els.previewArea.appendChild(wrap);
    });
  }

  function renderPage() {
    els.previewArea.classList.add('page-mode');
    if (state.pageIndex >= state.cards.length) state.pageIndex = state.cards.length - 1;
    if (state.pageIndex < 0) state.pageIndex = 0;
    const size = window.SIZE_PRESETS[window.CURRENT_SIZE] || window.SIZE_PRESETS['3:4'];
    // 基准尺寸：尽量大（上下留白仅 60px×2，左右 24px×2），再乘以用户缩放
    const availW = Math.max(200, els.previewArea.clientWidth - 48);
    const availH = Math.max(200, els.previewArea.clientHeight - 120);
    let w = Math.min(760, size.w * 1.8);
    let h = size.h * (w / size.w);
    if (h > availH) { h = availH; w = size.w * (h / size.h); }
    if (w > availW) { w = availW; h = size.h * (w / size.w); }
    w *= state.pageZoom;
    h *= state.pageZoom;

    const card = state.cards[state.pageIndex];
    const wrap = createCardEl(card, state.pageIndex, w, h);
    wrap.classList.add('page');
    els.previewArea.appendChild(wrap);
    els.pageInfo.textContent = (state.pageIndex + 1) + ' / ' + state.cards.length;
  }

  function gotoPage(idx) {
    if (idx < 0 || idx >= state.cards.length) return;
    state.pageIndex = idx;
    render();
  }

  // 创建一个卡片 DOM
  function createCardEl(card, idx, w, h) {
    // 自定义可视化模板走另一条渲染路径
    if (window.CURRENT_TEMPLATE_TYPE === 'custom' && window.CURRENT_CUSTOM_DATA) {
      return createCustomCardEl(card, idx, w, h);
    }
    const p = window.CURRENT_PARAMS;
    const tpl = window.TEMPLATES[window.CURRENT_TEMPLATE];
    // 全尺寸渲染 + transform 缩放：保证网格/翻页排版完全一致
    const sizePreset = window.SIZE_PRESETS[window.CURRENT_SIZE] || window.SIZE_PRESETS['3:4'];
    const fullW = sizePreset.w;
    const fullH = sizePreset.h;
    const scale = w / fullW;

    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';
    wrap.style.position = 'relative';
    wrap.style.overflow = 'hidden';

    const cardEl = document.createElement('div');
    cardEl.className = 'card ' + (tpl ? tpl.className : '');
    if (!p.decor) cardEl.classList.add('no-decor');
    if (p.showNumber === false) cardEl.classList.add('no-number');
    cardEl.style.position = 'absolute';
    cardEl.style.top = '0';
    cardEl.style.left = '0';
    cardEl.style.width = fullW + 'px';
    cardEl.style.height = fullH + 'px';
    cardEl.style.background = p.bgColor;
    // 内边距 = 基础内边距 + 独立的左右/上/下边距微调
    const padBase = p.padding || 0;
    const padX = padBase + (p.padX || 0);
    const padT = padBase + (p.padTop || 0);
    const padB = padBase + (p.padBottom || 0);
    cardEl.style.padding = padT + 'px ' + padX + 'px ' + padB + 'px ' + padX + 'px';
    // cardEl 整体字体/对齐用正文设置，让 header/footer 继承正文风格
    cardEl.style.textAlign = p.textAlign || p.align;
    cardEl.style.fontFamily = p.textFont || p.font;
    cardEl.style.transformOrigin = 'top left';
    cardEl.style.transform = `scale(${scale})`;

    // 头部：书名（第一行）+ 作者（第二行），分行显示避免长书名挤作者换行
    const headerEl = document.createElement('div');
    headerEl.className = 'card-header';
    if (window.META.book) {
      const bookSpan = document.createElement('span');
      bookSpan.className = 'book-name';
      bookSpan.textContent = window.META.book;
      bookSpan.style.fontSize = p.bookSize + 'px';
      headerEl.appendChild(bookSpan);
    }
    if (window.META.author) {
      const authorSpan = document.createElement('span');
      authorSpan.className = 'author-name';
      authorSpan.textContent = window.META.author;
      authorSpan.style.fontSize = p.authorSize + 'px';
      authorSpan.style.paddingLeft = p.authorPad + 'px';
      headerEl.appendChild(authorSpan);
    }
    cardEl.appendChild(headerEl);

    // 标题（可省略）
    if (card.title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'card-title';
      titleEl.textContent = card.title;
      titleEl.style.color = p.titleColor;
      titleEl.style.fontSize = p.titleSize + 'px';
      titleEl.style.lineHeight = '1.4';
      titleEl.style.marginBottom = '10px';
      titleEl.style.fontFamily = p.titleFont || p.font;
      titleEl.style.textAlign = p.titleAlign || p.align;
      cardEl.appendChild(titleEl);
    }

    // 正文
    const bodyEl = document.createElement('div');
    bodyEl.className = 'card-body';
    bodyEl.textContent = card.body || '';
    bodyEl.style.color = p.textColor;
    bodyEl.style.fontSize = p.textSize + 'px';
    bodyEl.style.lineHeight = p.lineHeight;
    bodyEl.style.fontFamily = p.textFont || p.font;
    bodyEl.style.textAlign = p.textAlign || p.align;
    cardEl.appendChild(bodyEl);

    // 底部：备注（上）+ 日期（下）；单卡 note 优先于全局 META.note
    const noteText = card.note ? card.note : (window.META.note || '');
    if (noteText || window.META.date) {
      const footerEl = document.createElement('div');
      footerEl.className = 'card-footer';
      if (noteText) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'footer-note';
        noteDiv.textContent = noteText;
        noteDiv.style.fontSize = p.noteSize + 'px';
        footerEl.appendChild(noteDiv);
      }
      if (window.META.date) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'footer-date';
        dateDiv.textContent = window.META.date;
        dateDiv.style.fontSize = p.dateSize + 'px';
        footerEl.appendChild(dateDiv);
      }
      cardEl.appendChild(footerEl);
    }

    // 装饰
    if (p.decor && tpl && tpl.params.decorHtml) {
      const decor = document.createElement('div');
      decor.className = 'card-decor';
      // {n} 替换为序号
      decor.innerHTML = tpl.params.decorHtml.replace('{n}', String(idx + 1).padStart(2, '0'));
      cardEl.appendChild(decor);
    }

    // 页码字号：应用到大水印页码元素（全尺寸基准，随卡片一起缩放）
    if (p.pageSize) {
      const pageNum = cardEl.querySelector('.page-number');
      if (pageNum) pageNum.style.fontSize = p.pageSize + 'px';
    }

    // 编辑按钮
    const editBtn = document.createElement('button');
    editBtn.className = 'card-edit-btn';
    editBtn.textContent = '✎';
    editBtn.title = '编辑此卡';
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      openEditModal(card.id);
    });
    wrap.appendChild(cardEl);
    wrap.appendChild(editBtn);

    // 双击也可编辑
    cardEl.addEventListener('dblclick', () => openEditModal(card.id));

    // 保存对 card 元素的引用，方便导出
    cardEl.dataset.cardId = card.id;
    wrap._cardEl = cardEl;
    return wrap;
  }

  // 创建自定义可视化模板的卡片 DOM
  // 元素坐标基于编辑器画布尺寸（customData.canvasW/H），渲染时按比例缩放到实际 w/h
  function createCustomCardEl(card, idx, w, h) {
    const data = window.CURRENT_CUSTOM_DATA;
    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    wrap.style.width = w + 'px';
    wrap.style.height = h + 'px';

    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.style.position = 'relative';
    cardEl.style.overflow = 'hidden';
    cardEl.style.width = w + 'px';
    cardEl.style.height = h + 'px';
    // 背景色 + 背景图（背景图在最底层，cover 填充）
    cardEl.style.backgroundColor = data.bgColor || '#fff';
    if (data.bgImage) {
      cardEl.style.backgroundImage = 'url(' + data.bgImage + ')';
      cardEl.style.backgroundSize = 'cover';
      cardEl.style.backgroundPosition = 'center';
      cardEl.style.backgroundRepeat = 'no-repeat';
    }

    // 缩放比例：实际尺寸 / 编辑器画布尺寸
    const baseW = data.canvasW || (window.SIZE_PRESETS[data.size] || window.SIZE_PRESETS['3:4']).w;
    const scale = w / baseW;

    (data.elements || []).forEach(el => {
      const node = document.createElement('div');
      node.style.position = 'absolute';
      node.style.left = ((el.x || 0) * scale) + 'px';
      node.style.top = ((el.y || 0) * scale) + 'px';
      node.style.width = Math.max(2, (el.w || 30) * scale) + 'px';
      node.style.height = Math.max(2, (el.h || 30) * scale) + 'px';
      node.style.overflow = 'hidden';

      if (el.type === 'text') {
        const txt = document.createElement('div');
        txt.style.width = '100%';
        txt.style.height = '100%';
        txt.style.display = 'flex';
        txt.style.wordBreak = 'break-word';
        txt.style.whiteSpace = 'pre-wrap';
        txt.style.color = el.color || '#000';
        txt.style.fontFamily = el.font || 'sans-serif';
        txt.style.fontSize = ((el.fontSize || 14) * scale) + 'px';
        txt.style.textAlign = el.align || 'left';
        txt.style.alignItems = el.align === 'center' ? 'center' : (el.align === 'right' ? 'flex-end' : 'flex-start');
        txt.style.justifyContent = 'center';
        txt.textContent = resolveFieldText(el, card, idx);
        node.appendChild(txt);
      } else if (el.type === 'circle') {
        node.style.background = el.color || '#000';
        node.style.borderRadius = '50%';
      } else {
        // rect / line
        node.style.background = el.color || '#000';
      }
      cardEl.appendChild(node);
    });

    // 编辑按钮
    const editBtn = document.createElement('button');
    editBtn.className = 'card-edit-btn';
    editBtn.textContent = '✎';
    editBtn.title = '编辑此卡';
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      openEditModal(card.id);
    });
    wrap.appendChild(cardEl);
    wrap.appendChild(editBtn);
    cardEl.addEventListener('dblclick', () => openEditModal(card.id));

    cardEl.dataset.cardId = card.id;
    wrap._cardEl = cardEl;
    return wrap;
  }

  // 解析元素绑定的字段，返回显示文本
  function resolveFieldText(el, card, idx) {
    if (el.field) {
      if (el.field === 'book') return window.META.book || '';
      if (el.field === 'author') return window.META.author || '';
      if (el.field === 'date') return window.META.date || '';
      if (el.field === 'note') return card.note || window.META.note || '';
      if (el.field === 'title') return card.title || '';
      if (el.field === 'body') return card.body || '';
      if (el.field === 'number') return String(idx + 1).padStart(2, '0');
    }
    return el.text || '';
  }

  // ===== 编辑卡片 =====
  function openEditModal(cardId) {
    // 只读查看模式下不允许编辑
    if (document.body.classList.contains('view-mode')) return;
    const card = state.cards.find(c => c.id === cardId);
    if (!card) return;
    state.editingCardId = cardId;
    els.editTitle.value = card.title || '';
    els.editBody.value = card.body || '';
    els.editNote.value = card.note || '';
    els.editModal.style.display = 'flex';
    setTimeout(() => els.editTitle.focus(), 50);
  }
  function onEditSave() {
    if (!state.editingCardId) return;
    const card = state.cards.find(c => c.id === state.editingCardId);
    if (card) {
      card.title = els.editTitle.value;
      card.body = els.editBody.value;
      card.note = els.editNote.value;
    }
    state.editingCardId = null;
    els.editModal.style.display = 'none';
    render();
    if (window.appAPI) window.appAPI.notifyCardsChanged();
  }

  // ===== 保存模板 =====
  function onSaveTemplate() {
    const name = prompt('请输入模板名称：', '我的模板');
    if (!name) return;
    readParamsFromUI();
    window.Storage.saveTemplate(name, window.CURRENT_TEMPLATE, window.CURRENT_PARAMS);
    // 重建下拉并选中新模板
    refreshTemplateList();
    els.templateSelect.value = 'custom:' + name;
    applyTemplateSelection();
    toast('模板「' + name + '」已保存');
  }

  // ===== 用户模板库管理 =====
  function openTplLib() {
    renderTplLib();
    els.tplLibModal.style.display = 'flex';
  }

  function renderTplLib() {
    // 参数模板
    const paramTpls = window.Storage.listTemplates();
    els.tplLibParamList.innerHTML = '';
    const paramNames = Object.keys(paramTpls);
    if (paramNames.length === 0) {
      els.tplLibParamList.innerHTML = '<div class="tpl-lib-empty">暂无参数模板（在调整好样式后点「保存模板」）</div>';
    } else {
      paramNames.forEach(name => {
        els.tplLibParamList.appendChild(makeTplLibItem('★ ' + name, () => {
          if (!confirm('确定删除参数模板「' + name + '」？')) return;
          window.Storage.deleteTemplate(name);
          afterTplDeleted('custom:' + name);
        }));
      });
    }
    // 可视化模板
    const visualTpls = window.Storage.listCustomTemplates();
    els.tplLibVisualList.innerHTML = '';
    const visualNames = Object.keys(visualTpls);
    if (visualNames.length === 0) {
      els.tplLibVisualList.innerHTML = '<div class="tpl-lib-empty">暂无可视化模板（在模板下拉中选「新建可视化模板」）</div>';
    } else {
      visualNames.forEach(name => {
        els.tplLibVisualList.appendChild(makeTplLibItem('✦ ' + name, () => {
          if (!confirm('确定删除可视化模板「' + name + '」？')) return;
          window.Storage.deleteCustomTemplate(name);
          afterTplDeleted('visual:' + name);
        }));
      });
    }
  }

  function makeTplLibItem(label, onDelete) {
    const item = document.createElement('div');
    item.className = 'tpl-lib-item';
    const span = document.createElement('span');
    span.className = 'tpl-lib-name';
    span.textContent = label;
    const del = document.createElement('button');
    del.className = 'tpl-lib-del';
    del.textContent = '🗑 删除';
    del.addEventListener('click', onDelete);
    item.appendChild(span);
    item.appendChild(del);
    return item;
  }

  // 删除模板后：刷新下拉；若删的是当前选中模板，回退到默认预设
  function afterTplDeleted(deletedVal) {
    const wasActive = els.templateSelect.value === deletedVal;
    refreshTemplateList();
    if (wasActive) {
      els.templateSelect.value = window.TEMPLATES[window.CURRENT_TEMPLATE] ? window.CURRENT_TEMPLATE : Object.keys(window.TEMPLATES)[0];
      applyTemplateSelection();
    }
    renderTplLib();
    toast('模板已删除');
  }

  // ===== 导出 =====
  // 导出文件名基础：卡片导出-书名-2026年9月3日（书名去掉文件名非法字符）
  function buildExportBaseName() {
    const book = (window.META.book || '').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '') || '未命名';
    const now = new Date();
    const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日';
    return '卡片导出-' + book + '-' + dateStr;
  }

  function openExportModal(type) {
    if (state.cards.length === 0) { toast('请先生成卡片'); return; }
    state.exportType = type;
    els.exportTitle.textContent = type === 'image' ? '导出图片' : '导出 PDF';
    els.exportImageOptions.style.display = type === 'image' ? 'block' : 'none';
    els.exportPdfOptions.style.display = type === 'pdf' ? 'block' : 'none';
    els.exportModal.style.display = 'flex';
  }
  function onExportConfirm() {
    els.exportModal.style.display = 'none';
    const cardEls = collectCardElsForExport();
    if (cardEls.length === 0) { toast('没有可导出的卡片'); return; }
    const nameBase = buildExportBaseName();
    // 导出完成后清理隐藏渲染容器
    const cleanup = () => { if (window._exportContainer) { window._exportContainer.remove(); window._exportContainer = null; } };

    if (state.exportType === 'image') {
      const mode = document.querySelector('input[name="export-img-mode"]:checked').value;
      const format = els.exportImgFormat.value;
      const width = +els.exportImgWidth.value || 1280;
      if (mode === 'current') {
        const num = state.mode === 'page' ? state.pageIndex + 1 : 1;
        const target = cardEls[state.mode === 'page' ? state.pageIndex : 0];
        toastProgress('正在导出…');
        window.Exporter.exportSingle(target, nameBase + '-' + num, format, width)
          .then(() => toast('已导出')).catch(err => { console.error(err); toast('导出失败'); })
          .finally(cleanup);
      } else {
        toastProgress('开始导出 0/' + cardEls.length + ' …');
        window.Exporter.exportZip(cardEls, format, nameBase, width, (done, total) => {
          toastProgress('导出中 ' + done + '/' + total + ' …');
        })
          .then(() => toast('已导出 zip')).catch(err => { console.error(err); toast('导出失败'); })
          .finally(cleanup);
      }
    } else {
      const pageSize = els.exportPdfSize.value;
      const perPage = +els.exportPdfPerPage.value;
      toastProgress('开始生成 PDF 0/' + cardEls.length + ' …');
      window.Exporter.exportPDF(cardEls, pageSize, perPage, nameBase, null, (done, total) => {
        toastProgress('生成 PDF ' + done + '/' + total + ' …');
      })
        .then(() => toast('PDF 已导出')).catch(err => { console.error(err); toast('导出失败'); })
        .finally(cleanup);
    }
  }

  // 收集所有卡片元素用于导出（用隐藏的渲染区生成全尺寸版本）
  function collectCardElsForExport() {
    const size = window.SIZE_PRESETS[window.CURRENT_SIZE] || window.SIZE_PRESETS['3:4'];
    // 全尺寸渲染（与显示无关，独立容器）
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.background = '#fff';
    document.body.appendChild(container);

    const p = window.CURRENT_PARAMS;
    const tpl = window.TEMPLATES[window.CURRENT_TEMPLATE];
    const cardEls = [];
    state.cards.forEach((card, idx) => {
      const wrap = createCardEl(card, idx, size.w, size.h);
      container.appendChild(wrap);
      cardEls.push(wrap._cardEl);
    });
    // 标记容器，导出完成后清理
    container._isExportContainer = true;
    // 异步清理（导出结束后）
    setTimeout(() => {
      // 留点时间让字体渲染
    }, 100);
    // 把清理函数挂到第一个 card 元素上，由 Exporter 调用？为简化这里直接设置全局清理
    window._exportContainer = container;
    // 在导出完成后由 caller 调用 window._exportContainer.remove()
    return cardEls;
  }

  // ===== 工具函数 =====
  function debounce(fn, ms) {
    let t;
    return function() {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { els.toast.style.display = 'none'; }, 2000);
  }
  // 持久进度提示（不自动消失，需手动调用 toast 关闭）
  function toastProgress(msg) {
    els.toast.textContent = msg;
    els.toast.style.display = 'block';
    clearTimeout(toast._t);
  }

  // 等字体加载完成后再首次渲染
  function startWhenFontsReady() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => init());
    } else {
      setTimeout(init, 100);
    }
  }

  // 暴露给 Exporter 调用的清理
  window._cleanupExport = function() {
    if (window._exportContainer) {
      window._exportContainer.remove();
      window._exportContainer = null;
    }
  };

  // 改造 Exporter 调用以支持清理
  ['exportSingle', 'exportZip', 'exportPDF'].forEach(name => {
    const orig = window.Exporter[name];
    window.Exporter[name] = function() {
      return orig.apply(window.Exporter, arguments).finally(() => {
        setTimeout(() => window._cleanupExport && window._cleanupExport(), 500);
      });
    };
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWhenFontsReady);
  } else {
    startWhenFontsReady();
  }
})();

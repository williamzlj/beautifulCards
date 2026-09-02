// template-editor.js - 可视化拖拽模板编辑器
// 数据模型：
//   { bgColor: '#fff', elements: [{ id, type, x, y, w, h, text, field, color, font, fontSize, align }] }
// 元素类型：text | rect | line | circle
//   - text: 文本元素，可通过 field 绑定到书名/作者/时间/备注/标题/正文/序号
//   - rect: 矩形色块
//   - line: 线条（高度很小的矩形）
//   - circle: 圆形
window.TemplateEditor = (function() {
  'use strict';

  // ===== 内部状态 =====
  const state = {
    bgColor: '#ffffff',
    bgImage: null,     // 背景图 dataURL（最底层）
    elements: [],
    selectedId: null,
    nextId: 1,
    canvasW: 360,
    canvasH: 480,
    drag: null,        // { mode: 'move'|'resize', startX, startY, origEl }
    editingName: null  // 编辑现有模板时的名字
  };

  // ===== DOM 引用 =====
  const $ = id => document.getElementById(id);
  const els = {
    modal: $('tpl-editor-modal'),
    canvas: $('tpl-canvas'),
    hint: $('tpl-editor-hint'),
    // 工具按钮
    addButtons: document.querySelectorAll('.tool-btn[data-add]'),
    deleteBtn: $('tpl-delete-btn'),
    duplicateBtn: $('tpl-duplicate-btn'),
    clearBtn: $('tpl-clear-btn'),
    cancelBtn: $('tpl-cancel-btn'),
    saveBtn: $('tpl-save-btn'),
    // 属性面板
    propsEmpty: $('tpl-props-empty'),
    propsContent: $('tpl-props-content'),
    propX: $('prop-x'),
    propY: $('prop-y'),
    propW: $('prop-w'),
    propH: $('prop-h'),
    propText: $('prop-text'),
    propField: $('prop-field'),
    propColor: $('prop-color'),
    propFont: $('prop-font'),
    propSize: $('prop-size'),
    propAlign: $('prop-align'),
    propBg: $('prop-bg'),
    propBgImage: $('prop-bg-image'),
    propBgClear: $('prop-bg-clear'),
    propTextRow: $('prop-text-row'),
    propFieldRow: $('prop-field-row'),
    propColorRow: $('prop-color-row'),
    propFontRow: $('prop-font-row'),
    propSizeRow: $('prop-size-row'),
    propAlignRow: $('prop-align-row')
  };

  // ===== 打开/关闭 =====
  function open(existing) {
    if (existing) {
      // 编辑现有模板
      state.bgColor = existing.data.bgColor || '#ffffff';
      state.bgImage = existing.data.bgImage || null;
      state.elements = JSON.parse(JSON.stringify(existing.data.elements || []));
      state.editingName = existing.name;
    } else {
      // 新建：清空，给一个默认文本元素（书名占位）
      state.bgColor = '#ffffff';
      state.bgImage = null;
      state.elements = [makeDefaultElement('text', { field: 'book', x: 20, y: 20, w: 200, h: 28, fontSize: 14, color: '#1a1a1a' })];
      state.editingName = null;
    }
    state.selectedId = null;
    if (els.propBgImage) els.propBgImage.value = '';
    state.nextId = state.elements.reduce((m, e) => Math.max(m, parseInt(String(e.id).replace(/\D/g, '')) || 0), 0) + 1;

    // 设置画布尺寸（基于当前选中尺寸的预设值，作为元素坐标基准）
    const size = window.SIZE_PRESETS[window.CURRENT_SIZE] || window.SIZE_PRESETS['3:4'];
    state.canvasW = size.w;
    state.canvasH = size.h;
    els.canvas.style.width = state.canvasW + 'px';
    els.canvas.style.height = state.canvasH + 'px';

    els.modal.style.display = 'flex';
    bindEvents();
    render();
    syncPropsToUI();
  }

  function close() {
    els.modal.style.display = 'none';
    unbindEvents();
  }

  function getResult() {
    return {
      bgColor: state.bgColor,
      bgImage: state.bgImage || null,
      canvasW: state.canvasW,
      canvasH: state.canvasH,
      size: window.CURRENT_SIZE,  // 记录基础比例，方便渲染时验证
      elements: JSON.parse(JSON.stringify(state.elements))
    };
  }

  // ===== 默认元素工厂 =====
  function makeDefaultElement(type, overrides) {
    const id = 'el-' + (state.nextId++);
    const base = { id, type, x: 40, y: 40, w: 120, h: 30, color: '#000000' };
    if (type === 'text') {
      base.text = '文本';
      base.field = '';
      base.font = "'Noto Sans SC', sans-serif";
      base.fontSize = 14;
      base.align = 'left';
      base.color = '#1a1a1a';
    } else if (type === 'line') {
      base.h = 2;
      base.color = '#4a90d9';
    } else if (type === 'circle') {
      base.w = 40;
      base.h = 40;
      base.color = '#4a90d9';
    } else if (type === 'rect') {
      base.color = '#4a90d9';
    }
    return Object.assign(base, overrides || {});
  }

  // ===== 事件绑定 =====
  let bound = false;
  function bindEvents() {
    if (bound) return;
    bound = true;
    els.addButtons.forEach(btn => {
      btn.addEventListener('click', () => addElement(btn.dataset.add));
    });
    els.deleteBtn.addEventListener('click', deleteSelected);
    els.duplicateBtn.addEventListener('click', duplicateSelected);
    els.clearBtn.addEventListener('click', clearAll);
    els.cancelBtn.addEventListener('click', close);
    els.saveBtn.addEventListener('click', save);

    // 属性面板事件
    [els.propX, els.propY, els.propW, els.propH].forEach(el =>
      el.addEventListener('input', onPropChange));
    els.propText.addEventListener('input', onPropChange);
    els.propField.addEventListener('change', onPropChange);
    els.propColor.addEventListener('input', onPropChange);
    els.propFont.addEventListener('change', onPropChange);
    els.propSize.addEventListener('input', onPropChange);
    els.propAlign.addEventListener('change', onPropChange);
    els.propBg.addEventListener('input', onBgChange);
    els.propBgImage.addEventListener('change', onBgImageChange);
    els.propBgClear.addEventListener('click', onBgImageClear);

    // 画布拖拽
    els.canvas.addEventListener('mousedown', onCanvasMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  function unbindEvents() {
    // 不真正解绑 document 上的 mousemove/mouseup，因为 bound 锁已防止重复绑定
    // 关闭时不再接收事件，因为 state.drag 会被清空
  }

  // ===== 添加元素 =====
  function addElement(type) {
    const el = makeDefaultElement(type);
    // 放在画布中央
    el.x = Math.max(0, (state.canvasW - el.w) / 2);
    el.y = Math.max(0, (state.canvasH - el.h) / 2);
    state.elements.push(el);
    state.selectedId = el.id;
    render();
    syncPropsToUI();
  }

  function deleteSelected() {
    if (!state.selectedId) return;
    state.elements = state.elements.filter(e => e.id !== state.selectedId);
    state.selectedId = null;
    render();
    syncPropsToUI();
  }
  function duplicateSelected() {
    if (!state.selectedId) return;
    const src = state.elements.find(e => e.id === state.selectedId);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'el-' + (state.nextId++);
    copy.x = (src.x || 0) + 12;
    copy.y = (src.y || 0) + 12;
    state.elements.push(copy);
    state.selectedId = copy.id;
    render();
    syncPropsToUI();
  }
  function clearAll() {
    if (!confirm('确定清空所有元素？')) return;
    state.elements = [];
    state.selectedId = null;
    render();
    syncPropsToUI();
  }

  // ===== 渲染 =====
  function render() {
    els.canvas.innerHTML = '';
    // 背景色 + 背景图（背景图在最底层，cover 填充）
    els.canvas.style.backgroundColor = state.bgColor;
    if (state.bgImage) {
      els.canvas.style.backgroundImage = 'url(' + state.bgImage + ')';
      els.canvas.style.backgroundSize = 'cover';
      els.canvas.style.backgroundPosition = 'center';
      els.canvas.style.backgroundRepeat = 'no-repeat';
    } else {
      els.canvas.style.backgroundImage = 'none';
    }
    state.elements.forEach(el => {
      const node = renderElement(el);
      els.canvas.appendChild(node);
    });
  }

  function renderElement(el) {
    const node = document.createElement('div');
    node.className = 'tpl-el' + (el.id === state.selectedId ? ' selected' : '');
    node.dataset.id = el.id;
    node.style.left = (el.x || 0) + 'px';
    node.style.top = (el.y || 0) + 'px';
    node.style.width = (el.w || 30) + 'px';
    node.style.height = (el.h || 30) + 'px';

    const content = document.createElement('div');
    content.className = 'el-content';

    if (el.type === 'text') {
      const txt = document.createElement('div');
      txt.className = 'el-text';
      txt.style.color = el.color || '#000';
      txt.style.fontFamily = el.font || 'sans-serif';
      txt.style.fontSize = (el.fontSize || 14) + 'px';
      txt.style.textAlign = el.align || 'left';
      txt.style.alignItems = el.align === 'center' ? 'center' : (el.align === 'right' ? 'flex-end' : 'flex-start');
      txt.style.justifyContent = 'center';
      // 显示文本：绑定字段时显示示例值
      txt.textContent = resolveDisplayText(el);
      content.appendChild(txt);
    } else if (el.type === 'rect') {
      const r = document.createElement('div');
      r.className = 'el-rect';
      r.style.background = el.color || '#000';
      content.appendChild(r);
    } else if (el.type === 'line') {
      const r = document.createElement('div');
      r.className = 'el-rect';
      r.style.background = el.color || '#000';
      content.appendChild(r);
    } else if (el.type === 'circle') {
      const c = document.createElement('div');
      c.className = 'el-circle';
      c.style.background = el.color || '#000';
      content.appendChild(c);
    }

    node.appendChild(content);

    // resize handle（只在选中的元素上显示，CSS 控制）
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    node.appendChild(handle);

    return node;
  }

  // 根据字段绑定解析显示文本
  function resolveDisplayText(el) {
    if (el.field) {
      const sample = getFieldSample(el.field);
      if (sample) return sample;
      return '(空)';
    }
    return el.text || '';
  }
  function getFieldSample(field) {
    if (field === 'book') return window.META.book || '《书名》';
    if (field === 'author') return window.META.author || '作者';
    if (field === 'date') return window.META.date || '2024-01-01';
    if (field === 'note') return window.META.note || '备注';
    if (field === 'title') return (window.appState && window.appState.cards[0] && window.appState.cards[0].title) || '标题示例';
    if (field === 'body') return (window.appState && window.appState.cards[0] && window.appState.cards[0].body) || '正文示例文本...';
    if (field === 'number') return '01';
    return '';
  }

  // ===== 属性面板同步 =====
  function syncPropsToUI() {
    const el = state.elements.find(e => e.id === state.selectedId);
    if (!el) {
      els.propsEmpty.style.display = 'block';
      els.propsContent.style.display = 'none';
      els.propBg.value = state.bgColor;
      return;
    }
    els.propsEmpty.style.display = 'none';
    els.propsContent.style.display = 'block';

    els.propX.value = Math.round(el.x || 0);
    els.propY.value = Math.round(el.y || 0);
    els.propW.value = Math.round(el.w || 0);
    els.propH.value = Math.round(el.h || 0);
    els.propText.value = el.text || '';
    els.propField.value = el.field || '';
    els.propColor.value = el.color || '#000000';
    els.propFont.value = el.font || "'Noto Sans SC', sans-serif";
    els.propSize.value = el.fontSize || 14;
    els.propAlign.value = el.align || 'left';
    els.propBg.value = state.bgColor;

    // 不同类型显示不同属性行
    const isText = el.type === 'text';
    const isShape = el.type === 'rect' || el.type === 'line' || el.type === 'circle';
    els.propTextRow.style.display = isText ? 'flex' : 'none';
    els.propFieldRow.style.display = isText ? 'flex' : 'none';
    els.propFontRow.style.display = isText ? 'flex' : 'none';
    els.propSizeRow.style.display = isText ? 'flex' : 'none';
    els.propAlignRow.style.display = isText ? 'flex' : 'none';
    els.propColorRow.style.display = 'flex';
  }

  function onPropChange() {
    const el = state.elements.find(e => e.id === state.selectedId);
    if (!el) return;
    el.x = +els.propX.value || 0;
    el.y = +els.propY.value || 0;
    el.w = Math.max(4, +els.propW.value || 0);
    el.h = Math.max(4, +els.propH.value || 0);
    el.text = els.propText.value;
    el.field = els.propField.value;
    el.color = els.propColor.value;
    el.font = els.propFont.value;
    el.fontSize = +els.propSize.value || 14;
    el.align = els.propAlign.value;
    render();
  }
  function onBgChange() {
    state.bgColor = els.propBg.value;
    els.canvas.style.backgroundColor = state.bgColor;
  }
  function onBgImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // 限制 3MB，避免 localStorage 超限
    if (file.size > 3 * 1024 * 1024) {
      toast('图片过大（>3MB），请压缩后再上传');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      state.bgImage = ev.target.result;
      render();
    };
    reader.readAsDataURL(file);
  }
  function onBgImageClear() {
    state.bgImage = null;
    if (els.propBgImage) els.propBgImage.value = '';
    render();
  }

  // ===== 拖拽与调整大小 =====
  function onCanvasMouseDown(e) {
    // 点击 resize handle？
    if (e.target.classList.contains('resize-handle')) {
      const node = e.target.closest('.tpl-el');
      const id = node && node.dataset.id;
      const el = state.elements.find(x => x.id === id);
      if (el) {
        state.selectedId = id;
        state.drag = {
          mode: 'resize',
          startX: e.clientX,
          startY: e.clientY,
          origEl: { ...el }
        };
        render();
        syncPropsToUI();
        e.preventDefault();
        return;
      }
    }

    // 点击元素？
    const node = e.target.closest('.tpl-el');
    if (node) {
      const id = node.dataset.id;
      const el = state.elements.find(x => x.id === id);
      if (el) {
        state.selectedId = id;
        state.drag = {
          mode: 'move',
          startX: e.clientX,
          startY: e.clientY,
          origEl: { ...el }
        };
        render();
        syncPropsToUI();
        e.preventDefault();
        return;
      }
    }

    // 点击空白：取消选中
    state.selectedId = null;
    render();
    syncPropsToUI();
  }

  function onMouseMove(e) {
    if (!state.drag) return;
    const el = state.elements.find(x => x.id === state.selectedId);
    if (!el) return;
    const dx = e.clientX - state.drag.startX;
    const dy = e.clientY - state.drag.startY;
    if (state.drag.mode === 'move') {
      el.x = Math.max(0, Math.min(state.canvasW - (el.w || 0), state.drag.origEl.x + dx));
      el.y = Math.max(0, Math.min(state.canvasH - (el.h || 0), state.drag.origEl.y + dy));
    } else if (state.drag.mode === 'resize') {
      el.w = Math.max(8, state.drag.origEl.w + dx);
      el.h = Math.max(8, state.drag.origEl.h + dy);
      // 圆形保持比例
      if (el.type === 'circle') {
        const s = Math.min(el.w, el.h);
        el.w = s; el.h = s;
      }
    }
    // 更新位置（直接改 style，性能好）
    const node = els.canvas.querySelector('.tpl-el[data-id="' + el.id + '"]');
    if (node) {
      node.style.left = el.x + 'px';
      node.style.top = el.y + 'px';
      node.style.width = el.w + 'px';
      node.style.height = el.h + 'px';
    }
    syncPropsToUI();
  }
  function onMouseUp() {
    state.drag = null;
  }

  // ===== 保存 =====
  function save() {
    if (state.elements.length === 0) {
      toast('请先添加至少一个元素');
      return;
    }
    let name = state.editingName;
    if (!name) {
      name = prompt('请输入模板名称：', '我的可视化模板');
      if (!name) return;
    }
    const data = getResult();
    window.Storage.saveCustomTemplate(name, data);
    // 通知主应用刷新下拉
    if (window.appState && typeof window.appState.onCustomTemplateSaved === 'function') {
      window.appState.onCustomTemplateSaved(name);
    } else if (window.onCustomTemplateSaved) {
      window.onCustomTemplateSaved(name);
    }
    toast('模板「' + name + '」已保存');
    close();
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
    open,
    close,
    getResult
  };
})();

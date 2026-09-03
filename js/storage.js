// storage.js - localStorage 持久化（用户自定义模板）
// 数据结构：
//   beautifulcards.templates = { myName: { template: 'chinese', params: {...} }, ... }
//   beautifulcards.lastparams = { template, params }  // 上次使用的参数
//   beautifulcards.lastinput = '...'                   // 上次输入的文本
window.Storage = {
  KEY: 'beautifulcards.v1',

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '{}');
    } catch (e) { return {}; }
  },
  _save(obj) {
    try { localStorage.setItem(this.KEY, JSON.stringify(obj)); } catch (e) {}
  },

  // 保存一个命名模板
  saveTemplate(name, templateKey, params) {
    const data = this._load();
    if (!data.templates) data.templates = {};
    data.templates[name] = { template: templateKey, params: { ...params } };
    this._save(data);
  },
  // 列出所有命名模板
  listTemplates() {
    const data = this._load();
    return data.templates || {};
  },
  // 删除一个命名模板
  deleteTemplate(name) {
    const data = this._load();
    if (data.templates && data.templates[name]) {
      delete data.templates[name];
      this._save(data);
    }
  },

  // 保存/读取上次参数
  saveLastParams(templateKey, params) {
    const data = this._load();
    data.lastparams = { template: templateKey, params: { ...params } };
    this._save(data);
  },
  loadLastParams() {
    const data = this._load();
    return data.lastparams || null;
  },

  // 保存/读取上次输入
  saveLastInput(text) {
    const data = this._load();
    data.lastinput = text;
    this._save(data);
  },
  loadLastInput() {
    const data = this._load();
    return data.lastinput || '';
  },

  // 保存/读取全局卡片信息（书名/作者/时间/备注）
  saveMeta(meta) {
    const data = this._load();
    data.meta = { ...meta };
    this._save(data);
  },
  loadMeta() {
    const data = this._load();
    return data.meta || null;
  },

  // 保存/读取视图状态（卡片尺寸、网格显示宽度）
  saveViewState(state) {
    const data = this._load();
    data.viewState = { ...state };
    this._save(data);
  },
  loadViewState() {
    const data = this._load();
    return data.viewState || null;
  },

  // 批量导入模板（合并，同名跳过或覆盖）
  importTemplatesBundle(bundle, overwrite) {
    const data = this._load();
    if (!data.templates) data.templates = {};
    if (!data.visualTemplates) data.visualTemplates = {};
    let added = 0, skipped = 0;
    if (bundle.paramTemplates) {
      Object.keys(bundle.paramTemplates).forEach(name => {
        const exists = !!data.templates[name];
        if (!exists || overwrite) {
          data.templates[name] = JSON.parse(JSON.stringify(bundle.paramTemplates[name]));
          if (!exists) added++; else skipped++;
        } else { skipped++; }
      });
    }
    if (bundle.visualTemplates) {
      Object.keys(bundle.visualTemplates).forEach(name => {
        const exists = !!data.visualTemplates[name];
        if (!exists || overwrite) {
          data.visualTemplates[name] = JSON.parse(JSON.stringify(bundle.visualTemplates[name]));
          if (!exists) added++; else skipped++;
        } else { skipped++; }
      });
    }
    this._save(data);
    return { added, skipped };
  },

  // 可视化自定义模板（拖拽设计的）
  saveCustomTemplate(name, tplData) {
    const data = this._load();
    if (!data.visualTemplates) data.visualTemplates = {};
    data.visualTemplates[name] = JSON.parse(JSON.stringify(tplData));
    this._save(data);
  },
  listCustomTemplates() {
    const data = this._load();
    return data.visualTemplates || {};
  },
  deleteCustomTemplate(name) {
    const data = this._load();
    if (data.visualTemplates && data.visualTemplates[name]) {
      delete data.visualTemplates[name];
      this._save(data);
    }
  },

  // ===== 多项目 =====
  // 数据结构：data.projects = { order: [id...], byId: { id: {id,name,input,meta,cards,createdAt,updatedAt} } }
  _ensureProjects(data) {
    if (!data.projects) data.projects = { order: [], byId: {} };
    return data;
  },
  listProjects() {
    const data = this._ensureProjects(this._load());
    return data.projects;
  },
  getProject(id) {
    const data = this._ensureProjects(this._load());
    return data.projects.byId[id] || null;
  },
  saveProject(proj) {
    const data = this._ensureProjects(this._load());
    const isNew = !data.projects.byId[proj.id];
    data.projects.byId[proj.id] = JSON.parse(JSON.stringify(proj));
    if (isNew) data.projects.order.push(proj.id);
    this._save(data);
  },
  deleteProject(id) {
    const data = this._ensureProjects(this._load());
    delete data.projects.byId[id];
    data.projects.order = data.projects.order.filter(x => x !== id);
    if (data.activeProjectId === id) {
      data.activeProjectId = data.projects.order[0] || null;
    }
    this._save(data);
  },
  reorderProjects(order) {
    const data = this._ensureProjects(this._load());
    data.projects.order = order.slice();
    this._save(data);
  },
  getActiveProjectId() {
    const data = this._load();
    return data.activeProjectId || null;
  },
  setActiveProjectId(id) {
    const data = this._load();
    data.activeProjectId = id;
    this._save(data);
  }
};

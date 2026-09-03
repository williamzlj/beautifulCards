// templates.js - 预设模板默认参数配置
// 每套模板有自己的颜色/字号/字体默认值，用户可在面板上调整
// 注：字号已为手机阅读调大；decorHtml 中含 {n} 的元素为页码，受"显示页码"开关统一控制
window.TEMPLATES = {
  chinese: {
    name: '中国风',
    className: 'tpl-chinese',
    params: {
      bgColor: '#f3e9d2',
      titleColor: '#5c2a0e',
      textColor: '#3a2818',
      titleSize: 34,
      textSize: 20,
      font: "'LXGW WenKai TC', serif",
      align: 'left',
      padding: 32,
      lineHeight: 1.9,
      decor: true,
      decorHtml: '<div class="accent-line"></div><div class="seal">读书</div><div class="page-number">{n}</div>'
    }
  },
  paper: {
    name: '简约纸纸风',
    className: 'tpl-paper',
    params: {
      bgColor: '#fbf8f1',
      titleColor: '#1a1a1a',
      textColor: '#333333',
      titleSize: 32,
      textSize: 20,
      font: "'LXGW WenKai TC', serif",
      align: 'left',
      padding: 32,
      lineHeight: 1.85,
      decor: true,
      decorHtml: '<div class="page-number">{n}</div>'
    }
  },
  modern: {
    name: '现代极简风',
    className: 'tpl-modern',
    params: {
      bgColor: '#ffffff',
      titleColor: '#111111',
      textColor: '#444444',
      titleSize: 30,
      textSize: 18,
      font: "'Noto Sans SC', sans-serif",
      align: 'left',
      padding: 28,
      lineHeight: 1.7,
      decor: true,
      decorHtml: '<div class="color-block"></div><div class="bottom-line"></div><div class="page-number">{n}</div>'
    }
  },
  magazine: {
    name: '拼贴杂志风',
    className: 'tpl-magazine',
    params: {
      bgColor: '#f0e6d2',
      titleColor: '#1a1a1a',
      textColor: '#333333',
      titleSize: 32,
      textSize: 18,
      font: "'Noto Serif SC', serif",
      align: 'left',
      padding: 28,
      lineHeight: 1.7,
      decor: true,
      decorHtml: '<div class="number-badge">{n}</div><div class="yellow-strip"></div>'
    }
  },
  typewriter: {
    name: '复古打字机风',
    className: 'tpl-typewriter',
    params: {
      bgColor: '#f5f0e0',
      titleColor: '#2a2a2a',
      textColor: '#3a3a3a',
      titleSize: 30,
      textSize: 18,
      font: "'LXGW WenKai TC', monospace",
      align: 'left',
      padding: 28,
      lineHeight: 1.85,
      decor: true,
      decorHtml: '<div class="dot-line"></div><div class="no-mark">No. {n}</div>'
    }
  },
  dark: {
    name: '暗夜模式',
    className: 'tpl-dark',
    params: {
      bgColor: '#1a1a2e',
      titleColor: '#e8e8f0',
      textColor: '#c0c0d0',
      titleSize: 32,
      textSize: 18,
      font: "'Noto Sans SC', sans-serif",
      align: 'left',
      padding: 30,
      lineHeight: 1.75,
      decor: true,
      decorHtml: '<div class="glow-line"></div><div class="star-dot"></div><div class="page-number">{n}</div>'
    }
  },
  ink: {
    name: '水墨风',
    className: 'tpl-ink',
    params: {
      bgColor: '#faf7f0',
      titleColor: '#1a1a1a',
      textColor: '#333333',
      titleSize: 36,
      textSize: 20,
      font: "'Ma Shan Zheng', 'LXGW WenKai TC', cursive",
      align: 'left',
      padding: 36,
      lineHeight: 2.0,
      decor: true,
      decorHtml: '<div class="ink-circle"></div><div class="top-brush"></div><div class="page-number">{n}</div>'
    }
  },
  notebook: {
    name: '笔记本横线风',
    className: 'tpl-notebook',
    params: {
      bgColor: '#ffffff',
      titleColor: '#1a1a1a',
      textColor: '#2a2a2a',
      titleSize: 30,
      textSize: 18,
      font: "'LXGW WenKai TC', serif",
      align: 'left',
      padding: 30,
      lineHeight: 1.8,
      decor: true,
      decorHtml: '<div class="red-spine"></div><div class="page-number">{n}</div>'
    }
  },
  gradient: {
    name: '渐变现代风',
    className: 'tpl-gradient',
    params: {
      bgColor: '#4a90d9',
      titleColor: '#ffffff',
      textColor: '#f0f0f0',
      titleSize: 34,
      textSize: 20,
      font: "'Noto Sans SC', sans-serif",
      align: 'left',
      padding: 32,
      lineHeight: 1.7,
      decor: true,
      decorHtml: '<div class="bottom-rainbow"></div><div class="corner-circle"></div><div class="page-number">{n}</div>'
    }
  }
};

// 当前生效参数（用户调整后可能跟预设不同）
// 注：templates 的 params 仍使用 font/align 表示"整体字体/对齐"，
// 渲染时会拆分成标题/正文各自的字体与对齐（见 app.js 的 normalizeParams）。
window.CURRENT_PARAMS = { ...window.TEMPLATES.chinese.params };

// 当前选中的模板 key
window.CURRENT_TEMPLATE = 'chinese';

// 当前模板类型：'preset'（预设） | 'custom'（可视化自定义）
window.CURRENT_TEMPLATE_TYPE = 'preset';

// 当 type==='custom' 时使用的自定义模板数据
// { bgColor, elements: [{ id, type, x, y, w, h, text, field, color, font, fontSize, align }] }
window.CURRENT_CUSTOM_DATA = null;

// 全局卡片信息（书名 / 作者 / 时间 / 备注），所有卡片共享
// 单卡可通过编辑弹窗覆盖任意字段（card.note 不为空则覆盖 META.note）
window.META = {
  book: '',
  author: '',
  date: '',
  note: ''
};

// 默认尺寸（与 HTML 中 select 一致）
window.CURRENT_SIZE = '3:4';

// 尺寸对应最大宽高（用于渲染时计算）
// 以高度为基准计算宽度
window.SIZE_PRESETS = {
  '1:1':  { w: 360, h: 360 },
  '3:4':  { w: 360, h: 480 },
  '4:3':  { w: 480, h: 360 },
  '16:9': { w: 640, h: 360 },
  '9:16': { w: 360, h: 640 }
};

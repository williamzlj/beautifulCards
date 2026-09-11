// parser.js - 解析多行文本为卡片数组
// 规则：
//   1) 用一行单独的 --- 分隔多张卡
//   2) 可选：连续两个空行也作为分隔（doubleNewline 选项）
//   3) 每张卡内，第一行非空行若以 "# " 开头，则该行去掉 # 后作为标题
//   4) 否则没有标题，所有非空行作为正文
//   5) 标题若省略，card.title 为空字符串
window.parseInput = function(text, opts) {
  opts = opts || {};
  if (!text || !text.trim()) return [];
  // 统一换行符
  const normalized = text.replace(/\r\n?/g, '\n');
  let blocks;
  if (opts.doubleNewline) {
    // 先按 --- 切分，再对每个块按双空行切分
    const parts = normalized.split(/^\s*-{3,}\s*$/m);
    blocks = [];
    parts.forEach(p => {
      const sub = p.split(/\n\s*\n/);  // 连续两个换行（中间可有空白行）
      sub.forEach(s => { if (s.trim()) blocks.push(s); });
    });
  } else {
    // 仅按 --- 切分
    blocks = normalized.split(/^\s*-{3,}\s*$/m);
  }
  const cards = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.trim()) continue;
    // 按行切分，保留行尾空格被 trimEnd 掉
    const lines = block.split('\n').map(l => l.trimEnd());
    // 找首个非空行
    let firstIdx = -1;
    for (let j = 0; j < lines.length; j++) {
      if (lines[j].trim()) { firstIdx = j; break; }
    }
    if (firstIdx < 0) continue;
    let title = '';
    let bodyStartIdx = firstIdx;
    const firstLine = lines[firstIdx].trim();
    // 检测 # 标题：# 开头，后跟可选空格 + 文本
    const m = firstLine.match(/^#+\s+(.*)$/);
    if (m && m[1].trim()) {
      title = m[1].trim();
      bodyStartIdx = firstIdx + 1;
    }
    // 剩余非空行作为正文
    const bodyLines = lines.slice(bodyStartIdx).filter(l => l.trim() !== '');
    const body = bodyLines.join('\n');
    cards.push({
      id: 'card-' + Date.now() + '-' + i,
      title: title,
      body: body,
      note: ''   // 单卡备注覆盖，空表示用全局 META.note
    });
  }
  return cards;
};

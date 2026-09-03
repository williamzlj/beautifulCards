// exporter.js - 导出图片（单张 / 批量 zip）与 PDF（多卡一页）
// 依赖：html2canvas, jspdf, jszip, FileSaver
window.Exporter = {
  JPG_QUALITY: 0.95,
  // 默认导出宽度（px），PDF 渲染也用它保证清晰度
  DEFAULT_WIDTH: 1280,

  // 把一个 card 元素渲染为指定像素宽度的 canvas
  renderCardCanvas(cardEl, targetWidth) {
    // 临时去掉阴影、边距，确保导出干净
    const original = {
      boxShadow: cardEl.style.boxShadow,
      transform: cardEl.style.transform
    };
    cardEl.style.boxShadow = 'none';
    cardEl.style.transform = 'none';
    // scale = 目标宽度 / 元素实际宽度
    const baseW = cardEl.offsetWidth || cardEl.getBoundingClientRect().width || 360;
    const scale = Math.max(0.5, (targetWidth || this.DEFAULT_WIDTH) / baseW);
    return html2canvas(cardEl, {
      backgroundColor: null,
      scale: scale,
      useCORS: true,
      logging: false
    }).then(canvas => {
      cardEl.style.boxShadow = original.boxShadow;
      cardEl.style.transform = original.transform;
      return canvas;
    });
  },

  // 单张导出（filename 已含编号，如 卡片导出-活着-2026年9月3日-1）
  exportSingle(cardEl, filename, format, width) {
    return this.renderCardCanvas(cardEl, width).then(canvas => {
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(blob => {
        saveAs(blob, filename + '.' + format);
      }, mime, this.JPG_QUALITY);
    });
  },

  // 批量打包 zip（串行渲染，避免大量卡片撑爆内存）
  // baseName 如 卡片导出-活着-2026年9月3日，内部文件 -1/-2…
  exportZip(cardEls, format, baseName, width, onProgress) {
    const zip = new JSZip();
    const folder = zip.folder(baseName || 'cards');
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const total = cardEls.length;
    let done = 0;
    // 串行处理：一张渲染完再处理下一张
    return cardEls.reduce((chain, el, idx) => {
      return chain.then(() => {
        return this.renderCardCanvas(el, width).then(canvas => {
          return new Promise(resolve => {
            canvas.toBlob(blob => {
              folder.file((baseName || 'cards') + '-' + (idx + 1) + '.' + format, blob);
              done++;
              if (onProgress) onProgress(done, total);
              resolve();
            }, mime, this.JPG_QUALITY);
          });
        });
      });
    }, Promise.resolve()).then(() => {
      return zip.generateAsync({ type: 'blob' });
    }).then(blob => {
      saveAs(blob, (baseName || 'cards') + '.zip');
    });
  },

  // PDF 多卡一页（串行渲染，避免大量卡片撑爆内存）
  exportPDF(cardEls, pageSize, perPage, baseName, width, onProgress) {
    const { jsPDF } = window.jspdf;
    const parts = String(pageSize || 'a4-portrait').split('-');
    const format = parts[0] || 'a4';
    const orientation = parts[1] === 'landscape' ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'mm', format });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;

    // 计算 perPage 对应的网格行列（优先接近正方形的布局）
    const layouts = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3], 9: [3, 3] };
    const [cols, rows] = layouts[perPage] || [2, 3];
    const gap = 4;
    const cellW = (usableW - gap * (cols - 1)) / cols;
    const cellH = (usableH - gap * (rows - 1)) / rows;

    const total = cardEls.length;
    let done = 0;
    // 串行渲染
    return cardEls.reduce((chain, el, i) => {
      return chain.then(() => {
        return this.renderCardCanvas(el, width || this.DEFAULT_WIDTH).then(canvas => {
          if (i > 0 && i % perPage === 0) pdf.addPage();
          const idxInPage = i % perPage;
          const col = idxInPage % cols;
          const row = Math.floor(idxInPage / cols);
          const x = margin + col * (cellW + gap);
          const y = margin + row * (cellH + gap);

          const cw = canvas.width;
          const ch = canvas.height;
          const ratio = cw / ch;
          let drawW = cellW;
          let drawH = drawW / ratio;
          if (drawH > cellH) {
            drawH = cellH;
            drawW = drawH * ratio;
          }
          const offsetX = x + (cellW - drawW) / 2;
          const offsetY = y + (cellH - drawH) / 2;
          const imgData = canvas.toDataURL('image/jpeg', this.JPG_QUALITY);
          pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH);
          done++;
          if (onProgress) onProgress(done, total);
        });
      });
    }, Promise.resolve()).then(() => {
      pdf.save((baseName || '卡片导出') + '.pdf');
    });
  }
};

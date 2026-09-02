// exporter.js - 导出图片（单张 / 批量 zip）与 PDF（多卡一页）
// 依赖：html2canvas, jspdf, jszip, FileSaver
window.Exporter = {
  // 把一个 card 元素渲染为 canvas
  renderCardCanvas(cardEl) {
    // 临时去掉阴影、边距，确保导出干净
    const original = {
      boxShadow: cardEl.style.boxShadow,
      transform: cardEl.style.transform
    };
    cardEl.style.boxShadow = 'none';
    cardEl.style.transform = 'none';
    // 提高分辨率 scale=2
    return html2canvas(cardEl, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false
    }).then(canvas => {
      cardEl.style.boxShadow = original.boxShadow;
      cardEl.style.transform = original.transform;
      return canvas;
    });
  },

  // 单张导出
  exportSingle(cardEl, filename, format) {
    return this.renderCardCanvas(cardEl).then(canvas => {
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(blob => {
        saveAs(blob, filename + '.' + format);
      }, mime, 0.95);
    });
  },

  // 批量打包 zip
  exportZip(cardEls, format, baseName) {
    const zip = new JSZip();
    const folder = zip.folder(baseName || 'cards');
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const tasks = cardEls.map((el, idx) => {
      return this.renderCardCanvas(el).then(canvas => {
        return new Promise(resolve => {
          canvas.toBlob(blob => {
            const name = String(idx + 1).padStart(2, '0') + '.' + format;
            folder.file(name, blob);
            resolve();
          }, mime, 0.95);
        });
      });
    });
    return Promise.all(tasks).then(() => {
      return zip.generateAsync({ type: 'blob' });
    }).then(blob => {
      saveAs(blob, (baseName || 'cards') + '.zip');
    });
  },

  // PDF 多卡一页
  exportPDF(cardEls, pageSize, perPage) {
    const { jsPDF } = window.jspdf;
    const orientation = 'portrait';
    const unit = 'mm';
    const pdf = new jsPDF({ orientation, unit, format: pageSize });
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

    const tasks = cardEls.map(el => this.renderCardCanvas(el));
    return Promise.all(tasks).then(canvases => {
      canvases.forEach((canvas, i) => {
        if (i > 0 && i % perPage === 0) pdf.addPage();
        const idxInPage = i % perPage;
        const col = idxInPage % cols;
        const row = Math.floor(idxInPage / cols);
        const x = margin + col * (cellW + gap);
        const y = margin + row * (cellH + gap);

        // 按比例适配到 cell
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
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH);
      });
      pdf.save('cards.pdf');
    });
  }
};

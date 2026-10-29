export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function svgBlob(svg) { return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }); }
export async function pngBlob(svg, scale = 2) {
  const url = URL.createObjectURL(svgBlob(svg));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('SVGの読み込みに失敗しました')); image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = 800 * scale; canvas.height = 1000 * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG書き出しに対応していません');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNGの作成に失敗しました')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

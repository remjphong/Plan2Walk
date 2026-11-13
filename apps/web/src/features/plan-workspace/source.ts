import type { Point } from '@plan2walk/floorplan';

export type Region = { x: number; y: number; width: number; height: number };
export type PagePreview = { url: string; width: number; height: number; text: { value: string; point: Point }[] };
export type Source = { name: string; pages: number; page(index: number): Promise<PagePreview>; close(): void };
export const fullRegion: Region = { x: 0, y: 0, width: 1, height: 1 };

function decode(url: string) {
  const image = new Image();
  image.src = url;
  return image.decode().then(() => image);
}

export async function openSource(file: File): Promise<Source> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Tệp vượt quá giới hạn 25 MB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (pdf) {
    const [{ getDocument, GlobalWorkerOptions }, { default: worker }] = await Promise.all([
      import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = worker;
    const task = getDocument({ data: await file.arrayBuffer() });
    try {
      const document = await task.promise;
      return { name: file.name, pages: document.numPages, close: () => void document.destroy().catch(() => undefined),
        async page(index) {
          const page = await document.getPage(index);
          const original = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 1900 / Math.max(original.width, original.height) });
          const canvas = window.document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const [, content] = await Promise.all([
            page.render({ canvas, viewport }).promise,
            page.getTextContent().catch(() => ({ items: [] })),
          ]);
          const text = content.items.flatMap(item => 'str' in item ? [{
            value: item.str, point: viewport.convertToViewportPoint(item.transform[4], item.transform[5]) as Point,
          }] : []);
          return { url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height, text };
        },
      };
    } catch (error) {
      await task.destroy().catch(() => undefined);
      if (error instanceof Error && error.name === 'PasswordException') throw new Error('PDF có mật khẩu. Chọn bản đã mở khóa.');
      throw new Error('Không đọc được PDF. Kiểm tra lại tệp gốc.');
    }
  }
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw new Error('Chọn bản vẽ PDF, PNG hoặc JPG.');
  const url = URL.createObjectURL(file);
  try {
    const image = await decode(url);
    if (image.naturalWidth * image.naturalHeight > 50_000_000) throw new Error('Ảnh quá lớn. Hãy giảm độ phân giải rồi thử lại.');
    const page = { url, width: image.naturalWidth, height: image.naturalHeight, text: [] };
    return { name: file.name, pages: 1, page: async () => page, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error instanceof DOMException ? new Error('Không đọc được ảnh. Hãy xuất lại tệp.') : error;
  }
}

export async function cropPreview(page: PagePreview, region: Region) {
  const x = region.x * page.width, y = region.y * page.height;
  const width = region.width * page.width, height = region.height * page.height;
  const scale = Math.min(1, 1750 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  if (canvas.width < 40 || canvas.height < 40) throw new Error('Vùng chọn quá nhỏ. Kéo rộng khung rồi thử lại.');
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(await decode(page.url), x, y, width, height, 0, 0, canvas.width, canvas.height);
  const text = page.text.filter(({ point: [px, py] }) => px >= x && px <= x + width && py >= y && py <= y + height)
    .map(item => item.value).join('\n').slice(0, 8000);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result =>
    result ? resolve(result) : reject(new Error('Không tạo được ảnh từ vùng đã chọn.')), 'image/png'));
  return { blob, text, url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

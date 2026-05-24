import { NextRequest, NextResponse } from 'next/server';
import { enhanceImage } from '@/lib/image-enhance';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/enhance-image
 *
 * Form fields:
 *  - image (File) — required
 *  - width (number) — target width in px
 *  - height (number) — target height in px
 *  - productContext (string, optional) — e.g. "women's mustard kurta"
 *
 * Returns JSON with:
 *  - enhancedDataUrl: data:image/jpeg;base64,... (so the UI can render immediately)
 *  - originalDataUrl
 *  - cropRisk, subjectBox, engine, notes
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('image') as File | null;
    const width = Number(form.get('width') ?? 1080);
    const height = Number(form.get('height') ?? 1440);
    const productContext = (form.get('productContext') as string) ?? '';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }
    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type ${file.type}. Use JPG, PNG, or WebP.` },
        { status: 400 },
      );
    }
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 200 || height < 200 || width > 4096 || height > 4096) {
      return NextResponse.json(
        { error: 'Width and height must be between 200 and 4096 pixels' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await enhanceImage({
      imageBuffer: buffer,
      imageMime: file.type,
      targetWidth: width,
      targetHeight: height,
      productContext,
    });

    return NextResponse.json({
      ok: true,
      enhancedDataUrl: `data:${result.enhancedMime};base64,${result.enhancedBuffer.toString('base64')}`,
      originalDataUrl: `data:${file.type};base64,${buffer.toString('base64')}`,
      originalWidth: result.originalWidth,
      originalHeight: result.originalHeight,
      targetWidth: result.targetWidth,
      targetHeight: result.targetHeight,
      subjectBox: result.subjectBox,
      cropRisk: result.cropRisk,
      engine: result.engine,
      notes: result.notes,
    });
  } catch (err: any) {
    console.error('[enhance-image] error:', err);
    return NextResponse.json({ error: err.message ?? 'Enhancement failed' }, { status: 500 });
  }
}

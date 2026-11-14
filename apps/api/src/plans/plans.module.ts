import { Controller, HttpCode, HttpException, Inject, Injectable, Module, Post, UploadedFiles, UseInterceptors, Body } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { compileCandidates, floorPlan, hasSeparatePlanGroups, reconcileRasterCandidates } from '@plan2walk/floorplan';
import { decodePreview, inspectPreview, upscaleForVision } from '../ingestion/preview';
import { readPlan, VisionError } from '../vision/provider';

type PreviewFile = { buffer: Buffer };

@Injectable()
class PlansService {
  private active = 0;

  async analyze(file: PreviewFile | undefined, text: unknown, drawing?: PreviewFile) {
    const requestId = randomUUID();
    const fail = (code: string, status: number, message: string): never => {
      throw new HttpException({ code, message, requestId }, status);
    };
    if (!file) return fail('MISSING_FILE', 400, 'Chọn bản vẽ trước khi phân tích.');
    let preview: ReturnType<typeof inspectPreview>;
    try { preview = inspectPreview(file.buffer); } catch { return fail('INVALID_PREVIEW', 415, 'Ảnh xem trước không hợp lệ.'); }
    const { width, height } = preview;
    if (width > 2200 || height > 2200 || width < 40 || height < 40)
      return fail('INVALID_SIZE', 422, 'Vùng chọn quá nhỏ hoặc quá lớn.');
    if (drawing && file.buffer.length + drawing.buffer.length > 12 * 1024 * 1024)
      return fail('INVALID_SIZE', 413, 'Dữ liệu vùng chọn vượt quá 12 MB.');
    if (this.active >= 2) return fail('BUSY', 429, 'Dịch vụ đang xử lý bản vẽ khác. Hãy thử lại.');
    this.active++;
    try {
      let pixels: ReturnType<typeof decodePreview>;
      let drawingPixels: ReturnType<typeof decodePreview> | undefined;
      try { pixels = decodePreview(file.buffer); }
      catch { return fail('INVALID_PREVIEW', 415, 'Không đọc được điểm ảnh bản vẽ.'); }
      if (drawing) {
        try {
          const layer = inspectPreview(drawing.buffer);
          if (layer.width !== width || layer.height !== height) return fail('INVALID_DRAWING_LAYER', 422, 'Lớp nét PDF lệch vùng chọn.');
          drawingPixels = decodePreview(drawing.buffer);
        } catch (error) {
          if (error instanceof HttpException) throw error;
          return fail('INVALID_DRAWING_LAYER', 422, 'Không đọc được lớp nét PDF.');
        }
      }
      const visionInput = upscaleForVision(pixels, file.buffer);
      const candidates = await readPlan(visionInput, typeof text === 'string' ? text.slice(0, 8000) : '');
      if (candidates.sourceKind === 'render_or_photo')
        return fail('UNSUPPORTED_PLAN', 422, 'Vùng chọn là ảnh phối cảnh hoặc ảnh chụp. Hãy dùng bản vẽ mặt bằng 2D.');
      if (candidates.status === 'needs_region' || candidates.sourceKind === 'mixed_sheet' || hasSeparatePlanGroups(candidates.rooms))
        return fail('NEEDS_REGION', 422, 'Chọn riêng vùng mặt bằng trên trang này.');
      if (candidates.status !== 'ok' || candidates.sourceKind !== 'architectural_plan')
        return fail('UNSUPPORTED_PLAN', 422, 'Chưa nhận được mặt bằng phòng thẳng từ vùng này.');
      let reconciled = reconcileRasterCandidates(candidates, pixels);
      if (drawingPixels) {
        const fromPaths = reconcileRasterCandidates(candidates, drawingPixels);
        if (fromPaths.floors?.length && fromPaths.candidates.openings.length >= reconciled.candidates.openings.length &&
          (!reconciled.floors?.length || (reconciled.issues.some(issue => issue.code === 'INCOMPLETE_FLOOR_EVIDENCE') &&
            !fromPaths.issues.some(issue => issue.code === 'INCOMPLETE_FLOOR_EVIDENCE')))) reconciled = fromPaths;
      }
      if (!reconciled.candidates.walls?.length)
        return fail('INSUFFICIENT_WALL_EVIDENCE', 422, 'Chưa đối chiếu được nét tường trên ảnh. Chọn riêng vùng mặt bằng hoặc dùng bản rõ hơn.');
      const plan = compileCandidates({ ...reconciled.candidates, floors: reconciled.floors, passages: reconciled.passages,
        rejectedFeatures: candidates.rejectedFeatures, width, height });
      plan.issues.push(...reconciled.issues);
      if (!plan.rooms.length) return fail('INSUFFICIENT_GEOMETRY', 422, 'Chưa tìm được biên phòng có thể dựng. Chọn vùng rõ hơn.');
      return { requestId, plan: floorPlan.parse(plan) };
    } catch (error) {
      if (error instanceof VisionError) return fail(error.code, error.status, error.message);
      throw error;
    } finally { this.active--; }
  }
}

@Controller('plans')
class PlansController {
  constructor(@Inject(PlansService) private readonly plans: PlansService) {}

  @Post('analyze')
  @HttpCode(200)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }, { name: 'drawing', maxCount: 1 }],
    { limits: { fileSize: 12 * 1024 * 1024, files: 2, fields: 1, fieldSize: 32 * 1024 } }))
  analyze(@UploadedFiles() files: { file?: PreviewFile[]; drawing?: PreviewFile[] } | undefined, @Body('text') text: unknown) {
    return this.plans.analyze(files?.file?.[0], text, files?.drawing?.[0]);
  }
}

@Module({ controllers: [PlansController], providers: [PlansService] })
export class PlansModule {}

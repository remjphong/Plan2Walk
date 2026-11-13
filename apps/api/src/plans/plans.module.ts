import { Controller, HttpCode, HttpException, Inject, Injectable, Module, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { compileCandidates, floorPlan, hasSeparatePlanGroups } from '@plan2walk/floorplan';
import { inspectPreview } from '../ingestion/preview';
import { readPlan, VisionError } from '../vision/provider';

@Injectable()
class PlansService {
  private active = 0;

  async analyze(file: { buffer: Buffer } | undefined, text: unknown) {
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
    if (this.active >= 2) return fail('BUSY', 429, 'Dịch vụ đang xử lý bản vẽ khác. Hãy thử lại.');
    this.active++;
    try {
      const candidates = await readPlan(file.buffer, typeof text === 'string' ? text.slice(0, 8000) : '');
      if (candidates.sourceKind === 'render_or_photo')
        return fail('UNSUPPORTED_PLAN', 422, 'Vùng chọn là ảnh phối cảnh hoặc ảnh chụp. Hãy dùng bản vẽ mặt bằng 2D.');
      if (candidates.status === 'needs_region' || candidates.sourceKind === 'mixed_sheet' || hasSeparatePlanGroups(candidates.rooms))
        return fail('NEEDS_REGION', 422, 'Chọn riêng vùng mặt bằng trên trang này.');
      if (candidates.status !== 'ok' || candidates.sourceKind !== 'architectural_plan')
        return fail('UNSUPPORTED_PLAN', 422, 'Chưa nhận được mặt bằng phòng thẳng từ vùng này.');
      const plan = compileCandidates({ ...candidates, width, height });
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
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024, files: 1, fields: 1, fieldSize: 32 * 1024 } }))
  analyze(@UploadedFile() file: { buffer: Buffer } | undefined, @Body('text') text: unknown) {
    return this.plans.analyze(file, text);
  }
}

@Module({ controllers: [PlansController], providers: [PlansService] })
export class PlansModule {}

import { Controller, Get, Module } from '@nestjs/common';
import { PlansModule } from './plans/plans.module';
import { visionConfig } from './vision/provider';

@Controller('health')
class HealthController {
  @Get()
  status() {
    const { provider, configured } = visionConfig();
    return { status: 'ok', provider, aiConfigured: configured };
  }
}

@Module({ controllers: [HealthController], imports: [PlansModule] })
export class AppModule {}

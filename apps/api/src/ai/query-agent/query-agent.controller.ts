import { Body, Controller, HttpCode, HttpStatus, Logger, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { QueryAgentService } from './query-agent.service';

@Controller('ai/agent')
export class QueryAgentController {
  private readonly logger = new Logger(QueryAgentController.name);

  constructor(private readonly queryAgent: QueryAgentService) {}

  @Post('query')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async query(
    @Body() dto: AgentQueryDto,
    @Request() req: { user: JwtPayload },
  ): Promise<AgentResponseDto> {
    this.logger.debug(
      `POST /ai/agent/query — tenantId=${req.user.tenantId}, conversationId=${dto.conversationId ?? '(new)'}`,
    );
    try {
      const response = await this.queryAgent.query(dto, req.user.tenantId);
      this.logger.debug(
        `POST /ai/agent/query — conversationId=${response.conversationId} completed`,
      );
      return response;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `POST /ai/agent/query failed — tenantId=${req.user.tenantId}: ${error.message}`,
        error.stack,
      );
      throw err;
    }
  }
}

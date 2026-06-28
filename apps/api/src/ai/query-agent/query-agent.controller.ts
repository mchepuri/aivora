import { Body, Controller, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { QueryAgentService } from './query-agent.service';

@Controller('ai/agent')
export class QueryAgentController {
  constructor(private readonly queryAgent: QueryAgentService) {}

  @Post('query')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  query(@Body() dto: AgentQueryDto, @Request() req: { user: JwtPayload }): Promise<AgentResponseDto> {
    return this.queryAgent.query(dto, req.user.tenantId);
  }
}

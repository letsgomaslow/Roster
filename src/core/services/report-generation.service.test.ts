import { describe, expect, it, vi } from 'vitest';
import type { IEventBus } from '../ports/event-bus.interface';
import type { AnalysisReport } from './orchestrate.service';
import { ReportGenerationService } from './report-generation.service';

function createReport(): AnalysisReport {
  return {
    executionId: 'run-1',
    projectPath: 'Client <Renewal>',
    projectType: 'typescript',
    mode: 'quick',
    status: 'completed',
    startTime: new Date('2026-08-20T12:00:00.000Z'),
    endTime: new Date('2026-08-20T12:00:04.000Z'),
    phaseResults: [],
  };
}

describe('ReportGenerationService', () => {
  it('renders a square Brand OS report and escapes user-controlled title text', async () => {
    const eventBus = { publish: vi.fn(async () => undefined) } as unknown as IEventBus;
    const service = new ReportGenerationService(eventBus);

    const result = await service.generateAnalysisReport(createReport());

    expect(result.html).toContain('Manrope');
    expect(result.html).toContain('DM Sans');
    expect(result.html).toContain('IBM Plex Mono');
    expect(result.html).toContain('#192332');
    expect(result.html).toContain('#EE7BB3');
    expect(result.html).toContain('<title>Analysis Report - Client &lt;Renewal&gt;</title>');
    expect(result.html).not.toMatch(/border-radius|linear-gradient|radial-gradient/);
  });
});

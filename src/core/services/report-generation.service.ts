#!/usr/bin/env node
/**
 * Report Generation Service
 *
 * Generates analysis reports in multiple formats:
 * - JSON
 * - Markdown
 * - HTML
 */

import { IEventBus } from '../ports/event-bus.interface';
import { PromptEvent } from '../events/prompt.event';
import { AnalysisReport, Recommendation, PhaseResult } from './orchestrate.service';

/**
 * Generated report in multiple formats
 */
export interface GeneratedReport {
  json: AnalysisReport;
  markdown: string;
  html: string;
}

/**
 * Report Generation Service
 */
export class ReportGenerationService {
  constructor(private eventBus: IEventBus) {}

  /**
   * Generate complete analysis report in multiple formats
   */
  async generateAnalysisReport(report: AnalysisReport): Promise<GeneratedReport> {
    try {
      const markdown = this.generateMarkdownReport(report);
      const html = this.generateHtmlReport(report);

      await this.eventBus.publish(new PromptEvent('report_generated', report.executionId, new Date(), {
        formats: ['json', 'markdown', 'html'],
        projectType: report.projectType,
        mode: report.mode
      }));

      return {
        json: report,
        markdown,
        html
      };
    } catch (error) {
      throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(report: AnalysisReport): string {
    const duration = report.endTime
      ? Math.round((report.endTime.getTime() - report.startTime.getTime()) / 1000)
      : 0;

    let markdown = '';

    // Header
    markdown += `# Analysis Report\n\n`;
    markdown += `**Project**: ${report.projectPath}\n`;
    markdown += `**Type**: ${report.projectType}\n`;
    markdown += `**Mode**: ${report.mode}\n`;
    markdown += `**Status**: ${report.status}\n`;
    markdown += `**Duration**: ${duration}s\n\n`;

    // Summary
    if (report.synthesis?.summary) {
      markdown += `## Summary\n\n`;
      markdown += `${report.synthesis.summary}\n\n`;
    }

    // Phase Results
    if (report.phaseResults.length > 0) {
      markdown += `## Analysis Phases\n\n`;

      for (const phase of report.phaseResults) {
        markdown += `### ${this.capitalizePhase(phase.phaseName)}: ${this.capitalizeSubagent(phase.subagent)}\n\n`;
        markdown += `**Summary**: ${phase.summary}\n`;
        markdown += `**Confidence**: ${(phase.confidence * 100).toFixed(0)}%\n\n`;

        if (Object.keys(phase.findings).length > 0) {
          markdown += `**Findings**:\n`;
          for (const [key, value] of Object.entries(phase.findings)) {
            if (key !== 'timestamp' && key !== 'mode' && key !== 'projectPath') {
              markdown += `- ${this.humanize(key)}: ${this.formatValue(value)}\n`;
            }
          }
          markdown += `\n`;
        }
      }
    }

    // Recommendations
    if (report.synthesis?.recommendations && report.synthesis.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;

      // Group by priority
      const byPriority: Record<string, Recommendation[]> = {
        high: [],
        medium: [],
        low: []
      };

      for (const rec of report.synthesis.recommendations) {
        byPriority[rec.priority].push(rec);
      }

      for (const priority of ['high', 'medium', 'low'] as const) {
        if (byPriority[priority].length > 0) {
          markdown += `### ${priority.toUpperCase()} Priority\n\n`;

          for (const rec of byPriority[priority]) {
            markdown += `#### ${rec.category}: ${rec.description}\n\n`;
            markdown += `**Action Items**:\n`;
            for (const item of rec.actionItems) {
              markdown += `- ${item}\n`;
            }
            markdown += `\n`;
          }
        }
      }
    }

    // Metrics
    if (report.synthesis?.metrics) {
      markdown += `## Metrics\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `|--------|-------|\n`;

      for (const [key, value] of Object.entries(report.synthesis.metrics)) {
        markdown += `| ${this.humanize(key)} | ${this.formatValue(value)} |\n`;
      }
      markdown += `\n`;
    }

    // Error info
    if (report.error) {
      markdown += `## Error\n\n`;
      markdown += `\`\`\`\n${report.error}\n\`\`\`\n\n`;
    }

    // Metadata
    markdown += `---\n\n`;
    markdown += `**Execution ID**: \`${report.executionId}\`\n`;
    markdown += `**Started**: ${report.startTime.toISOString()}\n`;
    if (report.endTime) {
      markdown += `**Ended**: ${report.endTime.toISOString()}\n`;
    }

    return markdown;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: AnalysisReport): string {
    const duration = report.endTime
      ? Math.round((report.endTime.getTime() - report.startTime.getTime()) / 1000)
      : 0;

    let html = '';

    html += `<!DOCTYPE html>\n<html>\n<head>\n`;
    html += `  <meta charset="UTF-8">\n`;
    html += `  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;
    html += `  <title>Analysis Report - ${this.escapeHtml(report.projectPath)}</title>\n`;
    html += `  <style>\n`;
    html += `    :root { --navy: #192332; --navy-deep: #121D35; --ink: #191F32; --text: #333333; --muted: #666666; --line: #E1E1E1; --off-white: #F6F7F9; --white: #FFFFFF; --pink: #EE7BB3; --purple: #654C8F; --success: #1E7C38; --error: #B42318; }\n`;
    html += `    * { box-sizing: border-box; }\n`;
    html += `    body { background: var(--off-white); color: var(--text); font-family: Manrope, Arial, sans-serif; margin: 0; line-height: 1.6; }\n`;
    html += `    main { margin: 0 auto; max-width: 1200px; padding: 48px 32px; }\n`;
    html += `    h1, h2, h3, h4 { color: var(--navy); font-family: "DM Sans", Manrope, Arial, sans-serif; }\n`;
    html += `    .header { background: var(--navy); border-left: 5px solid var(--pink); color: var(--white); padding: 32px; margin-bottom: 24px; }\n`;
    html += `    .header h1 { color: var(--white); margin: 0; }\n`;
    html += `    .header p { color: #B8C4D9; margin-bottom: 0; }\n`;
    html += `    .metadata { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin-bottom: 30px; background: var(--line); border: 1px solid var(--line); }\n`;
    html += `    .metadata-item { background: var(--white); padding: 16px; }\n`;
    html += `    .metadata-label, .confidence, code { color: var(--purple); font-family: "IBM Plex Mono", monospace; font-size: 0.78rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; }\n`;
    html += `    h2 { border-left: 4px solid var(--pink); padding-left: 14px; margin-top: 40px; }\n`;
    html += `    .phase-result, .recommendation { background: var(--white); border: 1px solid var(--line); padding: 20px; margin-bottom: 15px; }\n`;
    html += `    .recommendation { border-left: 4px solid var(--purple); }\n`;
    html += `    .high { border-left-color: var(--error); }\n`;
    html += `    .medium { border-left-color: #7A5410; }\n`;
    html += `    .low { border-left-color: var(--success); }\n`;
    html += `    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: var(--white); }\n`;
    html += `    th, td { border: 1px solid var(--line); padding: 12px; text-align: left; }\n`;
    html += `    th { background-color: var(--navy); color: var(--white); font-family: "IBM Plex Mono", monospace; font-weight: 500; }\n`;
    html += `    .confidence { display: inline-block; border: 1px solid var(--line); padding: 4px 8px; }\n`;
    html += `    .error { background: var(--white); color: var(--error); padding: 15px; border: 1px solid var(--line); border-left: 4px solid var(--error); }\n`;
    html += `    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.9em; }\n`;
    html += `    @media (max-width: 640px) { main { padding: 24px 16px; } .metadata { grid-template-columns: 1fr; } }\n`;
    html += `  </style>\n`;
    html += `</head>\n<body>\n<main>\n`;

    // Header
    html += `<div class="header">\n`;
    html += `  <h1>Analysis Report</h1>\n`;
    html += `  <p>Comprehensive analysis results for ${this.escapeHtml(report.projectPath)}</p>\n`;
    html += `</div>\n`;

    // Metadata
    html += `<div class="metadata">\n`;
    html += `  <div class="metadata-item"><span class="metadata-label">Project Path</span><br>${this.escapeHtml(report.projectPath)}</div>\n`;
    html += `  <div class="metadata-item"><span class="metadata-label">Project Type</span><br>${this.escapeHtml(report.projectType)}</div>\n`;
    html += `  <div class="metadata-item"><span class="metadata-label">Mode</span><br>${this.escapeHtml(report.mode)}</div>\n`;
    html += `  <div class="metadata-item"><span class="metadata-label">Status</span><br><strong>${this.escapeHtml(report.status)}</strong></div>\n`;
    html += `</div>\n`;

    // Summary
    if (report.synthesis?.summary) {
      html += `<h2>Summary</h2>\n`;
      html += `<p>${this.escapeHtml(report.synthesis.summary)}</p>\n`;
    }

    // Phase Results
    if (report.phaseResults.length > 0) {
      html += `<h2>Analysis Phases</h2>\n`;

      for (const phase of report.phaseResults) {
        html += `<div class="phase-result">\n`;
        html += `  <h3>${this.capitalizePhase(phase.phaseName)}: ${this.capitalizeSubagent(phase.subagent)}</h3>\n`;
        html += `  <p>${this.escapeHtml(phase.summary)}</p>\n`;
        html += `  <p><span class="confidence">${(phase.confidence * 100).toFixed(0)}% Confidence</span></p>\n`;

        if (Object.keys(phase.findings).length > 0) {
          html += `  <h4>Findings</h4>\n`;
          html += `  <ul>\n`;
          for (const [key, value] of Object.entries(phase.findings)) {
            if (key !== 'timestamp' && key !== 'mode' && key !== 'projectPath') {
              html += `    <li><strong>${this.humanize(key)}</strong>: ${this.escapeHtml(this.formatValue(value))}</li>\n`;
            }
          }
          html += `  </ul>\n`;
        }
        html += `</div>\n`;
      }
    }

    // Recommendations
    if (report.synthesis?.recommendations && report.synthesis.recommendations.length > 0) {
      html += `<h2>Recommendations</h2>\n`;

      for (const rec of report.synthesis.recommendations) {
        html += `<div class="recommendation ${rec.priority}">\n`;
        html += `  <h3>${rec.category}</h3>\n`;
        html += `  <p>${this.escapeHtml(rec.description)}</p>\n`;
        html += `  <h4>Action Items</h4>\n`;
        html += `  <ul>\n`;
        for (const item of rec.actionItems) {
          html += `    <li>${this.escapeHtml(item)}</li>\n`;
        }
        html += `  </ul>\n`;
        html += `</div>\n`;
      }
    }

    // Metrics
    if (report.synthesis?.metrics) {
      html += `<h2>Metrics</h2>\n`;
      html += `<table>\n`;
      html += `  <tr><th>Metric</th><th>Value</th></tr>\n`;

      for (const [key, value] of Object.entries(report.synthesis.metrics)) {
        html += `  <tr><td>${this.humanize(key)}</td><td>${this.escapeHtml(this.formatValue(value))}</td></tr>\n`;
      }
      html += `</table>\n`;
    }

    // Error
    if (report.error) {
      html += `<h2>Error</h2>\n`;
      html += `<div class="error">\n`;
      html += `  <p>${this.escapeHtml(report.error)}</p>\n`;
      html += `</div>\n`;
    }

    // Footer
    html += `<footer>\n`;
    html += `  <p><strong>Execution ID</strong>: <code>${report.executionId}</code></p>\n`;
    html += `  <p><strong>Duration</strong>: ${duration}s</p>\n`;
    html += `  <p><strong>Started</strong>: ${report.startTime.toISOString()}</p>\n`;
    if (report.endTime) {
      html += `  <p><strong>Ended</strong>: ${report.endTime.toISOString()}</p>\n`;
    }
    html += `</footer>\n`;

    html += `</main>\n</body>\n</html>\n`;

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  /**
   * Capitalize phase name
   */
  private capitalizePhase(phase: string): string {
    return phase.charAt(0).toUpperCase() + phase.slice(1);
  }

  /**
   * Capitalize subagent name
   */
  private capitalizeSubagent(subagent: string): string {
    return subagent
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Humanize key names (convert camelCase to Title Case)
   */
  private humanize(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  }

  /**
   * Format value for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'Not available';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

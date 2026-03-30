import {
  GestureRecognitionOptions,
  GestureRecognitionResult,
  GestureRecognitionTemplateScore
} from '../../../core-logic/entities/GestureRecognition';
import { Point } from '../../../core-logic/entities/Point';
import { normalizeAndResample } from './gestureNormalizer';
import { PreparedTemplate, scoreTemplate } from './gestureScorer';

const DEFAULT_OPTIONS = {
  sampleCount: 96,
  rasterSize: 96,
  polylineWeight: 0.7,
  coverageWeight: 0.3,
  minScoreThreshold: 0.45
};

export interface SpellRecognizerInput {
  points: Point[];
  templates: PreparedTemplate[];
  templateKeys?: string[];
  options?: GestureRecognitionOptions;
}

export function recognizeSpell(input: SpellRecognizerInput): GestureRecognitionResult {
  const merged = {
    ...DEFAULT_OPTIONS,
    ...input.options
  };

  const selectedTemplates =
    input.templateKeys && input.templateKeys.length > 0
      ? input.templates.filter((template) => input.templateKeys?.includes(template.key))
      : input.templates;

  if (selectedTemplates.length === 0 || input.points.length === 0) {
    return {
      matched: false,
      templateKey: null,
      spellName: null,
      score: 0,
      confidence: 0,
      debug: merged.debug
        ? {
            normalizedInputPoints: 0,
            evaluatedTemplates: selectedTemplates.length,
            ranking: []
          }
        : undefined
    };
  }

  const normalizedInput = normalizeAndResample(input.points, merged.sampleCount);
  const ranking: GestureRecognitionTemplateScore[] = selectedTemplates
    .map((template) =>
      scoreTemplate(normalizedInput, template, {
        ...merged,
        rasterSize: merged.rasterSize,
        polylineWeight: merged.polylineWeight,
        coverageWeight: merged.coverageWeight
      })
    )
    .sort((a, b) => b.score - a.score);

  const top = ranking[0];
  const second = ranking[1];
  const margin = top && second ? Math.max(0, top.score - second.score) : top?.score ?? 0;
  const confidence = top ? Number(Math.min(1, top.score * (0.75 + margin * 0.5)).toFixed(6)) : 0;

  const matched = Boolean(top && top.score >= merged.minScoreThreshold);

  return {
    matched,
    templateKey: matched ? top.templateKey : null,
    spellName: matched ? top.spellName : null,
    score: top?.score ?? 0,
    confidence,
    debug: merged.debug
      ? {
          normalizedInputPoints: normalizedInput.length,
          evaluatedTemplates: selectedTemplates.length,
          ranking
        }
      : undefined
  };
}


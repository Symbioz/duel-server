import {
  GestureRecognitionOptions,
  GestureRecognitionTemplateScore
} from '../../../core-logic/entities/GestureRecognition';
import { Point } from '../../../core-logic/entities/Point';
import {
  BinaryMask,
  rasterizePolylineToMask,
  scoreCoverage
} from './gestureCoverageScorer';
import { computePolylineScore } from './gestureShapeMatcher';

export interface PreparedTemplate {
  key: string;
  spellName: string;
  normalizedStroke: Point[];
  mask: BinaryMask;
}

export interface ScoringOptions extends GestureRecognitionOptions {
  rasterSize: number;
  polylineWeight: number;
  coverageWeight: number;
}

export function scoreTemplate(
  inputNormalized: Point[],
  template: PreparedTemplate,
  options: ScoringOptions
): GestureRecognitionTemplateScore {
  const polylineScore = computePolylineScore(inputNormalized, template.normalizedStroke);
  const inputMask = rasterizePolylineToMask(inputNormalized, options.rasterSize);
  const coverageScore = scoreCoverage(template.mask, inputMask);

  const score = polylineScore * options.polylineWeight + coverageScore * options.coverageWeight;

  return {
    templateKey: template.key,
    spellName: template.spellName,
    polylineScore: Number(polylineScore.toFixed(6)),
    coverageScore: Number(coverageScore.toFixed(6)),
    score: Number(score.toFixed(6))
  };
}


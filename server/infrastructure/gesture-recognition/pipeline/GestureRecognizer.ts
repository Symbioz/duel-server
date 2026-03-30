import {
  GestureRecognitionOptions,
  GestureRecognitionRequest,
  GestureRecognitionResult
} from '../../../core-logic/entities/GestureRecognition';
import { Point } from '../../../core-logic/entities/Point';
import { normalizeAndResample } from './gestureNormalizer';
import { resolveSpellNameFromTemplateKey } from './spellGlyphKeyResolver';
import { recognizeSpell } from './spellRecognizer';
import { PreparedTemplate } from './gestureScorer';

export interface PreparedGestureTemplate extends PreparedTemplate {
  sourcePolygons: Point[][];
}

export interface GestureTemplateInput {
  key: string;
  polygons: Point[][];
  rasterMask: Uint8Array;
  sampleCount: number;
}

function buildPolylineFromPolygons(polygons: Point[][]): Point[] {
  const longest = [...polygons].sort((a, b) => b.length - a.length)[0] ?? [];
  return longest.map((point) => ({ x: point.x, y: point.y }));
}

export function prepareGestureTemplates(inputs: GestureTemplateInput[]): PreparedGestureTemplate[] {
  return inputs
    .map((input) => {
      const polyline = buildPolylineFromPolygons(input.polygons);
      if (polyline.length < 2) {
        return null;
      }

      return {
        key: input.key,
        spellName: resolveSpellNameFromTemplateKey(input.key),
        normalizedStroke: normalizeAndResample(polyline, input.sampleCount),
        mask: input.rasterMask,
        sourcePolygons: input.polygons
      } satisfies PreparedGestureTemplate;
    })
    .filter((item): item is PreparedGestureTemplate => item !== null);
}

export class GestureRecognizer {
  recognize(
    points: Point[],
    templates: PreparedGestureTemplate[],
    options?: GestureRecognitionOptions,
    templateKeys?: string[]
  ): GestureRecognitionResult {
    return recognizeSpell({
      points,
      templates,
      options,
      templateKeys
    });
  }

  recognizeRequest(
    request: GestureRecognitionRequest,
    templates: PreparedGestureTemplate[]
  ): GestureRecognitionResult {
    return this.recognize(request.points, templates, request.options, request.templateKeys);
  }
}


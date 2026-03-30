import { ParsedSvgTemplate } from './pipeline/svgParser';
import { rasterizePolygonsToMask } from './pipeline/gestureCoverageScorer';

export interface SvgSource {
  key: string;
  svg: string;
}

export interface SvgRasterizer {
  rasterize(template: ParsedSvgTemplate, rasterSize: number): Uint8Array;
}

export function createSharpSvgRasterizer(): SvgRasterizer {
  // Name preserved for compatibility with the imported source project.
  // The implementation stays deterministic and dependency-free.
  return {
    rasterize(template: ParsedSvgTemplate, rasterSize: number): Uint8Array {
      return rasterizePolygonsToMask(template.polygons, rasterSize);
    }
  };
}


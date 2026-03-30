import { Point } from '../../../core-logic/entities/Point';

export interface ParsedSvgTemplate {
  key: string;
  polygons: Point[][];
}

function parseAttributes(rawTag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const regex = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawTag)) !== null) {
    attrs.set(match[1], match[2]);
  }
  return attrs;
}

function tokenizePath(pathData: string): string[] {
  const matches = pathData.match(/[MLHVZmlhvz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  return matches ?? [];
}

function parsePathToPolygon(pathData: string): Point[] {
  const tokens = tokenizePath(pathData);
  const points: Point[] = [];
  let cursor = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let index = 0;
  let command = 'M';

  const readNumber = (): number => {
    const token = tokens[index];
    index += 1;
    return Number.parseFloat(token);
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[MLHVZmlhvz]$/.test(token)) {
      command = token;
      index += 1;
      if (command === 'Z' || command === 'z') {
        points.push({ ...start });
      }
      continue;
    }

    if (command === 'M' || command === 'L') {
      const x = readNumber();
      const y = readNumber();
      cursor = { x, y };
      if (points.length === 0) {
        start = { ...cursor };
      }
      points.push({ ...cursor });
      if (command === 'M') {
        command = 'L';
      }
      continue;
    }

    if (command === 'm' || command === 'l') {
      const x = cursor.x + readNumber();
      const y = cursor.y + readNumber();
      cursor = { x, y };
      if (points.length === 0) {
        start = { ...cursor };
      }
      points.push({ ...cursor });
      if (command === 'm') {
        command = 'l';
      }
      continue;
    }

    if (command === 'H') {
      cursor = { x: readNumber(), y: cursor.y };
      points.push({ ...cursor });
      continue;
    }

    if (command === 'h') {
      cursor = { x: cursor.x + readNumber(), y: cursor.y };
      points.push({ ...cursor });
      continue;
    }

    if (command === 'V') {
      cursor = { x: cursor.x, y: readNumber() };
      points.push({ ...cursor });
      continue;
    }

    if (command === 'v') {
      cursor = { x: cursor.x, y: cursor.y + readNumber() };
      points.push({ ...cursor });
      continue;
    }

    index += 1;
  }

  return points;
}

function parsePolygonPoints(value: string): Point[] {
  const tokens = value
    .trim()
    .split(/\s+/)
    .flatMap((pair) => pair.split(','))
    .map((item) => Number.parseFloat(item))
    .filter((item) => Number.isFinite(item));

  const points: Point[] = [];
  for (let i = 0; i < tokens.length - 1; i += 2) {
    points.push({ x: tokens[i], y: tokens[i + 1] });
  }
  return points;
}

function normalizePolygons(polygons: Point[][]): Point[][] {
  const allPoints = polygons.flat();
  if (allPoints.length === 0) {
    return [];
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of allPoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const width = Math.max(maxX - minX, 1e-9);
  const height = Math.max(maxY - minY, 1e-9);
  const scale = Math.max(width, height);

  return polygons.map((polygon) =>
    polygon.map((point) => ({
      x: (point.x - minX) / scale,
      y: (point.y - minY) / scale
    }))
  );
}

export function parseFilledSvg(svgContent: string, key: string): ParsedSvgTemplate {
  const polygons: Point[][] = [];

  const pathRegex = /<path\b[^>]*>/gi;
  let pathMatch: RegExpExecArray | null;
  while ((pathMatch = pathRegex.exec(svgContent)) !== null) {
    const attrs = parseAttributes(pathMatch[0]);
    const d = attrs.get('d');
    if (d) {
      const points = parsePathToPolygon(d);
      if (points.length >= 3) {
        polygons.push(points);
      }
    }
  }

  const polygonRegex = /<polygon\b[^>]*>/gi;
  let polygonMatch: RegExpExecArray | null;
  while ((polygonMatch = polygonRegex.exec(svgContent)) !== null) {
    const attrs = parseAttributes(polygonMatch[0]);
    const pointsAttr = attrs.get('points');
    if (pointsAttr) {
      const points = parsePolygonPoints(pointsAttr);
      if (points.length >= 3) {
        polygons.push(points);
      }
    }
  }

  const rectRegex = /<rect\b[^>]*>/gi;
  let rectMatch: RegExpExecArray | null;
  while ((rectMatch = rectRegex.exec(svgContent)) !== null) {
    const attrs = parseAttributes(rectMatch[0]);
    const x = Number.parseFloat(attrs.get('x') ?? '0');
    const y = Number.parseFloat(attrs.get('y') ?? '0');
    const width = Number.parseFloat(attrs.get('width') ?? '0');
    const height = Number.parseFloat(attrs.get('height') ?? '0');
    if (width > 0 && height > 0) {
      polygons.push([
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ]);
    }
  }

  const circleRegex = /<circle\b[^>]*>/gi;
  let circleMatch: RegExpExecArray | null;
  while ((circleMatch = circleRegex.exec(svgContent)) !== null) {
    const attrs = parseAttributes(circleMatch[0]);
    const cx = Number.parseFloat(attrs.get('cx') ?? '0');
    const cy = Number.parseFloat(attrs.get('cy') ?? '0');
    const r = Number.parseFloat(attrs.get('r') ?? '0');

    if (r > 0) {
      const segments = 32;
      const polygon: Point[] = [];
      for (let i = 0; i < segments; i += 1) {
        const angle = (Math.PI * 2 * i) / segments;
        polygon.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
      }
      polygons.push(polygon);
    }
  }

  return {
    key,
    polygons: normalizePolygons(polygons)
  };
}


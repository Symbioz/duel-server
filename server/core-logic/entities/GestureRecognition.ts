import { Point } from './Point';

export interface GestureRecognitionOptions {
  sampleCount?: number;
  rasterSize?: number;
  polylineWeight?: number;
  coverageWeight?: number;
  minScoreThreshold?: number;
  debug?: boolean;
}

export interface GestureRecognitionTemplateScore {
  templateKey: string;
  spellName: string;
  polylineScore: number;
  coverageScore: number;
  score: number;
}

export interface GestureRecognitionDebug {
  normalizedInputPoints: number;
  evaluatedTemplates: number;
  ranking: GestureRecognitionTemplateScore[];
}

export interface GestureRecognitionResult {
  matched: boolean;
  templateKey: string | null;
  spellName: string | null;
  score: number;
  confidence: number;
  debug?: GestureRecognitionDebug;
}

export interface GestureRecognitionRequest {
  points: Point[];
  templateKeys?: string[];
  options?: GestureRecognitionOptions;
}


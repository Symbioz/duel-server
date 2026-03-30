import {
  GestureRecognitionOptions,
  GestureRecognitionRequest,
  GestureRecognitionResult
} from '../../core-logic/entities/GestureRecognition';
import { Point } from '../../core-logic/entities/Point';
import {
  GestureRecognitionHealthResponse,
  GestureRecognitionWarmupResponse
} from './gestureRecognitionHttpContract';
import {
  GestureRecognizer,
  PreparedGestureTemplate,
  prepareGestureTemplates
} from './pipeline/GestureRecognizer';
import { parseFilledSvg } from './pipeline/svgParser';
import { createSharpSvgRasterizer, SvgRasterizer, SvgSource } from './createSharpSvgRasterizer';
import {
  GestureRecognitionServerConfig,
  readGestureRecognitionServerConfig
} from './gestureRecognitionServerConfig';
import { loadSvgSourcesFromDirectory } from './loadSvgSourcesFromDirectory';

export interface GestureRecognitionBackendOptions {
  svgSources?: SvgSource[];
  rasterizer?: SvgRasterizer;
  config?: Partial<GestureRecognitionServerConfig>;
}

interface WarmedUpTemplates {
  templates: PreparedGestureTemplate[];
  keys: string[];
}

export class GestureRecognitionBackend {
  private readonly recognizer = new GestureRecognizer();
  private readonly serverConfig: GestureRecognitionServerConfig;
  private readonly rasterizer: SvgRasterizer;
  private readonly overrideSources?: SvgSource[];
  private warmupPromise: Promise<WarmedUpTemplates> | null = null;

  constructor(options: GestureRecognitionBackendOptions = {}) {
    const baseConfig = readGestureRecognitionServerConfig();
    this.serverConfig = {
      ...baseConfig,
      ...options.config
    };
    this.rasterizer = options.rasterizer ?? createSharpSvgRasterizer();
    this.overrideSources = options.svgSources;
  }

  async warmup(): Promise<GestureRecognitionWarmupResponse> {
    const warmedUpTemplates = await this.ensureTemplatesLoaded();

    return {
      ready: true,
      templateCount: warmedUpTemplates.templates.length,
      keys: warmedUpTemplates.keys
    };
  }

  async health(): Promise<GestureRecognitionHealthResponse> {
    const warmed = await this.ensureTemplatesLoaded();
    return {
      status: 'ok',
      ready: true,
      templateCount: warmed.templates.length,
      keys: warmed.keys
    };
  }

  async recognize(request: GestureRecognitionRequest): Promise<GestureRecognitionResult> {
    const warmedUp = await this.ensureTemplatesLoaded();

    if (!Array.isArray(request.points) || request.points.length === 0) {
      throw new Error('Invalid request: points must contain at least one point.');
    }

    return this.recognizer.recognizeRequest(
      {
        ...request,
        options: {
          sampleCount: this.serverConfig.sampleCount,
          rasterSize: this.serverConfig.rasterSize,
          minScoreThreshold: this.serverConfig.minScoreThreshold,
          ...request.options
        }
      },
      warmedUp.templates
    );
  }

  async recognizePoints(
    points: Point[],
    templateKeys: string[] = [],
    options: GestureRecognitionOptions = {}
  ): Promise<GestureRecognitionResult> {
    return this.recognize({ points, templateKeys, options });
  }

  private async ensureTemplatesLoaded(): Promise<WarmedUpTemplates> {
    if (!this.warmupPromise) {
      this.warmupPromise = this.loadTemplates();
    }
    return this.warmupPromise;
  }

  private async loadTemplates(): Promise<WarmedUpTemplates> {
    const svgSources =
      this.overrideSources ??
      (await loadSvgSourcesFromDirectory(this.serverConfig.spellGlyphDirectory));

    const prepared = prepareGestureTemplates(
      svgSources
        .map((source) => {
          const parsed = parseFilledSvg(source.svg, source.key);
          if (parsed.polygons.length === 0) {
            return null;
          }

          return {
            key: source.key,
            polygons: parsed.polygons,
            rasterMask: this.rasterizer.rasterize(parsed, this.serverConfig.rasterSize),
            sampleCount: this.serverConfig.sampleCount
          };
        })
        .filter(
          (template): template is { key: string; polygons: Point[][]; rasterMask: Uint8Array; sampleCount: number } =>
            template !== null
        )
    );

    return {
      templates: prepared,
      keys: prepared.map((template) => template.key)
    };
  }
}


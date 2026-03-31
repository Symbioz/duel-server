/**
 * Presentation layer (adapters)
 * 
 * Contains HTTP controllers that adapt incoming HTTP requests to use cases.
 * Following Clean Architecture, these are primary adapters that translate
 * external requests into internal domain logic.
 */

export { GestureRecognitionController } from './GestureRecognitionController';
export { createGestureRecognitionHttpController } from './GestureRecognitionHttpController';
export { createGestureRecognitionHttpServer } from './GestureRecognitionHttpServer';
export { HttpServer } from './HttpServer';
export { getControllerPageHtml } from './ControllerPageGenerator';
export { VoiceSpellController } from './VoiceSpellController';


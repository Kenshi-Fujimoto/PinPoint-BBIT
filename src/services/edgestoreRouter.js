import { initEdgeStore } from '@edgestore/server';
import { z } from 'zod';

const es = initEdgeStore.create();

/**
 * EdgeStore backend router definition
 * Defines public image upload bucket for civic and lost/found attachments
 */
export const edgeStoreRouter = es.router({
  pinpoint: es.fileBucket({
    maxSize: 1024 * 1024 * 20, // 20MB
  }),
  PinPoint: es.fileBucket({
    maxSize: 1024 * 1024 * 20, // 20MB
  }),
  FOundHUb: es.fileBucket({
    maxSize: 1024 * 1024 * 20, // 20MB
  }),
  foundhub: es.fileBucket({
    maxSize: 1024 * 1024 * 20, // 20MB
  }),
  publicImages: es.imageBucket({
    maxSize: 1024 * 1024 * 10, // 10MB
    accept: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  }),
  publicFiles: es.fileBucket({
    maxSize: 1024 * 1024 * 20, // 20MB
  }),
});

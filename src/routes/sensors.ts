import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { lotService } from '../services/lotService';
import { ApiResponse } from '../types';

export function createSensorsRouter(io: Server): Router {
  const router = Router();

  /**
   * POST /sensors/update
   * Called by hall-effect sensors to report a space status change.
   * Body: { nodeId, lotId, status: 'available'|'occupied', confidence?: number }
   */
  router.post('/update', async (req: Request, res: Response) => {
    const { nodeId, lotId, status, confidence } = req.body;

    if (!nodeId || !lotId || !['available', 'occupied'].includes(status)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'nodeId, lotId, and status (available|occupied) are required',
        },
        meta: { timestamp: new Date().toISOString(), requestId: '' },
      };
      return res.status(400).json(response);
    }

    try {
      await lotService.updateSpaceStatus(nodeId, lotId, status, confidence);

      const updatePayload = {
        type: 'space_update',
        timestamp: new Date().toISOString(),
        payload: {
          nodeId,
          lotId,
          status,
          confidence: confidence ?? null,
          lastUpdated: new Date().toISOString(),
        },
      };

      // Broadcast to all clients subscribed to this lot
      io.to(`lot:${lotId}`).emit('space_update', updatePayload);

      res.json({ success: true, meta: { timestamp: new Date().toISOString(), requestId: '' } });
    } catch (error) {
      console.error('[Sensors] Error updating space:', error);
      const response: ApiResponse<null> = {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update space status' },
        meta: { timestamp: new Date().toISOString(), requestId: '' },
      };
      res.status(500).json(response);
    }
  });

  return router;
}

import { Router, Request, Response } from 'express';
import { lotService } from '../services/lotService';
import { ApiResponse, ParkingLot, ParkingSpace, OccupancyPrediction } from '../types';

const router = Router();

/**
 * GET /lots
 * Get all parking lots with current occupancy
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const lots = await lotService.getAllLots();

    const response: ApiResponse<ParkingLot[]> = {
      success: true,
      data: lots,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching lots:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch parking lots',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /lots/:lotId
 * Get details for a specific lot
 */
router.get('/:lotId', async (req: Request, res: Response) => {
  try {
    const { lotId } = req.params;
    const lot = await lotService.getLotById(lotId);

    if (!lot) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'LOT_NOT_FOUND',
          message: `Parking lot with ID '${lotId}' does not exist`,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<ParkingLot> = {
      success: true,
      data: lot,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching lot:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch parking lot details',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /lots/:lotId/spaces
 * Get all parking spaces for a specific lot
 */
router.get('/:lotId/spaces', async (req: Request, res: Response) => {
  try {
    const { lotId } = req.params;
    const { status, zone } = req.query;

    // First verify the lot exists
    const lot = await lotService.getLotById(lotId);
    if (!lot) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'LOT_NOT_FOUND',
          message: `Parking lot with ID '${lotId}' does not exist`,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
      return res.status(404).json(response);
    }

    let spaces = await lotService.getSpacesByLotId(lotId);

    // Apply filters if provided
    if (status) {
      spaces = spaces.filter(s => s.status === status);
    }
    if (zone) {
      spaces = spaces.filter(s => s.spaceNumber?.startsWith(zone as string));
    }

    const response: ApiResponse<{
      lotId: string;
      spaces: ParkingSpace[];
      totalCount: number;
      availableCount: number;
      occupiedCount: number;
    }> = {
      success: true,
      data: {
        lotId,
        spaces,
        totalCount: spaces.length,
        availableCount: spaces.filter(s => s.status === 'available').length,
        occupiedCount: spaces.filter(s => s.status === 'occupied').length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch parking spaces',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.status(500).json(response);
  }
});

/**
 * GET /lots/:lotId/prediction
 * Get occupancy predictions for a specific lot
 */
router.get('/:lotId/prediction', async (req: Request, res: Response) => {
  try {
    const { lotId } = req.params;
    const hours = parseInt(req.query.hours as string) || 3;

    // Validate hours parameter
    if (hours < 1 || hours > 12) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Hours must be between 1 and 12',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
      return res.status(400).json(response);
    }

    const prediction = await lotService.getPrediction(lotId, hours);

    if (!prediction) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'LOT_NOT_FOUND',
          message: `Parking lot with ID '${lotId}' does not exist`,
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<OccupancyPrediction> = {
      success: true,
      data: prediction,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching prediction:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate prediction',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    res.status(500).json(response);
  }
});

export default router;

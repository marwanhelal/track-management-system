import { Request, Response } from 'express';
import { query } from '@/database/connection';

export const testGetProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: "Test projects endpoint working",
      data: { projects: [] }
    });
  } catch (error) {
    console.error('Test projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
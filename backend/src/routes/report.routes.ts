import { Router, Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const reportService = new ReportService(prisma);

// Multer setup for evidence uploads (memory storage, 10MB limit)
const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Get evidence files for a report
router.get('/:reportId/evidence', async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    
    const result = await reportService.getEvidenceFiles(reportId);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Get evidence files error:', error);
    res.status(500).json({ error: 'Failed to fetch evidence files.' });
  }
});

// Upload evidence files for a report
router.post('/:reportId/evidence', uploadEvidence.array('evidence'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ error: 'No files uploaded.' });
      return;
    }

    // Convert multer files to EvidenceFile format
    const evidenceFiles = (req.files as Express.Multer.File[]).map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      data: file.buffer
    }));
    
    const result = await reportService.uploadEvidenceFiles(reportId, evidenceFiles);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.data);
  } catch (error: any) {
    console.error('Upload evidence files error:', error);
    res.status(500).json({ error: 'Failed to upload evidence files.' });
  }
});

// Get specific evidence file
router.get('/:reportId/evidence/:evidenceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { evidenceId } = req.params;
    
    const result = await reportService.getEvidenceFile(evidenceId);
    
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }

    const { filename, mimetype, data } = result.data!;
    
    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': data.length.toString()
    });
    
    res.send(data);
  } catch (error: any) {
    console.error('Get evidence file error:', error);
    res.status(500).json({ error: 'Failed to get evidence file.' });
  }
});

// Delete evidence file
router.delete('/:reportId/evidence/:evidenceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { evidenceId } = req.params;
    
    const result = await reportService.deleteEvidenceFile(evidenceId);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.data);
  } catch (error: any) {
    console.error('Delete evidence file error:', error);
    res.status(500).json({ error: 'Failed to delete evidence file.' });
  }
});

export default router; 
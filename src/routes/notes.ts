import { Router } from 'express';
import { createNote, getNotes, getNoteById, updateNote, deleteNote } from '../controllers/notesController';
import { validateNote, validateNoteUpdate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Notes CRUD operations
router.post('/', validateNote, createNote);
router.get('/', getNotes);
router.get('/:id', getNoteById);
router.put('/:id', validateNoteUpdate, updateNote);
router.delete('/:id', deleteNote);

export default router;

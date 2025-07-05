// src/types/express/index.d.ts
import * as multer from 'multer';

declare global {
  namespace Express {
    interface Request {
      /** single-file upload */
      file?: multer.File;
      /** multi-file or fields upload */
      files?: multer.File[] | { [fieldname: string]: multer.File[] };
    }
  }
}

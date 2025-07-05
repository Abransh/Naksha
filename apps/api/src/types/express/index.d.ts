import multer from "multer";

declare global {
  namespace Express {
    // Single-file uploads
    interface Request {
      file?: multer.File;
      // Multi-file or fields uploads
      files?: multer.File[] | { [fieldname: string]: multer.File[] };
    }

    // If you reference Express.Multer anywhere, e.g. for typing storage engines:
    interface Multer {} 
  }
}

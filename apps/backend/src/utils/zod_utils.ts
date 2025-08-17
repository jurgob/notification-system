import {z,ZodType} from 'zod';
import express, { RequestHandler,Request,Response, NextFunction } from 'express';

export function zodBodyValidation<T extends ZodType>(
  schema: T
): RequestHandler<any, any, z.infer<T>> {
  return (req: Request<any, any, z.infer<T>>, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    
    if (!parsed.success) {
      console.error(`Zod validation error:`, parsed.error)
      console.error(`Zod validation error line 2:`, req.body)
      return res.status(400).json({ error: parsed.error.message });
    }

    // overwrite req.body with the validated & typed version
    req.body = parsed.data;
    next();
  };
}
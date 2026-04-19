import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

/**
 * Factory that returns an Express middleware validating req.body against a Zod schema.
 * Returns 400 with validation errors if the schema fails.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ error: "Validation failed", issues: err.errors });
      }
      next(err);
    }
  };
}

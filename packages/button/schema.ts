import { z } from "zod";
export const ButtonPropsSchema = z.object({
  label: z.string().min(1),
  variant: z.union([z.literal('primary'), z.literal('ghost')]).optional().default('primary'),
  disabled: z.boolean().optional().default(false),
  onClick: z.function().args().returns(z.void()).optional()
});
export type ButtonProps = z.infer<typeof ButtonPropsSchema>;

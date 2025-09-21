import { z } from "zod";
export declare const ButtonPropsSchema: z.ZodObject<{
    label: z.ZodString;
    variant: z.ZodDefault<z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"primary">, z.ZodLiteral<"ghost">]>>>;
    disabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    onClick: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodVoid>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    variant: "primary" | "ghost";
    disabled: boolean;
    onClick?: ((...args: unknown[]) => void) | undefined;
}, {
    label: string;
    variant?: "primary" | "ghost" | undefined;
    disabled?: boolean | undefined;
    onClick?: ((...args: unknown[]) => void) | undefined;
}>;
export type ButtonProps = z.infer<typeof ButtonPropsSchema>;
//# sourceMappingURL=schema.d.ts.map
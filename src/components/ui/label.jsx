import React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Define the label variants using `cva`
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

// Create the Label component
const Label = React.forwardRef((props, ref) => {
  const { className, ...restProps } = props;

  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), className)}
      {...restProps}
    />
  );
});

// Set the display name for the Label component
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
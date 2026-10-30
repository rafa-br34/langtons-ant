import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

const VARIANTS = {
	default: "border border-line bg-white/[0.03] text-fg-1 hover:border-line-strong hover:bg-white/[0.06] hover:text-fg",
	primary: "border border-fg bg-fg text-[#141414] hover:border-[#e8e8e8] hover:bg-[#e8e8e8]",
	ghost: "border border-transparent bg-transparent text-muted hover:border-line hover:bg-white/[0.06] hover:text-fg",
	danger: "border border-line bg-white/[0.03] text-muted hover:border-danger/45 hover:bg-danger-soft hover:text-danger-text"
} as const

const SIZES = {
	default: "h-8 px-3 text-[11.5px]",
	small: "h-7 px-2.5 text-[10.5px]",
	icon: "h-8 w-8 p-0"
} as const

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: keyof typeof VARIANTS
	size?: keyof typeof SIZES
}

export function Button({ className, variant = "default", size = "default", type = "button", ...props }: ButtonProps) {
	return (
		<button
			type={type}
			className={cn(
				"inline-flex shrink-0 items-center justify-center gap-1.5 rounded-control font-medium whitespace-nowrap transition-colors duration-150",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
				"disabled:pointer-events-none disabled:opacity-40",
				VARIANTS[variant],
				SIZES[size],
				className
			)}
			{...props}
		/>
	)
}

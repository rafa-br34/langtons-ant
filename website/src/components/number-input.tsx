"use client"

import { useEffect, useRef, useState } from "react"

import { clamp, cn, parseNumericExpression } from "@/lib/utils"

export interface NumberInputProps {
	value: number
	onChange: (value: number) => void
	id?: string
	min?: number
	max?: number
	prefix?: string
	disabled?: boolean
	commitOnBlur?: boolean
	ariaLabel?: string
	className?: string
}

export function NumberInput({
	value,
	onChange,
	id,
	min = 0,
	max = 100000,
	prefix,
	disabled = false,
	commitOnBlur = false,
	ariaLabel,
	className,
}: Readonly<NumberInputProps>) {
	const [draft, setDraft] = useState(String(value))
	const focused = useRef(false)

	useEffect(() => {
		if (!focused.current) {
			setDraft(String(value))
		}
	}, [value])

	function commit() {
		const parsed = parseNumericExpression(draft, min, max)

		if (parsed === null) {
			setDraft(String(value))
			return
		}

		const next = clamp(Math.round(parsed), min, max)
		setDraft(String(next))

		if (next !== value) {
			onChange(next)
		}
	}

	function handleChange(raw: string) {
		setDraft(raw)

		if (commitOnBlur || raw.trim() === "") {
			return
		}

		const parsed = parseNumericExpression(raw, min, max)
		if (parsed === null) {
			return
		}

		const next = clamp(Math.round(parsed), min, max)
		if (next !== value) {
			onChange(next)
		}
	}

	return (
		<div
			className={cn(
				"flex h-[34px] items-center gap-1.5 rounded-control border border-line bg-black/25 px-2.5 transition-[border-color,box-shadow,background-color]",
				"hover:border-line-strong focus-within:border-accent focus-within:bg-black/40 focus-within:ring-[3px] focus-within:ring-accent/15",
				disabled && "opacity-50",
				className,
			)}
		>
			{prefix ? <span className="shrink-0 font-mono text-2xs text-faint">{prefix}</span> : null}
			<input
				id={id}
				type="text"
				inputMode="text"
				value={draft}
				disabled={disabled}
				spellCheck={false}
				autoComplete="off"
				aria-label={ariaLabel}
				title="Math expressions are allowed, for example 50%+1024."
				className="h-full w-full min-w-0 bg-transparent font-mono text-xs tabular-nums text-fg outline-none disabled:cursor-not-allowed disabled:text-faint"
				onFocus={() => {
					focused.current = true
				}}
				onBlur={() => {
					focused.current = false
					commit()
				}}
				onChange={event => handleChange(event.target.value)}
				onKeyDown={event => {
					if (event.key === "Enter") {
						event.currentTarget.blur()
					}
					if (event.key === "Escape") {
						setDraft(String(value))
						event.currentTarget.blur()
					}
				}}
			/>
		</div>
	)
}

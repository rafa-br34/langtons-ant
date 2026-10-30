export function SiteFooter() {
	return (
		<footer className="relative z-10 flex min-h-9 shrink-0 items-center justify-between gap-4 border-t border-line bg-[#1a1a1a]/55 px-5 py-2 text-[10px] text-faint max-md:flex-wrap max-md:justify-center max-md:text-center">
			<p className="truncate">Langton&apos;s ant — a universal Turing machine built from two turns.</p>
			<nav className="flex shrink-0 gap-4 max-md:justify-center" aria-label="Footer">
				<a
					className="transition-colors hover:text-fg"
					href="https://en.wikipedia.org/wiki/Langton%27s_ant"
					target="_blank"
					rel="noopener"
				>
					Wikipedia
				</a>
				<a
					className="transition-colors hover:text-fg"
					href="https://github.com/rafa-br34/LangtonsAnt"
					target="_blank"
					rel="noopener"
				>
					GitHub
				</a>
				<a
					className="transition-colors hover:text-fg"
					href="https://rafa-br34.dev"
					target="_blank"
					rel="noopener"
				>
					rafa-br34.dev
				</a>
			</nav>
		</footer>
	)
}

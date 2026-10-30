import { Simulator } from "@/components/simulator"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function Page() {
	return (
		<div className="relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
			<div aria-hidden className="pointer-events-none fixed inset-0 z-0 site-background" />
			<div aria-hidden className="pointer-events-none fixed inset-0 z-0 page-grid" />
			<SiteHeader />
			<noscript>
				<div className="fixed inset-x-4 bottom-4 z-[200] rounded-panel border border-danger/45 bg-[#2a1717] px-4 py-3 text-center text-xs text-danger-text">
					Langton&apos;s Ant needs JavaScript and WebGL2 to run. Please enable JavaScript and reload the page.
				</div>
			</noscript>
			<Simulator />
			<SiteFooter />
		</div>
	)
}

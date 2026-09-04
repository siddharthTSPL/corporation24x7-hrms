import { useState, useEffect } from 'react'
import { FiCheck, FiInfo, FiCalendar, FiChevronDown, FiX, FiRefreshCw, FiPlay, FiTrendingDown, FiAward } from 'react-icons/fi'

const CALENDLY_URL = 'https://calendly.com/torchx-talent/demo'

const HEADCOUNT_BANDS = [
  { label: '1–25', sub: 'Small team', value: 25 },
  { label: '100', sub: 'Growing', value: 100 },
  { label: '250', sub: 'Mid-size', value: 250 },
  { label: '500', sub: 'Scaling', value: 500 },
  { label: '1,000', sub: 'Enterprise', value: 1000 },
  { label: '2,500+', sub: 'Large', value: 2500 },
]

const PLANS = [
  { id: 'basic', name: 'Basic', tier: 0, pepm: 39, summary: 'Payroll, leave, core HR basics — including letters and mail merge.', features: ['Payroll processing', 'Leave management', 'Core HR (employee info, documents, onboarding)', 'Letters & mail merge', 'Basic attendance tracking'] },
  { id: 'advance', name: 'Advance', tier: 1, pepm: 99, summary: 'Basic plus advanced attendance, shifts and core HR advanced.', popular: true, features: ['Everything in Basic', 'Shift & roster management', 'Advanced attendance', 'Recruitment / ATS', 'Advanced payroll'] },
  { id: 'enterprise', name: 'Enterprise', tier: 2, pepm: null, summary: 'The full TorchX Talent suite, bundled. Pricing shared after a quick chat.', features: ['Everything in Advance', 'Custom integrations', 'Single sign-on (SSO)', 'REST API access', 'Dedicated success manager'] },
]

const FEATURE_MATRIX = [
  { name: 'Payroll processing', tier: 0 },
  { name: 'Leave management', tier: 0 },
  { name: 'Core HR (employee info, documents, onboarding)', tier: 0 },
  { name: 'Letters & mail merge', tier: 0 },
  { name: 'Basic attendance tracking', tier: 0 },
  { name: 'Shift & roster management', tier: 1 },
  { name: 'Advanced attendance', tier: 1 },
  { name: 'Recruitment / ATS', tier: 1 },
  { name: 'Advanced payroll', tier: 1 },
  { name: 'Custom integrations', tier: 2 },
  { name: 'Single sign-on (SSO)', tier: 2 },
  { name: 'REST API access', tier: 2 },
  { name: 'Dedicated success manager', tier: 2 },
]

const FAQS = [
  { q: 'How does the per-employee pricing work?', a: 'Each paid plan is priced per employee per month (PEPM). The calculator multiplies the selected PEPM rate by your total employee count.' },
  { q: 'Why is Enterprise pricing not displayed?', a: "Enterprise pricing is custom-quoted based on your organisation's context — modules in scope, headcount and contract terms. Our team shares pricing after a short call." },
  { q: 'Does GST apply on top of the listed prices?', a: 'Yes. All prices shown are exclusive of taxes. GST at 18% applies on the final invoice.' },
  { q: 'How is the "compare with another tool" number calculated?', a: "Pick a tool from the dropdown (or enter a custom quote), confirm the employee count, then press Run Comparison. We line that up against your TorchX estimate for the same headcount." },
  { q: 'Where do the competitor prices in the dropdown come from?', a: "Where possible (greytHR), we've verified these directly against the vendor's official pricing page. Where a vendor doesn't publish exact numbers (Keka, Zoho People), we've used the most consistent figures we could find from recent partner quotes and pricing trackers — treat those as estimates. Vendors revise pricing often, so always confirm with the provider directly, or overwrite the field with your own quote for an exact comparison." },
]

const COMPETITORS = [
  { id: 'custom', name: 'Enter your own quote', description: 'Already have a quote from another provider? Type it in directly.', calculate: null },
  { id: 'greythr-essential', name: 'greytHR Essential', description: 'Verified on greytHR\'s official pricing page: ₹2,495 covers the first 50 employees, then ₹45 per additional employee/month.', calculate: (count) => 2495 + Math.max(count - 50, 0) * 45 },
  { id: 'greythr-growth', name: 'greytHR Growth', description: 'Verified on greytHR\'s official pricing page: ₹4,495 covers the first 50 employees, then ₹85 per additional employee/month.', calculate: (count) => 4495 + Math.max(count - 50, 0) * 85 },
  { id: 'keka', name: 'Keka HR (Foundation)', description: "Keka doesn't publish exact prices on its site — best estimate from recent partner quotes: ₹9,999 for the first 100 employees, then ₹90 per additional employee/month. Confirm the live number with Keka directly.", calculate: (count) => 9999 + Math.max(count - 100, 0) * 90 },
  { id: 'zoho-essential', name: 'Zoho People Essential', description: 'Indicative from Zoho\'s published India pricing: roughly ₹50 per employee/month (annual billing), no bundled headcount tier.', calculate: (count) => 50 * count },
  { id: 'zoho-professional', name: 'Zoho People Professional', description: 'Indicative from Zoho\'s published India pricing: roughly ₹100 per employee/month (annual billing).', calculate: (count) => 100 * count },
]

const YEARLY_DISCOUNT_PERCENT = 17

const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

const pageFontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&family=Instrument+Sans:wght@400;500;600;700&display=swap');
  .font-display { font-family: 'Sora', sans-serif; }
  .font-body { font-family: 'DM Sans', sans-serif; }
  .font-ui { font-family: 'Instrument Sans', sans-serif; }
`

function ComparePanel({ plan, employees, monthlyTotal, competitorId, onCompetitorSelect, competitorName, onCompetitorNameChange, competitorEmployees, onCompetitorEmployeesChange, competitorCost, onCompetitorCostChange, onReset }) {
  const [hasRun, setHasRun] = useState(false)

  const competitorMonthly = Number(competitorCost)
  const hasQuote = Number.isFinite(competitorMonthly) && competitorMonthly > 0
  const showResults = hasRun && hasQuote
  const difference = showResults && monthlyTotal !== null ? competitorMonthly - monthlyTotal : null
  const monthlyLabel = monthlyTotal !== null ? fmt(monthlyTotal) : 'Custom'
  const savingsPercent = difference !== null && difference > 0 && competitorMonthly > 0 ? Math.round((difference / competitorMonthly) * 100) : null

  const handleReset = () => {
    setHasRun(false)
    onReset()
  }

  return (
    <section className="bg-gradient-to-b ">
      <div className="mx-auto max-w-[900px] px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-6 text-center">
          <p className="font-ui text-[11px] font-bold uppercase tracking-[0.14em] text-[#9c1d60]">Head-to-head comparison</p>
          <h2 className="mt-1 font-display text-2xl font-extrabold tracking-[-0.04em] text-[#0f2b2b]">See exactly what you'd save vs. another tool</h2>
          <p className="mt-2 font-body text-sm text-[#4d6666]">Pick a tool, fill in its quote and coverage, then run the comparison for a side-by-side breakdown.</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#9c1d60] bg-white p-4 shadow-[0_12px_28px_rgba(12,110,110,.08)] sm:p-5">
          <div className="rounded-xl border border-[#9c1d60] p-4">
            <label className="font-ui text-sm font-bold text-[#0f2b2b]">1. Which tool are you comparing?</label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select value={competitorId} onChange={(event) => onCompetitorSelect(event.target.value)} className="rounded-lg border border-[#9c1d60] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#9c1d60]">
                {COMPETITORS.map((competitor) => <option key={competitor.id} value={competitor.id}>{competitor.name}</option>)}
              </select>
              {competitorId === 'custom' ? (
                <input value={competitorName} onChange={(event) => onCompetitorNameChange(event.target.value)} placeholder="Enter tool name" className="rounded-lg border border-[#9c1d60] px-3 py-2.5 font-body text-sm outline-none focus:border-[#0c6e6e]" />
              ) : (
                <div className="rounded-lg bg-[#eef7f6] px-3 py-2.5 font-body text-xs leading-relaxed text-[#3d5555]">{COMPETITORS.find((competitor) => competitor.id === competitorId)?.description}</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#9c1d60] p-4">
            <label className="font-ui text-sm font-bold text-[#0f2b2b]">2. How many employees does the quote cover?</label>
            {competitorId === 'custom' ? (
              <input value={competitorEmployees} onChange={(event) => onCompetitorEmployeesChange(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder={`Your TorchX estimate uses ${employees} employees`} className="mt-3 w-full rounded-lg border border-[#9c1d60] px-3 py-2.5 font-body text-sm outline-none focus:border-[#0c6e6e]" />
            ) : (
              <div className="mt-3 rounded-lg bg-[#eef7f6] px-3 py-2.5 font-body text-xs text-[#3d5555]">Synced to your team size · <b>{employees}</b> employees</div>
            )}
          </div>

          <div className="rounded-xl border border-[#9c1d60] p-4">
            <label className="font-ui text-sm font-bold text-[#0f2b2b]">3. What's their monthly quote?</label>
            {competitorId === 'custom' ? (
              <div className="mt-3 flex overflow-hidden rounded-lg border border-[#9c1d60] focus-within:border-[#0c6e6e]">
                <span className="px-3 py-2.5 font-display font-extrabold text-[#0c6e6e]">₹</span>
                <input value={competitorCost} onChange={(event) => onCompetitorCostChange(event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="Enter monthly amount" className="min-w-0 flex-1 px-1 py-2.5 font-body text-sm outline-none" />
                <span className="self-center pr-3 font-body text-xs text-[#6a8383]">/ month</span>
              </div>
            ) : (
              <div className="mt-3 rounded-lg bg-[#eef7f6] px-3 py-2.5 font-body text-sm text-[#0f2b2b]">
                <b className="font-display">{competitorCost ? `₹${Number(competitorCost).toLocaleString('en-IN')}` : '—'}</b>
                <span className="ml-1 font-body text-xs text-[#6a8383]">/ month · auto-calculated for {employees} employees from published pricing</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button onClick={() => setHasRun(true)} disabled={!hasQuote} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#9c1d60] px-5 py-3 font-ui text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#9c1d60] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
              <FiPlay size={14} /> Run comparison
            </button>
            <button onClick={handleReset} className="flex items-center justify-center gap-2 rounded-full border border-[#9c1d60] px-5 py-3 font-ui text-sm font-bold text-white transition hover:bg-[#9c1d60]">
              <FiRefreshCw size={14} /> Reset
            </button>
          </div>
          {!hasQuote && <p className="text-center font-body text-xs text-[#6a8383]">Add a monthly quote above to enable the comparison.</p>}
        </div>

        {showResults && (
          <>
            <div className="mt-5 rounded-xl bg-gradient-to-r from-[#7A004B] to-[#7A004B] px-5 py-5 text-center text-white shadow-[0_10px_24px_rgba(12,110,110,.22)]">
              {difference !== null && difference > 0 && (
                <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-ui text-[11px] font-bold uppercase tracking-[0.08em]">
                  <FiTrendingDown size={12} /> {savingsPercent}% cheaper with TorchX
                </span>
              )}
              <p className="font-display text-lg font-extrabold">
                {difference === null ? 'Add their quote to see your monthly comparison' : difference > 0 ? `TorchX Talent is ${fmt(difference)} cheaper per month` : difference < 0 ? `${competitorName || 'The other tool'} is ${fmt(Math.abs(difference))} cheaper per month` : 'Both estimates are the same each month'}
              </p>
              <p className="mt-1 font-body text-xs text-white/80">Comparison uses your selected {plan.name} plan and {employees} TorchX employees.</p>
            </div>

            <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="relative order-1 overflow-hidden rounded-xl bg-gradient-to-br from-[#9c1d60] to-[#2b1020] p-4 text-white shadow-[0_14px_30px_rgba(122,0,75,.28)]">
                {difference !== null && difference >= 0 && (
                  <span className="absolute right-4 top-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-ui text-[10px] font-bold text-[#7A004B]">
                    <FiAward size={11} /> {savingsPercent !== null ? `${savingsPercent}% cheaper` : 'Best value'}
                  </span>
                )}
                <p className="font-ui text-[10px] font-bold uppercase tracking-[0.12em] text-[#f0a4ca]">TorchX Talent</p>
                <p className="mt-2 font-display text-2xl font-extrabold">{monthlyLabel}</p>
                <p className="font-body text-xs text-[#ead1de]">{plan.name} · {employees} employees · per month</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {plan.features.map((feature) => <span key={feature} className="rounded-full bg-white/15 px-2 py-1 font-body text-[10px] text-white">{feature}</span>)}
                </div>
              </div>

              <div className="order-2 hidden items-center justify-center sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2b8cf] bg-white font-ui text-[11px] font-extrabold text-[#7A004B]">VS</span>
              </div>

              <div className="order-3 rounded-xl border border-[#e2d8dd] bg-[#faf7f8] p-4">
                <p className="font-ui text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b7580]">What you're paying today</p>
                <p className="mt-2 font-display text-2xl font-extrabold text-[#5c4a52]">{fmt(competitorMonthly)}</p>
                <p className="font-body text-xs text-[#8b7580]">{competitorName || 'Other tool'} · {competitorEmployees || employees} employees</p>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default function TalentPricingCalculator() {
  const [employees, setEmployees] = useState(100)
  const [selectedPlan, setSelectedPlan] = useState('basic')
  const [billing, setBilling] = useState('monthly')
  const [openFaq, setOpenFaq] = useState(null)
  const [activeView, setActiveView] = useState('estimate')
  const [competitorCost, setCompetitorCost] = useState('')
  const [competitorId, setCompetitorId] = useState('custom')
  const [competitorName, setCompetitorName] = useState('')
  const [competitorEmployees, setCompetitorEmployees] = useState('')

  const plan = PLANS.find((p) => p.id === selectedPlan)

  const monthlyTotal = plan.pepm !== null ? plan.pepm * employees : null
  const displayTotal = billing === 'yearly' && monthlyTotal !== null ? monthlyTotal * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100) : monthlyTotal
  const perEmployee = monthlyTotal !== null ? monthlyTotal / employees : null

  const bestSavings = (() => {
    if (monthlyTotal === null) return null
    let best = null
    for (const competitor of COMPETITORS) {
      if (!competitor.calculate) continue
      const competitorMonthly = competitor.calculate(employees)
      const diff = competitorMonthly - monthlyTotal
      if (diff > 0 && (!best || diff > best.diff)) {
        best = { name: competitor.name, diff, percent: Math.round((diff / competitorMonthly) * 100) }
      }
    }
    return best
  })()

  useEffect(() => {
    if (document.getElementById('calendly-widget-script')) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://assets.calendly.com/assets/external/widget.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.id = 'calendly-widget-script'
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  const openBookingCalendar = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_URL })
    } else {
      window.open(CALENDLY_URL, '_blank', 'noopener,noreferrer')
    }
  }

  const selectCompetitor = (id) => {
    const competitor = COMPETITORS.find((item) => item.id === id)
    setCompetitorId(id)
    setCompetitorName(id === 'custom' ? '' : competitor.name)
    setCompetitorEmployees(String(employees))
    setCompetitorCost(competitor.calculate ? String(Math.round(competitor.calculate(employees))) : '')
  }

  useEffect(() => {
    const competitor = COMPETITORS.find((item) => item.id === competitorId)
    if (!competitor || !competitor.calculate) return
    setCompetitorEmployees(String(employees))
    setCompetitorCost(String(Math.round(competitor.calculate(employees))))
  }, [employees, competitorId])

  const resetComparison = () => {
    setCompetitorId('custom')
    setCompetitorName('')
    setCompetitorEmployees('')
    setCompetitorCost('')
  }

  return (
    <div className="h-screen overflow-y-auto bg-[#fbf7f9] font-body text-[#25101d]">
      <style>{pageFontStyles}</style>
      <div className="border-b border-[#f0dce6] bg-[#FDF4F8] px-6 py-2 text-center font-body text-xs text-[#7a5a1d]">
        <b>Estimates only</b> — based on TorchX Talent's published pricing. Not a binding commercial proposal. Prices exclude taxes.
      </div>

      <section className="mx-auto max-w-[860px] px-4 pb-6 pt-10 text-center sm:px-6 sm:pt-12">
        <p className="font-ui text-[11px] font-bold uppercase tracking-[0.16em] text-[#9c1d60]">India price calculator · FY 2026</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
          Get  your  HRMS  savings in <span className="text-[#7A004B]">60 seconds</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[520px] font-body text-sm text-[#76616c]">
          Choose monthly or annual billing, pick a plan, then drop in your team size. Your estimate updates as you go.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex max-w-[calc(100vw-24px)] items-center gap-1.5 rounded-full border border-[#eccddd] bg-white px-2.5 py-1.5 shadow-[0_5px_20px_rgba(122,0,75,.06)] sm:gap-3 sm:px-4 sm:py-2">
            <span className={`relative z-10 shrink-0 whitespace-nowrap font-ui text-xs font-bold sm:text-sm ${billing === 'monthly' ? 'text-[#25101d]' : 'text-[#a8909c]'}`} >
              Monthly
            </span>
            <button
              type="button"
              aria-label="Toggle monthly and yearly billing"
              aria-pressed={billing === 'yearly'}
              onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative z-0 h-6 min-w-[44px] w-[44px] shrink-0 overflow-hidden rounded-full transition ${billing === 'yearly' ? 'bg-[#7A004B]' : 'bg-[#d9b7c8]'}`}
            >
              <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${billing === 'yearly' ? 'translate-x-[20px]' : 'translate-x-0'}`} />
            </button>
            <span className={`relative z-10 shrink-0 whitespace-nowrap font-ui text-xs font-bold sm:text-sm ${billing === 'yearly' ? 'text-[#25101d]' : 'text-[#a8909c]'}`} >
              Yearly
            </span>
            <span className="shrink-0 whitespace-nowrap rounded-full bg-[#7A004B] px-1.5 py-0.5 font-ui text-[9px] font-bold leading-none text-white sm:px-2 sm:text-[10px]">
              Save {YEARLY_DISCOUNT_PERCENT}%
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1180px] gap-5 overflow-x-auto border-b border-[#efdee7] px-4 sm:px-6">
        <button onClick={() => setActiveView('estimate')} className={`border-b-2 px-1 pb-3 font-ui text-sm font-bold transition ${activeView === 'estimate' ? 'border-[#7A004B] text-[#7A004B]' : 'border-transparent text-[#8b7580] hover:text-[#4a3b43]'}`}>Estimate</button>
        <button onClick={() => setActiveView('compare')} className={`border-b-2 px-1 pb-3 font-ui text-sm font-semibold transition ${activeView === 'compare' ? 'border-[#7A004B] text-[#7A004B]' : 'border-transparent text-[#8b7580] hover:text-[#4a3b43]'}`}>Compare with another tool</button>
      </div>

      {activeView === 'compare' && (
        <ComparePanel
          plan={plan}
          employees={employees}
          monthlyTotal={monthlyTotal}
          competitorId={competitorId}
          onCompetitorSelect={selectCompetitor}
          competitorName={competitorName}
          onCompetitorNameChange={setCompetitorName}
          competitorEmployees={competitorEmployees}
          onCompetitorEmployeesChange={setCompetitorEmployees}
          competitorCost={competitorCost}
          onCompetitorCostChange={setCompetitorCost}
          onReset={resetComparison}
        />
      )}

      <div className={`${activeView === 'estimate' ? 'grid' : 'hidden'} mx-auto max-w-[1120px] gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]`}>
        <div className="rounded-2xl border border-[#efdee7] bg-white p-6 sm:p-7">
          <h2 className="font-display text-lg font-extrabold">Configure your estimate</h2>
          <p className="mt-1 font-body text-sm text-[#76616c]">Everything updates live as you change inputs.</p>

          <div className="mt-6 border-t border-[#f0dce6] pt-6">
            <h3 className="font-ui text-sm font-bold">Pick a plan</h3>
            <p className="mt-1 font-body text-xs text-[#8b7580]">Priced live for your {employees}-employee team.</p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              {PLANS.map((item) => {
                const selected = item.id === selectedPlan
                const cost = item.pepm !== null ? item.pepm * employees : null
                const ownFeatures = FEATURE_MATRIX.filter((f) => f.tier === item.tier).map((f) => f.name)
                const inheritedFrom = item.tier > 0 ? PLANS.find((p) => p.tier === item.tier - 1) : null
                return (
                  <div key={item.id} className={`relative flex flex-col rounded-2xl border p-4 transition ${selected ? 'border-[#7A004B] shadow-[0_10px_24px_rgba(122,0,75,.12)]' : 'border-[#ead9e2]'}`}>
                    {item.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7A004B] px-3 py-1 font-ui text-[10px] font-bold text-white">Most Popular</span>
                    )}
                    <span className="font-ui text-base font-extrabold text-[#25101d]">{item.name}</span>
                    <p className="mt-1 font-body text-xs text-[#8b7580]">{item.summary}</p>

                    <div className="mt-4 font-display text-2xl font-extrabold text-[#25101d]">
                      {item.pepm !== null ? <>{fmt(item.pepm)}<span className="font-body text-xs font-normal text-[#8b7580]"> / user / mo</span></> : 'Custom'}
                    </div>
                    <p className="mt-0.5 font-body text-[11px] text-[#8b7580]">{item.pepm !== null ? `${employees.toLocaleString('en-IN')} employees = ${fmt(cost)} / month` : 'Talk to sales for a tailored quote'}</p>

                    {inheritedFrom && <p className="mt-3 font-ui text-xs font-bold text-[#7A004B]">Everything in {inheritedFrom.name} +</p>}
                    <ul className={`space-y-1.5 font-body text-xs text-[#4f3e47] ${inheritedFrom ? 'mt-2' : 'mt-4'}`}>
                      {ownFeatures.map((feature) => (
                        <li key={feature} className="flex items-start gap-1.5"><FiCheck className="mt-0.5 shrink-0 text-[#7A004B]" size={13} />{feature}</li>
                      ))}
                    </ul>

                    <button onClick={() => setSelectedPlan(item.id)} className={`mt-4 w-full rounded-full px-4 py-2.5 font-ui text-sm font-extrabold transition ${selected ? 'bg-[#7A004B] text-white' : 'bg-[#FDF4F8] text-[#7A004B] hover:bg-[#f3dbe8]'}`}>
                      {selected ? 'Selected' : 'Start Free Trial'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 border-t border-[#f0dce6] pt-6">
            <h3 className="font-ui text-sm font-bold">How big is your team?</h3>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {HEADCOUNT_BANDS.map((band) => (
                <button key={band.label} onClick={() => setEmployees(band.value)} className={`rounded-lg border px-2 py-2.5 text-left transition ${employees === band.value ? 'border-[#7A004B] bg-[#FDF4F8]' : 'border-[#e6cbd8] hover:border-[#c78da9]'}`}>
                  <div className={`font-ui text-sm font-bold ${employees === band.value ? 'text-[#7A004B]' : 'text-[#25101d]'}`}>{band.label}</div>
                  <div className="font-body text-[10px] text-[#8b7580]">{band.sub}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <input type="range" min="1" max="2500" value={employees} onChange={(e) => setEmployees(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[#ead4df] accent-[#7A004B]" />
              <input type="number" min="1" value={employees} onChange={(e) => setEmployees(Math.min(2500, Math.max(1, Number(e.target.value) || 1)))} className="w-full rounded-lg sm:w-[84px] border border-[#dcb8ca] px-2 py-1.5 text-center font-display text-sm font-extrabold outline-none" />
            </div>
            <p className="mt-2 font-body text-xs text-[#8b7580]">Include everyone on your payroll — full-time, part-time and contractors.</p>
          </div>

          <div className="mt-6 border-t border-[#f0dce6] pt-6">
            <h3 className="font-ui text-sm font-bold">Compare all plans side-by-side</h3>
            <p className="mt-1 font-body text-xs text-[#8b7580]">A horizontal view of what's included at every tier. Scroll on smaller screens.</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-[#ead9e2]">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#ead9e2] bg-[#fdf4f8]">
                    <th className="w-[38%] px-4 py-3 font-ui text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b7580]">Plan</th>
                    {PLANS.map((item) => (
                      <th key={item.id} className="px-3 py-3 text-center">
                        <button onClick={() => setSelectedPlan(item.id)} className={`w-full rounded-lg px-2 py-1.5 font-ui text-xs font-bold transition ${item.id === selectedPlan ? 'bg-[#7A004B] text-white' : 'text-[#7A004B] hover:bg-[#f3dbe8]'}`}>
                          {item.name}
                        </button>
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-[#ead9e2]">
                    <td className="px-4 py-3 font-body text-xs text-[#76616c]">Per user / month</td>
                    {PLANS.map((item) => (
                      <td key={item.id} className="px-3 py-3 text-center font-display text-sm font-extrabold text-[#25101d]">{item.pepm !== null ? `${fmt(item.pepm)} / user / mo` : 'Custom'}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-[#ead9e2]">
                    <td className="px-4 py-3 font-body text-xs text-[#76616c]">Team total</td>
                    {PLANS.map((item) => (
                      <td key={item.id} className="px-3 py-3 text-center font-body text-xs text-[#76616c]">{item.pepm !== null ? fmt(item.pepm * employees) : 'Custom'}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_MATRIX.map((feature) => (
                    <tr key={feature.name} className="border-b border-[#f3e6ec] last:border-0">
                      <td className="px-4 py-2.5 font-body text-xs text-[#4f3e47]">{feature.name}</td>
                      {PLANS.map((item) => (
                        <td key={item.id} className="px-3 py-2.5 text-center">
                          {item.tier >= feature.tier ? <FiCheck className="inline text-[#7A004B]" /> : <FiX className="inline text-[#e1c3d0]" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <aside className="h-fit lg:sticky lg:top-6">
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#efdee7] bg-white p-4 font-body text-xs text-[#76616c]">
            <FiInfo className="mt-0.5 shrink-0 text-[#9c1d60]" />
            Pick your billing period, plan and team size on the left to update your total instantly.
          </div>
          <div className="rounded-2xl bg-[#2b1020] p-5 text-white sm:p-6">
            <p className="font-ui text-[11px] font-bold uppercase tracking-[0.14em] text-[#f0a4ca]">Your estimate</p>
            <h3 className="mt-1 font-display text-lg font-extrabold">{plan.name} · {employees} employees</h3>

            {bestSavings && (
              <button onClick={() => setActiveView('compare')} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-left transition hover:bg-white/15">
                <FiTrendingDown className="shrink-0 text-[#f0a4ca]" size={16} />
                <span className="font-body text-xs text-[#f4dfe9]">Best case: up to <b className="font-ui text-white">{bestSavings.percent}% cheaper</b> than {bestSavings.name} — save {fmt(bestSavings.diff)}/mo</span>
              </button>
            )}

            <div className="mt-5 space-y-2 border-t border-white/15 pt-4 font-body text-sm text-[#f4dfe9]">
              <div className="flex items-center justify-between gap-4"><span>Price per user / month</span><b className="font-ui text-white">{plan.pepm !== null ? fmt(plan.pepm) : 'Custom'}</b></div>
              {plan.pepm !== null && (
                <div className="flex items-center justify-between gap-4"><span>{employees.toLocaleString('en-IN')} users × {fmt(plan.pepm)}</span><b className="font-ui text-white">{fmt(monthlyTotal)}</b></div>
              )}
            </div>

            <div className="my-5 rounded-xl bg-gradient-to-br from-[#9c1d60] to-[#5c0038] p-5">
              <p className="font-ui text-[10px] font-bold uppercase tracking-[0.14em] text-[#f0a4ca]">{billing === 'yearly' ? `Annual total · ${YEARLY_DISCOUNT_PERCENT}% off` : 'Monthly total'}</p>
              <div className="mt-1 font-display text-3xl font-extrabold tracking-[-0.04em]">{displayTotal !== null ? fmt(displayTotal) : 'Custom'}</div>
              <p className="mt-1 font-body text-xs text-[#ead1de]">excl. taxes</p>
              {perEmployee !== null && <p className="mt-2 border-t border-white/15 pt-2 font-body text-xs text-[#ead1de]">Effective per-employee cost: {fmt(perEmployee)} / emp / mo</p>}
            </div>

            <button onClick={openBookingCalendar} className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-ui text-sm font-extrabold text-[#7A004B] transition hover:-translate-y-0.5 hover:bg-[#fff1f7]">
              <FiCalendar size={15} /> Book a Demo
            </button>

            <button onClick={() => setActiveView('compare')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-3 font-ui text-sm font-bold text-white transition hover:bg-white/10">
              See how this compares elsewhere
            </button>

            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="font-ui text-xs font-bold text-[#f7d9e8]">What this plan covers</p>
              <ul className="mt-3 grid grid-cols-1 gap-2 font-body text-xs text-[#e5ccda] sm:grid-cols-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><FiCheck className="mt-0.5 shrink-0 text-[#f0a4ca]" />{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <section className="mx-auto max-w-[860px] px-6 pb-8">
        <h2 className="font-display text-xl font-extrabold">How this calculator works</h2>
        <p className="mt-1 font-body text-sm text-[#76616c]">No black boxes — every number traces back to published pricing.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="rounded-xl border border-[#efdee7] bg-white p-4">
            <h3 className="font-ui text-sm font-bold text-[#7A004B]">Plan structure</h3>
            <p className="mt-1 font-body text-xs text-[#76616c]">Each paid plan has a per-employee-per-month rate. Your selected rate is multiplied by the number of employees entered in the calculator. Enterprise is a custom quote.</p>
          </div>
          <div className="rounded-xl border border-[#7A004B] p-4">
            <h3 className="font-ui text-sm font-bold text-[#7A004B]">Comparing with another tool</h3>
            <p className="mt-1 font-body text-xs text-[#3d5555]">Switch to the Compare tab, pick a tool or enter a custom quote, then press Run Comparison to see the savings side by side.</p>
          </div>
          <div className="rounded-xl border border-[#efdee7] bg-white p-4">
            <h3 className="font-ui text-sm font-bold text-[#7A004B]">Resetting your comparison</h3>
            <p className="mt-1 font-body text-xs text-[#76616c]">Hit Reset in the Compare tab any time to clear the competitor fields and start a fresh comparison from scratch.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[860px] px-6 pb-16">
        <h2 className="font-display text-xl font-extrabold">Common questions</h2>
        <div className="mt-4 divide-y divide-[#efdee7] rounded-xl border border-[#efdee7] bg-white">
          {FAQS.map((item, i) => (
            <div key={item.q} className="px-5">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-4 text-left font-ui text-sm font-bold">
                {item.q}
                <FiChevronDown className={`shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <p className="pb-4 font-body text-sm text-[#76616c]">{item.a}</p>}
            </div>
          ))}
        </div>
        <p className="mt-6 font-body text-xs text-[#8b7580]">
          <b>Disclaimer.</b> This calculator provides indicative estimates based on TorchX Talent's published FY 2026 pricing for India. Competitor figures shown in the comparison tool are indicative, sourced from publicly published pricing pages, and may have changed — confirm directly with the provider. Actual invoiced amounts may vary based on final contract terms, applicable taxes (GST at 18%), and any negotiated commercial constructs.
        </p>
      </section>
    </div>
  )
}
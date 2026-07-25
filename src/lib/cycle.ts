export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

export function getCycleInfo(lastPeriodStart: string, avgCycleLength: number, avgPeriodLength: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(lastPeriodStart)
  start.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const dayOfCycle = (((diffDays % avgCycleLength) + avgCycleLength) % avgCycleLength) + 1

  const ovulationDay = avgCycleLength - 14
  const fertileStart = ovulationDay - 5
  const fertileEnd = ovulationDay + 1

  let phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'
  let phaseStartDay: number
  if (dayOfCycle <= avgPeriodLength) {
    phase = 'menstrual'
    phaseStartDay = 1
  } else if (dayOfCycle < fertileStart) {
    phase = 'follicular'
    phaseStartDay = avgPeriodLength + 1
  } else if (dayOfCycle >= fertileStart && dayOfCycle <= fertileEnd) {
    phase = 'ovulatory'
    phaseStartDay = fertileStart
  } else {
    phase = 'luteal'
    phaseStartDay = fertileEnd + 1
  }

  const dayInPhase = dayOfCycle - phaseStartDay + 1

  const nextPeriodStart = new Date(start)
  while (nextPeriodStart <= today) {
    nextPeriodStart.setDate(nextPeriodStart.getDate() + avgCycleLength)
  }
  const daysUntilNextPeriod = Math.ceil((nextPeriodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return { dayOfCycle, phase, dayInPhase, daysUntilNextPeriod, nextPeriodStart: nextPeriodStart.toISOString().split('T')[0] }
}

export const phaseLabels: Record<string, string> = {
  menstrual: 'menstrual',
  follicular: 'follicular',
  ovulatory: 'ovulatory',
  luteal: 'luteal',
}

export const phaseDescriptions: Record<string, string> = {
  menstrual: 'period is happening',
  follicular: 'building up energy',
  ovulatory: 'peak fertility window',
  luteal: 'winding down toward next cycle',
}

// Plain-language education for each phase — written so a partner who has never
// tracked a cycle understands what's happening and how their person may feel.
export interface PhaseInfo {
  whatItIs: string
  howTheyFeel: string
  forPartner: string
}

export const PHASE_INFO: Record<Phase, PhaseInfo> = {
  menstrual: {
    whatItIs: "The period itself — the body sheds its uterine lining. Hormones are at their lowest.",
    howTheyFeel: "Often tired, crampy and low-energy. Warmth, rest and quiet usually feel best.",
    forPartner: "Bring comfort: snacks, a heating pad, patience, and zero pressure to be 'on'.",
  },
  follicular: {
    whatItIs: "The rebuild after the period. Estrogen rises and the body preps a new egg.",
    howTheyFeel: "Energy and mood climb — more social, creative and up for things.",
    forPartner: "Great stretch to make plans or try something new together while the energy's high.",
  },
  ovulatory: {
    whatItIs: "Mid-cycle: an egg is released and estrogen peaks. The shortest phase.",
    howTheyFeel: "Usually the highest confidence, energy and mood of the whole month.",
    forPartner: "Match the glow — be spontaneous, plan the date, go do something fun.",
  },
  luteal: {
    whatItIs: "The wind-down before the next period. Progesterone rises, then drops (the PMS window).",
    howTheyFeel: "Energy dips; more sensitive or irritable, with cravings and fatigue common.",
    forPartner: "Softer days: extra patience and comfort, and don't take the mood personally.",
  },
}

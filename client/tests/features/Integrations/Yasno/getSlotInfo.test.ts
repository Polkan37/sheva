import { describe, expect, it } from 'vitest'
import { getSlotInfo } from '@/features/Integrations/Yasno/getSlotInfo'

describe('getSlotInfo', () => {
  it('labels a Definite slot as no power', () => {
    expect(getSlotInfo('Definite').label).toBe('Немає світла')
  })

  it('labels a NotPlanned slot as power available', () => {
    expect(getSlotInfo('NotPlanned').label).toBe('Світло є')
  })

  it('labels any other slot type as a possible outage', () => {
    expect(getSlotInfo('SomethingElse').label).toBe('Можливе відключення')
  })
})

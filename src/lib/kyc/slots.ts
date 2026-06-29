import type { Deal, Slot, SlotSpec, SessionDoD } from './types'

// The compliance motor: a pure function over deal attributes that derives the
// exact set of slots this deal needs (spec §3/§4). v1 hard-codes the rule set;
// later it becomes data-driven. The slot spec keeps the LLM on rails — it can't
// skip a legal requirement or wander.

const t = (
  key: string,
  question: string,
  whyItMatters: string,
  extra: Partial<SlotSpec> = {},
): SlotSpec => ({
  key,
  question,
  whyItMatters,
  inputKind: 'text',
  evidenceRequired: 'none',
  validation: { deterministic: ['valuePresent'], rubric: 'Satisfied if a concrete answer is present.' },
  ...extra,
})

export function buildSlots(deal: Deal): SlotSpec[] {
  const slots: SlotSpec[] = []

  // Personligt — name/pnr/identity auto-confirmed from BankID.
  slots.push(
    t(
      'buyer.identity',
      'Stämmer dina personuppgifter? (namn, personnummer, adress)',
      'Mäklaren måste kunna identifiera dig (lagkrav).',
      { guidanceType: 'identity' },
    ),
    t('buyer.contact', 'Telefon och mejl?', 'För att kunna nå dig om något behöver kompletteras.'),
    t('buyer.occupation', 'Yrke, arbetsgivare och sysselsättningsgrad?', 'Del av kundkännedomen.'),
  )

  if (deal.role === 'seller') {
    // Seller reuses personal + control + countries, minus most source-of-funds.
    slots.push(
      t('control.beneficial_owner', 'Säljer du för egen räkning?', 'Verklig huvudman måste fastställas.', {
        inputKind: 'choice',
        choices: ['För egen räkning', 'För annans räkning'],
        guidanceType: 'beneficial_owner',
      }),
      t('control.pep', 'Är du en person i politiskt utsatt ställning (PEP)?', 'PEP-status kräver skärpta åtgärder.', {
        inputKind: 'choice',
        choices: ['Nej', 'Ja'],
        guidanceType: 'pep',
      }),
    )
    slots.push(attestation())
    return slots
  }

  // Objekt
  slots.push(
    t('object.share', 'Hur stor andel köper du? (i andelar, t.ex. 1/1, 1/2)', 'Ägarandelen ska dokumenteras i andelar, inte procent.'),
  )

  // Finansiering → branches
  slots.push(
    t('financing.method', 'Hur finansieras köpet?', 'Avgör vilka underlag som behövs.', {
      inputKind: 'choice',
      choices: ['Bolån', 'Kontant'],
    }),
  )
  if (deal.paymentType === 'loan') {
    slots.push(
      t('financing.loan', 'Ladda upp ditt lånelöfte (belopp + bank).', 'Visar finansieringen.', {
        inputKind: 'file',
        evidenceRequired: 'required',
        guidanceType: 'loan_promise',
        validation: { deterministic: ['evidenceAttachedOrDeferred'], rubric: 'Satisfied when a loan promise document is attached or explicitly deferred.' },
      }),
    )
  }
  slots.push(sourceSlot('funds.kontantinsats.origin', 'Varifrån kommer kontantinsatsen?', 'optional'))
  if (deal.paymentType === 'cash') {
    // No bank in the loop → the realtor shoulders the full source-of-funds burden.
    slots.push(sourceSlot('funds.full.origin', 'Källkontroll – varifrån kommer pengarna till hela köpet?', 'required'))
  }

  // Syfte
  slots.push(t('purpose', 'Vad är syftet med förvärvet?', 'Affärens syfte och art ska dokumenteras.', { guidanceType: 'purpose' }))

  // Kontroll
  slots.push(
    t('control.beneficial_owner', 'Köper du för egen räkning?', 'Verklig huvudman måste fastställas.', {
      inputKind: 'choice',
      choices: ['För egen räkning', 'För annans räkning'],
      guidanceType: 'beneficial_owner',
    }),
    t('control.ombud', 'Företräds du av ett ombud?', 'Ombud ska dokumenteras.', { inputKind: 'choice', choices: ['Nej', 'Ja'] }),
    t('control.pep', 'Är du, eller någon nära dig, en person i politiskt utsatt ställning (PEP)?', 'PEP-status kräver skärpta åtgärder.', {
      inputKind: 'choice',
      choices: ['Nej', 'Ja'],
      guidanceType: 'pep',
    }),
  )

  // Länder
  slots.push(
    t('countries.citizenship', 'Har du dubbelt medborgarskap?', 'Påverkar riskbedömningen.', { inputKind: 'choice', choices: ['Nej', 'Ja'] }),
    t('countries.tax_residency', 'Har du skatterättslig hemvist utanför Sverige?', 'Styr rapporteringskrav.', {
      inputKind: 'choice',
      choices: ['Nej', 'Ja'],
      guidanceType: 'tax_residency',
    }),
  )

  // Company buyer — org-nr → verklig huvudman/board auto-fetched, buyer confirms.
  if (deal.buyerType === 'company') {
    slots.push(
      t('company.orgnr', 'Bolagets organisationsnummer?', 'Bolaget måste identifieras.'),
      t('company.beneficial_owner', 'Bekräfta verklig huvudman och firmatecknare i bolaget.', 'Verklig huvudman i bolaget ska fastställas.', {
        evidenceRequired: 'required',
        guidanceType: 'beneficial_owner',
        validation: { deterministic: ['valuePresent'], rubric: 'Satisfied when beneficial owner(s) and signatory are confirmed against the registry.' },
      }),
    )
  }

  // Intygande
  slots.push(attestation())
  return slots
}

function sourceSlot(key: string, question: string, evidence: 'optional' | 'required'): SlotSpec {
  return t(key, question, 'Mäklaren måste förstå varifrån pengarna kommer (lagkrav).', {
    evidenceRequired: evidence,
    guidanceType: 'source_of_funds',
    validation: {
      deterministic: ['originBucketIdentified', evidence === 'required' ? 'evidenceAttachedOrDeferred' : 'always'],
      rubric:
        'Satisfied only if the origin is a concrete legitimate source (sale/savings/inheritance/gift/securities/salary) AND the specifying follow-ups are answered (e.g. savings → bank + period + income).',
    },
  })
}

function attestation(): SlotSpec {
  return t('attestation', 'Intyga med BankID att uppgifterna stämmer.', 'Ersätter pappersintyget – signeras med BankID.', {
    inputKind: 'file',
    evidenceRequired: 'required',
    guidanceType: 'identity',
    validation: { deterministic: ['evidenceAttachedOrDeferred'], rubric: 'Satisfied when the BankID attestation is signed.' },
  })
}

/** Turn a requirement spec into the initial (all-pending) runtime slots. */
export function initSlots(specs: SlotSpec[]): Slot[] {
  return specs.map((s) => ({
    key: s.key,
    status: 'pending',
    value: null,
    confidence: 0,
    evidence: [],
    flags: [],
    followUpCount: 0,
  }))
}

/** Soft gate (spec §2): complete when every slot is satisfied OR flagged. */
export function computeDoD(slots: Slot[]): SessionDoD {
  return {
    requiredKeys: slots.map((s) => s.key),
    satisfied: slots.filter((s) => s.status === 'satisfied').map((s) => s.key),
    flagged: slots.filter((s) => s.status === 'flagged').map((s) => s.key),
    complete: slots.every((s) => s.status === 'satisfied' || s.status === 'flagged'),
  }
}

import {
  ActivityEvent,
  Agent,
  Commission,
  CRM_SCHEMA_VERSION,
  CRMState,
  Customer,
  Lead,
  LeadStatus,
  Product,
  Provider,
  QAChecklistItem,
  QAReview
} from '../types/crm';
import { QA_CHECKLIST_TEMPLATE } from '../utils/calculations';

function daysAgoISO(daysAgo: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysAgoDate(daysAgo: number): string {
  return daysAgoISO(daysAgo).slice(0, 10);
}

function buildChecklist(failedKey?: QAChecklistItem['key']): QAChecklistItem[] {
  return QA_CHECKLIST_TEMPLATE.map((item) => ({
    key: item.key,
    label: item.label,
    status: failedKey === item.key ? 'fail' : 'pass',
    note: failedKey === item.key ? 'Verification discrepancy noted during audit' : undefined
  }));
}

export function createSeedData(): CRMState {
  const agents: Agent[] = [
    {
      id: 'AG-001',
      fullName: 'Thabo Mokoena',
      email: 'thabo.mokoena@fibresales.demo',
      phone: '082 555 0101',
      startDate: '2025-02-10',
      isActive: true
    },
    {
      id: 'AG-002',
      fullName: 'Megan van der Merwe',
      email: 'megan.vdm@fibresales.demo',
      phone: '083 555 0102',
      startDate: '2025-04-01',
      isActive: true
    },
    {
      id: 'AG-003',
      fullName: 'Riyadh Patel',
      email: 'riyadh.patel@fibresales.demo',
      phone: '072 555 0103',
      startDate: '2025-05-15',
      isActive: true
    },
    {
      id: 'AG-004',
      fullName: 'Nomsa Dlamini',
      email: 'nomsa.dlamini@fibresales.demo',
      phone: '079 555 0104',
      startDate: '2025-08-04',
      isActive: true
    },
    {
      id: 'AG-005',
      fullName: 'Callum Botha',
      email: 'callum.botha@fibresales.demo',
      phone: '061 555 0105',
      startDate: '2026-01-12',
      isActive: true
    },
    {
      id: 'AG-006',
      fullName: 'Zinhle Khumalo',
      email: 'zinhle.khumalo@fibresales.demo',
      phone: '084 555 0106',
      startDate: '2024-11-01',
      isActive: false
    }
  ];

  const providers: Provider[] = [
    { id: 'PROV-AFRIHOST', name: 'Afrihost', code: 'AFR', isActive: true },
    { id: 'PROV-MTN', name: 'MTN', code: 'MTN', isActive: true },
    { id: 'PROV-VODACOM', name: 'Vodacom', code: 'VOD', isActive: true },
    { id: 'PROV-TELKOM', name: 'Telkom', code: 'TEL', isActive: true }
  ];

  const products: Product[] = [
    {
      id: 'PROD-AFR-50',
      providerId: 'PROV-AFRIHOST',
      name: 'Pure Fibre 50/50 Demo',
      speedLabel: '50 Mbps Down / 50 Mbps Up',
      monthlyPrice: 649,
      commissionAmount: 350,
      isActive: true
    },
    {
      id: 'PROD-AFR-100',
      providerId: 'PROV-AFRIHOST',
      name: 'Pure Fibre 100/100 Demo',
      speedLabel: '100 Mbps Down / 100 Mbps Up',
      monthlyPrice: 849,
      commissionAmount: 350,
      isActive: true
    },
    {
      id: 'PROD-MTN-50',
      providerId: 'PROV-MTN',
      name: 'Fibre Home 50 Demo',
      speedLabel: '50 Mbps Down / 25 Mbps Up',
      monthlyPrice: 679,
      commissionAmount: 400,
      isActive: true
    },
    {
      id: 'PROD-MTN-200',
      providerId: 'PROV-MTN',
      name: 'Fibre Pro 200 Demo',
      speedLabel: '200 Mbps Down / 100 Mbps Up',
      monthlyPrice: 999,
      commissionAmount: 400,
      isActive: true
    },
    {
      id: 'PROD-VOD-50',
      providerId: 'PROV-VODACOM',
      name: 'Vodacom Fibre 50/50 Demo',
      speedLabel: '50 Mbps Down / 50 Mbps Up',
      monthlyPrice: 699,
      commissionAmount: 450,
      isActive: true
    },
    {
      id: 'PROD-VOD-100',
      providerId: 'PROV-VODACOM',
      name: 'Vodacom Fibre 100/50 Demo',
      speedLabel: '100 Mbps Down / 50 Mbps Up',
      monthlyPrice: 899,
      commissionAmount: 450,
      isActive: true
    },
    {
      id: 'PROD-TEL-25',
      providerId: 'PROV-TELKOM',
      name: 'Openserve Home 25 Demo',
      speedLabel: '25 Mbps Down / 25 Mbps Up',
      monthlyPrice: 529,
      commissionAmount: 300,
      isActive: true
    },
    {
      id: 'PROD-TEL-100',
      providerId: 'PROV-TELKOM',
      name: 'Openserve Home 100 Demo',
      speedLabel: '100 Mbps Down / 50 Mbps Up',
      monthlyPrice: 799,
      commissionAmount: 300,
      isActive: true
    }
  ];

  const samplePeople: Array<[string, string, string, string]> = [
    ['Sipho Ndlovu', '082 555 0110', '14 Acacia Ave', 'Bryanston'],
    ['Annelize Kruger', '083 555 0111', '82 Protea St', 'Centurion'],
    ['Devin Govender', '072 555 0112', '7 Palm Grove', 'Umhlanga'],
    ['Lindiwe Sithole', '079 555 0113', '31 Jacaranda Rd', 'Sandton'],
    ['Pieter Vermeulen', '084 555 0114', '104 Kloof Nek Rd', 'Tamboerskloof'],
    ['Kagiso Molefe', '061 555 0115', '19 Olive Schreiner St', 'Randburg'],
    ['Fatima Abrahams', '082 555 0116', '55 Main Rd', 'Claremont'],
    ['Jason Hendricks', '071 555 0117', '22 Cedar Close', 'Fourways'],
    ['Precious Mabena', '073 555 0118', '9 Willow Way', 'Midrand'],
    ['Willem Coetzee', '083 555 0119', '48 Berg St', 'Durbanville'],
    ['Ayanda Zulu', '076 555 0120', '12 Coral Tree Ln', 'Ballito'],
    ['Claire Pretorius', '082 555 0121', '63 Lynnwood Rd', 'Menlo Park'],
    ['Bongani Tshabalala', '078 555 0122', '5 Aloe Crescent', 'Roodepoort'],
    ['Tariq Essop', '074 555 0123', '29 Victoria Rd', 'Bantry Bay'],
    ['Chantel Fourie', '083 555 0124', '77 Oaklands Ave', 'Bedfordview'],
    ['Kabelo Phiri', '072 555 0125', '40 Republic Rd', 'Ferndale'],
    ['Nadia Jacobs', '079 555 0126', '16 High Level Rd', 'Sea Point'],
    ['Henk Louw', '082 555 0127', '88 Monument St', 'Krugersdorp'],
    ['Refilwe Chauke', '071 555 0128', '3 Sunbird Place', 'Sunninghill'],
    ['Gavin Naidoo', '084 555 0129', '52 Ridge Rd', 'Berea'],
    ['Melissa Badenhorst', '083 555 0130', '27 Waterfall Dr', 'Waterfall'],
    ['Tshepo Mthembu', '076 555 0131', '11 Mimosa Rd', 'Northcliff'],
    ['Zanele Ngcobo', '073 555 0132', '64 Musgrave Rd', 'Durban'],
    ['Johan Swanepoel', '082 555 0133', '18 Riebeeck St', 'Stellenbosch'],
    ['Sasha Maharaj', '072 555 0134', '95 Rivonia Blvd', 'Rivonia'],
    ['Vusi Mahlangu', '078 555 0135', '34 Church St', 'Pretoria East'],
    ['Lauren Ferreira', '083 555 0136', '21 Flamingo St', 'Parkhurst'],
    ['Mpho Sebata', '079 555 0137', '8 Baobab Way', 'Lonehill'],
    ['Craig Steyn', '082 555 0138', '45 Beach Rd', 'Summerstrand'],
    ['Yolanda Mazibuko', '074 555 0139', '15 Cypress Ave', 'Greenside'],
    ['Nikhil Singh', '071 555 0140', '60 Chartwell Dr', 'Umhlanga Ridge'],
    ['Erika Visser', '084 555 0141', '33 De Waal Dr', 'Oranjezicht'],
    ['Tebogo Rakgosi', '076 555 0142', '24 Witkoppen Rd', 'Paulshof'],
    ['Samantha Scholtz', '083 555 0143', '70 Golf Course Rd', 'Constantia'],
    ['Dumisani Nkosi', '082 555 0144', '9 Kingfisher St', 'Boksburg']
  ];

  const customers: Customer[] = samplePeople.map(([fullName, phone, address, suburb], idx) => ({
    id: `CUST-${1001 + idx}`,
    fullName,
    phone,
    email: `${fullName.toLowerCase().replace(/[^a-z]+/g, '.')}@example.demo`,
    address,
    suburb,
    createdAt: daysAgoISO(29 - (idx % 28), 9, 15)
  }));

  const statuses: LeadStatus[] = [
    ...Array<LeadStatus>(16).fill('Approved'),
    ...Array<LeadStatus>(7).fill('Submitted'),
    ...Array<LeadStatus>(6).fill('Application Pending'),
    ...Array<LeadStatus>(7).fill('Contacted'),
    ...Array<LeadStatus>(8).fill('New Lead'),
    ...Array<LeadStatus>(6).fill('Rejected')
  ];

  const rejectionReasons = [
    'Fibre infrastructure not yet live in complex',
    'Customer opted for mobile LTE instead',
    'Credit vetting declined by ISP',
    'Landlord declined installation permission',
    'Duplicate application already active at address',
    'Customer cancelled prior to submission'
  ];

  const leads: Lead[] = statuses.map((status, idx) => {
    const customer = customers[idx % customers.length];
    const product = products[idx % products.length];
    const agent = idx === 0 || idx === 1 ? agents[5] : agents[idx % 5];

    const createdDaysAgo = idx >= 36 && idx <= 38 ? 0 : (idx % 27) + 1;
    const statusDaysAgo = Math.max(0, createdDaysAgo - (status === 'New Lead' ? 0 : 1));
    const leadId = `LD-${1001 + idx}`;

    const needsFollowUp =
      status === 'Contacted' || status === 'Application Pending' || idx === 12;

    return {
      id: leadId,
      customerId: customer.id,
      providerId: product.providerId,
      productId: product.id,
      agentId: agent.id,
      status,
      notes:
        status === 'Approved'
          ? 'Customer confirmed installation availability and debit order mandate.'
          : status === 'New Lead'
          ? 'Inbound enquiry requesting fibre coverage check.'
          : 'Followed up with customer regarding fibre package options.',
      followUpDate: needsFollowUp ? daysAgoDate(idx % 2 === 0 ? 0 : -2) : undefined,
      followUpNotes: needsFollowUp
        ? 'Confirm proof of residence and preferred installation slot.'
        : undefined,
      rejectionReason:
        status === 'Rejected'
          ? rejectionReasons[(idx - 44) % rejectionReasons.length]
          : undefined,
      createdAt: daysAgoISO(createdDaysAgo, 9 + (idx % 7), (idx * 7) % 60),
      updatedAt: daysAgoISO(statusDaysAgo, 14, 20),
      statusEnteredAt: daysAgoISO(statusDaysAgo, 14, 20)
    };
  });

  const qaReviews: QAReview[] = [];
  let qaSeq = 1001;

  for (let i = 0; i <= 9; i++) {
    const lead = leads[i];
    if (i <= 7) {
      qaReviews.push({
        id: `QA-${qaSeq++}`,
        leadId: lead.id,
        agentId: lead.agentId,
        reviewerName: 'Naledi Khanye (Sales Manager)',
        reviewedAt: daysAgoISO(Math.max(1, (i % 10) + 2), 11, 0),
        outcome: 'Needs Correction',
        checklist: buildChecklist('consentRecorded'),
        comments: 'Voice consent timestamp unclear; agent requested to re-verify consent.'
      });
    }
    qaReviews.push({
      id: `QA-${qaSeq++}`,
      leadId: lead.id,
      agentId: lead.agentId,
      reviewerName: 'Naledi Khanye (Sales Manager)',
      reviewedAt: daysAgoISO(Math.max(0, i % 8), 15, 30),
      outcome: 'Passed',
      checklist: buildChecklist(),
      comments: 'All verification checks confirmed and consent recording validated.'
    });
  }

  qaReviews.push({
    id: `QA-${qaSeq++}`,
    leadId: leads[10].id,
    agentId: leads[10].agentId,
    reviewerName: 'Naledi Khanye (Sales Manager)',
    reviewedAt: daysAgoISO(5, 10, 15),
    outcome: 'Needs Correction',
    checklist: buildChecklist('addressConfirmed'),
    comments: 'Unit number missing on installation address.'
  });
  qaReviews.push({
    id: `QA-${qaSeq++}`,
    leadId: leads[10].id,
    agentId: leads[10].agentId,
    reviewerName: 'Naledi Khanye (Sales Manager)',
    reviewedAt: daysAgoISO(3, 16, 10),
    outcome: 'Failed',
    checklist: buildChecklist('consentRecorded'),
    comments: 'Customer stated during callback they did not authorise the order.'
  });
  qaReviews.push({
    id: `QA-${qaSeq++}`,
    leadId: leads[11].id,
    agentId: leads[11].agentId,
    reviewerName: 'Naledi Khanye (Sales Manager)',
    reviewedAt: daysAgoISO(2, 13, 45),
    outcome: 'Failed',
    checklist: buildChecklist('pricingCommunicated'),
    comments: 'Monthly subscription pricing disclosed to customer did not match package rate.'
  });

  qaReviews.push({
    id: `QA-${qaSeq++}`,
    leadId: leads[12].id,
    agentId: leads[12].agentId,
    reviewerName: 'Naledi Khanye (Sales Manager)',
    reviewedAt: daysAgoISO(1, 11, 20),
    outcome: 'Needs Correction',
    checklist: buildChecklist('identityVerified'),
    comments: 'Awaiting clearer copy of customer ID verification.'
  });

  for (let i = 16; i <= 21; i++) {
    qaReviews.push({
      id: `QA-${qaSeq++}`,
      leadId: leads[i].id,
      agentId: leads[i].agentId,
      reviewerName: 'Naledi Khanye (Sales Manager)',
      reviewedAt: daysAgoISO(6 + (i - 16), 14, 0),
      outcome: 'Needs Correction',
      checklist: buildChecklist('applicationComplete'),
      comments: 'Returned to agent during pre-submission completeness check.'
    });
  }

  const commissions: Commission[] = leads.slice(0, 10).map((lead, idx) => {
    const product = products.find((p) => p.id === lead.productId)!;
    const paymentStatus =
      idx < 5 ? 'Paid' : idx < 8 ? 'Approved for Payment' : 'Pending Verification';

    return {
      id: `COM-${1001 + idx}`,
      leadId: lead.id,
      customerId: lead.customerId,
      agentId: lead.agentId,
      providerId: lead.providerId,
      productId: lead.productId,
      amount: product.commissionAmount,
      eligibleAt: daysAgoISO(Math.max(0, idx % 8), 15, 35),
      paymentStatus,
      paymentDate: paymentStatus === 'Paid' ? daysAgoDate(Math.max(0, idx)) : undefined
    };
  });

  const activityHistory: ActivityEvent[] = [
    ...leads.slice(0, 16).map((lead, idx) => ({
      id: `ACT-${1001 + idx}`,
      leadId: lead.id,
      type: 'status_change' as const,
      description: 'Application marked Approved',
      fromStatus: 'Submitted' as LeadStatus,
      toStatus: 'Approved' as LeadStatus,
      actor: 'Naledi Khanye (Sales Manager)',
      timestamp: lead.statusEnteredAt
    })),
    ...commissions.slice(0, 5).map((comm, idx) => ({
      id: `ACT-${2001 + idx}`,
      leadId: comm.leadId,
      type: 'commission_paid' as const,
      description: `Commission ${comm.id} (R${comm.amount}) marked as Paid`,
      actor: 'Naledi Khanye (Sales Manager)',
      timestamp: daysAgoISO(Math.max(0, idx), 17, 0)
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    schemaVersion: CRM_SCHEMA_VERSION,
    agents,
    customers,
    leads,
    providers,
    products,
    qaReviews,
    commissions,
    activityHistory,
    lastUpdatedAt: new Date().toISOString()
  };
}

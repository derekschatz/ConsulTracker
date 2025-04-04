import { db } from './db';
import { engagements, timeLogs, invoices, invoiceLineItems } from '@shared/schema';

async function seed() {
  console.log('Seeding database...');

  try {
    // Create sample engagements
    const [acmeEngagement] = await db.insert(engagements).values({
      clientName: "Acme Corp",
      projectName: "Website Redesign",
      startDate: new Date("2023-08-15"),
      endDate: new Date("2023-12-31"),
      hourlyRate: "125",
      description: "Complete website redesign and development",
      status: "active"
    }).returning();

    const [techStartEngagement] = await db.insert(engagements).values({
      clientName: "TechStart",
      projectName: "Strategy Consulting",
      startDate: new Date("2023-07-01"),
      endDate: new Date("2023-10-31"),
      hourlyRate: "150",
      description: "Business strategy and market analysis",
      status: "active"
    }).returning();

    const [globalFirmEngagement] = await db.insert(engagements).values({
      clientName: "GlobalFirm",
      projectName: "UX Research",
      startDate: new Date("2023-10-01"),
      endDate: new Date("2024-01-31"),
      hourlyRate: "145",
      description: "User experience research and design recommendations",
      status: "upcoming"
    }).returning();

    const [innovateEngagement] = await db.insert(engagements).values({
      clientName: "Innovate Inc",
      projectName: "Development Support",
      startDate: new Date("2023-05-15"),
      endDate: new Date("2023-09-30"),
      hourlyRate: "135",
      description: "Technical consulting and development support",
      status: "completed"
    }).returning();

    console.log('Created engagements');

    // Create time logs
    const [timeLog1] = await db.insert(timeLogs).values({
      engagementId: techStartEngagement.id,
      date: new Date("2023-10-05"),
      hours: 4.5,
      description: "Strategy session and document preparation"
    }).returning();

    const [timeLog2] = await db.insert(timeLogs).values({
      engagementId: acmeEngagement.id,
      date: new Date("2023-10-04"),
      hours: 6.0,
      description: "UI design review and revisions"
    }).returning();

    const [timeLog3] = await db.insert(timeLogs).values({
      engagementId: globalFirmEngagement.id,
      date: new Date("2023-10-03"),
      hours: 3.5,
      description: "Kickoff meeting and initial research"
    }).returning();

    const [timeLog4] = await db.insert(timeLogs).values({
      engagementId: techStartEngagement.id,
      date: new Date("2023-10-02"),
      hours: 5.5,
      description: "Market analysis and competitor research"
    }).returning();

    const [timeLog5] = await db.insert(timeLogs).values({
      engagementId: acmeEngagement.id,
      date: new Date("2023-10-01"),
      hours: 7.0,
      description: "Frontend development and testing"
    }).returning();

    console.log('Created time logs');

    // Create invoices
    const [acmeInvoice] = await db.insert(invoices).values({
      invoiceNumber: "INV-024",
      clientName: "Acme Corp",
      engagementId: acmeEngagement.id,
      issueDate: new Date("2023-10-01"),
      dueDate: new Date("2023-10-15"),
      amount: "7850",
      status: "pending",
      notes: "September services",
      periodStart: new Date("2023-09-01"),
      periodEnd: new Date("2023-09-30")
    }).returning();

    const [techstartInvoice] = await db.insert(invoices).values({
      invoiceNumber: "INV-023",
      clientName: "TechStart",
      engagementId: techStartEngagement.id,
      issueDate: new Date("2023-09-30"),
      dueDate: new Date("2023-10-14"),
      amount: "12250",
      status: "pending",
      notes: "September services",
      periodStart: new Date("2023-09-01"),
      periodEnd: new Date("2023-09-30")
    }).returning();

    const [globalfirmInvoice] = await db.insert(invoices).values({
      invoiceNumber: "INV-022",
      clientName: "GlobalFirm",
      engagementId: globalFirmEngagement.id,
      issueDate: new Date("2023-09-15"),
      dueDate: new Date("2023-09-30"),
      amount: "8700",
      status: "overdue",
      notes: "Initial consultation",
      periodStart: new Date("2023-09-01"),
      periodEnd: new Date("2023-09-15")
    }).returning();

    const [acmePaidInvoice] = await db.insert(invoices).values({
      invoiceNumber: "INV-021",
      clientName: "Acme Corp",
      engagementId: acmeEngagement.id,
      issueDate: new Date("2023-09-01"),
      dueDate: new Date("2023-09-15"),
      amount: "6875",
      status: "paid",
      notes: "August services",
      periodStart: new Date("2023-08-01"),
      periodEnd: new Date("2023-08-31")
    }).returning();

    const [techstartPaidInvoice] = await db.insert(invoices).values({
      invoiceNumber: "INV-020",
      clientName: "TechStart",
      engagementId: techStartEngagement.id,
      issueDate: new Date("2023-08-31"),
      dueDate: new Date("2023-09-14"),
      amount: "11625",
      status: "paid",
      notes: "August services",
      periodStart: new Date("2023-08-01"),
      periodEnd: new Date("2023-08-31")
    }).returning();

    console.log('Created invoices');

    // Add invoice line items
    // For acmeInvoice
    await db.insert(invoiceLineItems).values({
      invoiceId: acmeInvoice.id,
      timeLogId: timeLog2.id,
      description: "UI design review",
      hours: 6.0,
      rate: "125",
      amount: "750"
    });

    // For techstartInvoice
    await db.insert(invoiceLineItems).values({
      invoiceId: techstartInvoice.id,
      timeLogId: timeLog1.id,
      description: "Strategy session",
      hours: 4.5,
      rate: "150",
      amount: "675"
    });
    
    await db.insert(invoiceLineItems).values({
      invoiceId: techstartInvoice.id,
      timeLogId: timeLog4.id,
      description: "Market analysis",
      hours: 5.5,
      rate: "150",
      amount: "825"
    });

    console.log('Created invoice line items');
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seed();
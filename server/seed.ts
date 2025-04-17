import { db } from './db';
import { engagements, timeLogs, invoices, invoiceLineItems } from '@shared/schema';
import { addMonths, subMonths, addDays, subDays, startOfYear } from 'date-fns';

// Helper to generate dates across multiple years
function generateDates(baseDate: Date, numYears: number) {
  const dates = [];
  for (let i = 0; i < numYears; i++) {
    dates.push(subMonths(baseDate, i * 12));
  }
  return dates;
}

async function seed() {
  console.log('Seeding database...');

  try {
    // Generate test data for current year and past 2 years
    const today = new Date();
    const testDates = generateDates(today, 3); // Current year, last year, and year before

    for (const baseDate of testDates) {
      const year = baseDate.getFullYear();
      console.log(`Creating test data for year ${year}...`);

      // Create sample engagements for each year
      const [acmeEngagement] = await db.insert(engagements).values({
        clientName: "Acme Corp",
        projectName: `Website Redesign ${year}`,
        startDate: subMonths(baseDate, 2),
        endDate: addMonths(baseDate, 2),
        hourlyRate: "125",
        description: `Complete website redesign and development for ${year}`,
        status: "active"
      }).returning();

      const [techStartEngagement] = await db.insert(engagements).values({
        clientName: "TechStart",
        projectName: `Strategy Consulting ${year}`,
        startDate: subMonths(baseDate, 3),
        endDate: addMonths(baseDate, 1),
        hourlyRate: "150",
        description: `Business strategy and market analysis for ${year}`,
        status: year === today.getFullYear() ? "active" : "completed"
      }).returning();

      const [globalFirmEngagement] = await db.insert(engagements).values({
        clientName: "GlobalFirm",
        projectName: `UX Research ${year}`,
        startDate: addMonths(baseDate, 1),
        endDate: addMonths(baseDate, 4),
        hourlyRate: "145",
        description: `User experience research for ${year}`,
        status: year === today.getFullYear() ? "upcoming" : "completed"
      }).returning();

      // Create time logs for each engagement
      const timeLogDates = [
        subDays(baseDate, 5),
        subDays(baseDate, 4),
        subDays(baseDate, 3),
        subDays(baseDate, 2),
        subDays(baseDate, 1),
      ];

      for (const date of timeLogDates) {
        // Time logs for Acme
        await db.insert(timeLogs).values({
          engagementId: acmeEngagement.id,
          date,
          hours: 4 + Math.random() * 4, // 4-8 hours
          description: `Development work on ${date.toISOString().split('T')[0]}`
        }).returning();

        // Time logs for TechStart
        await db.insert(timeLogs).values({
          engagementId: techStartEngagement.id,
          date,
          hours: 2 + Math.random() * 4, // 2-6 hours
          description: `Strategy session on ${date.toISOString().split('T')[0]}`
        }).returning();

        // Time logs for GlobalFirm
        await db.insert(timeLogs).values({
          engagementId: globalFirmEngagement.id,
          date,
          hours: 3 + Math.random() * 3, // 3-6 hours
          description: `UX research on ${date.toISOString().split('T')[0]}`
        }).returning();
      }

      // Create invoices for each engagement
      const invoiceDate = subDays(baseDate, 15);
      const [acmeInvoice] = await db.insert(invoices).values({
        invoiceNumber: `INV-${year}-001`,
        clientName: "Acme Corp",
        engagementId: acmeEngagement.id,
        issueDate: invoiceDate,
        dueDate: addDays(invoiceDate, 15),
        amount: "7850",
        status: year === today.getFullYear() ? "pending" : "paid",
        notes: `Services for ${year}`,
        periodStart: subMonths(invoiceDate, 1),
        periodEnd: invoiceDate
      }).returning();

      const [techstartInvoice] = await db.insert(invoices).values({
        invoiceNumber: `INV-${year}-002`,
        clientName: "TechStart",
        engagementId: techStartEngagement.id,
        issueDate: subDays(invoiceDate, 15),
        dueDate: addDays(invoiceDate, 0),
        amount: "12250",
        status: year === today.getFullYear() ? "pending" : "paid",
        notes: `Services for ${year}`,
        periodStart: subMonths(invoiceDate, 1),
        periodEnd: invoiceDate
      }).returning();

      const [globalfirmInvoice] = await db.insert(invoices).values({
        invoiceNumber: `INV-${year}-003`,
        clientName: "GlobalFirm",
        engagementId: globalFirmEngagement.id,
        issueDate: subDays(invoiceDate, 30),
        dueDate: subDays(invoiceDate, 15),
        amount: "8700",
        status: year === today.getFullYear() ? "overdue" : "paid",
        notes: `Services for ${year}`,
        periodStart: subMonths(invoiceDate, 1),
        periodEnd: invoiceDate
      }).returning();

      // Add invoice line items
      await db.insert(invoiceLineItems).values({
        invoiceId: acmeInvoice.id,
        timeLogId: 1, // We'll use dummy timeLogIds since we don't track them
        description: `Development services for ${year}`,
        hours: 40,
        rate: 125,
        amount: "5000"
      });

      await db.insert(invoiceLineItems).values({
        invoiceId: techstartInvoice.id,
        timeLogId: 2,
        description: `Strategy consulting for ${year}`,
        hours: 35,
        rate: 150,
        amount: "5250"
      });

      await db.insert(invoiceLineItems).values({
        invoiceId: globalfirmInvoice.id,
        timeLogId: 3,
        description: `UX research for ${year}`,
        hours: 30,
        rate: 145,
        amount: "4350"
      });
    }

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

export default seed;
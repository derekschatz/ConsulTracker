import { db } from './db';
import { engagements, timeLogs, invoices, clients } from '@shared/schema';
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
    // Create sample clients
    const [acmeClient] = await db.insert(clients).values({
      userId: 1,
      name: "Acme Corp",
      billingContactName: "John Smith",
      billingContactEmail: "john.smith@acmecorp.com",
      billingAddress: "123 Main Street",
      billingCity: "New York",
      billingState: "NY",
      billingZip: "10001",
      billingCountry: "USA"
    }).returning();

    const [techStartClient] = await db.insert(clients).values({
      userId: 1,
      name: "TechStart",
      billingContactName: "Jane Doe",
      billingContactEmail: "jane.doe@techstart.io",
      billingAddress: "456 Innovation Blvd",
      billingCity: "San Francisco",
      billingState: "CA",
      billingZip: "94105",
      billingCountry: "USA"
    }).returning();

    const [globalFirmClient] = await db.insert(clients).values({
      userId: 1,
      name: "GlobalFirm",
      billingContactName: "Michael Chen",
      billingContactEmail: "mchen@globalfirm.com",
      billingAddress: "789 International Drive",
      billingCity: "Chicago",
      billingState: "IL",
      billingZip: "60601",
      billingCountry: "USA"
    }).returning();

    // Generate test data for current year and past 2 years
    const today = new Date();
    const testDates = generateDates(today, 3); // Current year, last year, and year before

    for (const baseDate of testDates) {
      const year = baseDate.getFullYear();
      console.log(`Creating test data for year ${year}...`);

      // Create sample engagements for each year
      const [acmeEngagement] = await db.insert(engagements).values({
        userId: 1,
        clientId: acmeClient.id,
        projectName: `Website Redesign ${year}`,
        startDate: subMonths(baseDate, 2),
        endDate: addMonths(baseDate, 2),
        hourlyRate: "125",
        description: `Complete website redesign and development for ${year}`,
        status: "active"
      }).returning();

      const [techStartEngagement] = await db.insert(engagements).values({
        userId: 1,
        clientId: techStartClient.id,
        projectName: `Strategy Consulting ${year}`,
        startDate: subMonths(baseDate, 3),
        endDate: addMonths(baseDate, 1),
        hourlyRate: "150",
        description: `Business strategy and market analysis for ${year}`,
        status: year === today.getFullYear() ? "active" : "completed"
      }).returning();

      const [globalFirmEngagement] = await db.insert(engagements).values({
        userId: 1,
        clientId: globalFirmClient.id,
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
          userId: 1,
          engagementId: acmeEngagement.id,
          date,
          hours: 4 + Math.random() * 4, // 4-8 hours
          description: `Development work on ${date.toISOString().split('T')[0]}`
        }).returning();

        // Time logs for TechStart
        await db.insert(timeLogs).values({
          userId: 1,
          engagementId: techStartEngagement.id,
          date,
          hours: 2 + Math.random() * 4, // 2-6 hours
          description: `Strategy session on ${date.toISOString().split('T')[0]}`
        }).returning();

        // Time logs for GlobalFirm
        await db.insert(timeLogs).values({
          userId: 1,
          engagementId: globalFirmEngagement.id,
          date,
          hours: 3 + Math.random() * 3, // 3-6 hours
          description: `UX research on ${date.toISOString().split('T')[0]}`
        }).returning();
      }

      // Create invoices for each engagement
      const invoiceDate = subDays(baseDate, 15);
      const [acmeInvoice] = await db.insert(invoices).values({
        userId: 1,
        invoiceNumber: `INV-${year}-001`,
        clientName: acmeClient.name,
        engagementId: acmeEngagement.id,
        issueDate: invoiceDate,
        dueDate: addDays(invoiceDate, 15),
        totalAmount: "7850",
        totalHours: 40,
        status: year === today.getFullYear() ? "pending" : "paid",
        notes: `Services for ${year}`,
        periodStart: subMonths(invoiceDate, 1),
        periodEnd: invoiceDate,
        projectName: `Website Redesign ${year}`,
        billingContactName: acmeClient.billingContactName,
        billingContactEmail: acmeClient.billingContactEmail,
        billingAddress: acmeClient.billingAddress,
        billingCity: acmeClient.billingCity,
        billingState: acmeClient.billingState,
        billingZip: acmeClient.billingZip,
        billingCountry: acmeClient.billingCountry
      }).returning();

      const [techstartInvoice] = await db.insert(invoices).values({
        userId: 1,
        invoiceNumber: `INV-${year}-002`,
        clientName: techStartClient.name,
        engagementId: techStartEngagement.id,
        issueDate: subDays(invoiceDate, 15),
        dueDate: addDays(invoiceDate, 0),
        totalAmount: "12250",
        totalHours: 35,
        status: year === today.getFullYear() ? "pending" : "paid",
        notes: `Services for ${year}`,
        periodStart: subMonths(invoiceDate, 1),
        periodEnd: invoiceDate,
        projectName: `Strategy Consulting ${year}`,
        billingContactName: techStartClient.billingContactName,
        billingContactEmail: techStartClient.billingContactEmail,
        billingAddress: techStartClient.billingAddress,
        billingCity: techStartClient.billingCity,
        billingState: techStartClient.billingState,
        billingZip: techStartClient.billingZip,
        billingCountry: techStartClient.billingCountry
      }).returning();

      const [globalfirmInvoice] = await db.insert(invoices).values({
        userId: 1,
        invoiceNumber: `INV-${year}-003`,
        clientName: globalFirmClient.name,
        engagementId: globalFirmEngagement.id,
        issueDate: subDays(invoiceDate, 30),
        dueDate: subDays(invoiceDate, 15),
        totalAmount: "8700",
        totalHours: 30,
        status: year === today.getFullYear() ? "overdue" : "paid",
        notes: `Services for ${year}`,
        periodStart: subMonths(invoiceDate, 1),
        periodEnd: invoiceDate,
        projectName: `UX Research ${year}`,
        billingContactName: globalFirmClient.billingContactName,
        billingContactEmail: globalFirmClient.billingContactEmail,
        billingAddress: globalFirmClient.billingAddress,
        billingCity: globalFirmClient.billingCity,
        billingState: globalFirmClient.billingState,
        billingZip: globalFirmClient.billingZip,
        billingCountry: globalFirmClient.billingCountry
      }).returning();
    }

    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

export default seed;
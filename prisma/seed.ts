/**
 * Seed script: npx prisma db seed  (or npm run db:seed)
 *
 * Creates one organization, roles, users, lead masters, sample
 * institutes/programs and a set of realistic leads with notes and
 * communication logs.
 */
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

const FIRST_NAMES = [
  "Aarav", "Ananya", "Arjun", "Diya", "Ishan", "Kabir", "Meera", "Nikhil",
  "Priya", "Rahul", "Riya", "Rohan", "Sanya", "Vikram", "Zoya",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Mehta", "Iyer", "Khan", "Singh", "Patel",
  "Reddy", "Chopra",
];
const CITIES: [string, string][] = [
  ["Delhi", "Delhi"],
  ["Gurugram", "Haryana"],
  ["Noida", "Uttar Pradesh"],
  ["Mumbai", "Maharashtra"],
  ["Pune", "Maharashtra"],
  ["Jaipur", "Rajasthan"],
  ["Lucknow", "Uttar Pradesh"],
  ["Bengaluru", "Karnataka"],
];

function sample<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

async function main() {
  console.log("Seeding…");

  // -------------------------------------------------------------------------
  // Organization
  // -------------------------------------------------------------------------
  const org = await prisma.organization.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "DF Institute",
      email: "info@dfinstitute.edu",
      mobile: "9811100000",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      status: 1,
    },
  });

  await prisma.generalSetting.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      appName: "DF CRM",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateFormat: "d M Y",
    },
  });

  // -------------------------------------------------------------------------
  // Roles + users
  // -------------------------------------------------------------------------
  const [adminRole, managerRole, counselorRole] = await Promise.all([
    prisma.role.upsert({
      where: { slug: "admin" },
      update: {},
      create: { name: "Admin", slug: "admin", organizationId: org.id },
    }),
    prisma.role.upsert({
      where: { slug: "manager" },
      update: {},
      create: { name: "Manager", slug: "manager", organizationId: org.id },
    }),
    prisma.role.upsert({
      where: { slug: "counselor" },
      update: {},
      create: { name: "Counselor", slug: "counselor", organizationId: org.id },
    }),
  ]);

  const passwordHash = await bcrypt.hash("Admin@123", 10);

  async function ensureUser(
    email: string,
    firstName: string,
    lastName: string,
    roleId: number,
  ) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: passwordHash,
        firstName,
        lastName,
        status: 1,
        organizationId: org.id,
      },
    });
    await prisma.roleUser.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
    return user;
  }

  const admin = await ensureUser("admin@dfcrm.com", "System", "Admin", adminRole.id);
  const manager = await ensureUser("manager@dfcrm.com", "Rohan", "Kapoor", managerRole.id);
  const counselorA = await ensureUser("priya@dfcrm.com", "Priya", "Nair", counselorRole.id);
  const counselorB = await ensureUser("amit@dfcrm.com", "Amit", "Shah", counselorRole.id);
  const counselors = [counselorA, counselorB];

  // -------------------------------------------------------------------------
  // Lead masters
  // -------------------------------------------------------------------------
  const statusDefs = [
    { name: "New", color: "#3b82f6", subs: ["Fresh", "Attempted to contact"] },
    { name: "Contacted", color: "#06b6d4", subs: ["Interested", "Ringing", "Not reachable"] },
    { name: "Follow Up", color: "#f59e0b", subs: ["Call later", "Meeting scheduled"] },
    { name: "Application", color: "#8b5cf6", subs: ["Form started", "Documents pending"] },
    { name: "Converted", color: "#22c55e", subs: ["Admission confirmed", "Fee paid"] },
    { name: "Not Interested", color: "#ef4444", subs: ["Too expensive", "Chose competitor", "Invalid number"] },
  ];

  const statuses: { id: number; name: string; subIds: number[] }[] = [];
  for (const [index, def] of statusDefs.entries()) {
    const status = await prisma.leadStatus.upsert({
      where: { id: index + 1 },
      update: {},
      create: {
        organizationId: org.id,
        name: def.name,
        color: def.color,
        sortOrder: index,
        isActive: true,
      },
    });
    const subIds: number[] = [];
    for (const [subIndex, subName] of def.subs.entries()) {
      const sub = await prisma.leadSubStatus.create({
        data: {
          organizationId: org.id,
          leadStatusId: status.id,
          name: subName,
          color: def.color,
          sortOrder: subIndex,
          isActive: true,
        },
      });
      subIds.push(sub.id);
    }
    statuses.push({ id: status.id, name: def.name, subIds });
  }

  const sourceDefs = [
    { name: "Website", amount: 0 },
    { name: "Facebook Ads", amount: 120 },
    { name: "Google Ads", amount: 180 },
    { name: "Walk-in", amount: 0 },
    { name: "Referral", amount: 0 },
  ];
  const sources: number[] = [];
  for (const def of sourceDefs) {
    const source = await prisma.leadSource.create({
      data: {
        organizationId: org.id,
        name: def.name,
        billingSetupAmount: def.amount,
        status: 1,
      },
    });
    sources.push(source.id);
  }

  const typeDefs = ["Hot", "Warm", "Cold"];
  const types: number[] = [];
  for (const name of typeDefs) {
    const type = await prisma.leadType.create({
      data: { organizationId: org.id, name, status: 1 },
    });
    types.push(type.id);
  }

  // -------------------------------------------------------------------------
  // Institutes & programs
  // -------------------------------------------------------------------------
  const instituteDefs = [
    {
      name: "DF College of Engineering",
      programs: ["B.Tech (CSE)", "B.Tech (ECE)", "M.Tech (CSE)"],
    },
    {
      name: "DF School of Business",
      programs: ["BBA", "MBA", "PGDM"],
    },
    {
      name: "DF Medical Institute",
      programs: ["MBBS", "B.Sc Nursing", "B.Pharm"],
    },
  ];

  const instituteIds: number[] = [];
  const programIds: number[] = [];
  for (const def of instituteDefs) {
    const institute = await prisma.institute.create({
      data: {
        organizationId: org.id,
        name: def.name,
        status: 1,
      },
    });
    instituteIds.push(institute.id);
    for (const programName of def.programs) {
      const program = await prisma.program.create({
        data: { instituteId: institute.id, name: programName, status: 1 },
      });
      programIds.push(program.id);
    }
  }

  // -------------------------------------------------------------------------
  // Leads (+ notes + communications + activity)
  // -------------------------------------------------------------------------
  const existingLeads = await prisma.lead.count({ where: { organizationId: org.id } });
  if (existingLeads === 0) {
    const noteSamples = [
      "Called and discussed the program. Asked for a callback tomorrow.",
      "Shared the fee structure on WhatsApp.",
      "Lead asked about hostel facilities.",
      "Interested in the scholarship criteria. Needs brochure.",
      "Had a short call; will visit the campus this weekend.",
    ];

    for (let i = 0; i < 40; i++) {
      const firstName = sample(FIRST_NAMES);
      const lastName = sample(LAST_NAMES);
      const [city, state] = sample(CITIES);
      const status = sample(statuses);
      const sourceIndex = Math.floor(Math.random() * sources.length);
      const instituteIndex = Math.floor(Math.random() * instituteIds.length);
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      const needsFollowup = Math.random() < 0.35;
      const nextFollowupAt = needsFollowup
        ? new Date(Date.now() + (Math.floor(Math.random() * 5) - 2) * 86400000)
        : null;

      const lead = await prisma.lead.create({
        data: {
          name: `${firstName} ${lastName}`,
          mobile: `98${String(10000000 + Math.floor(Math.random() * 89999999))}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
          city,
          state,
          country: "India",
          organizationId: org.id,
          instituteId: instituteIds[instituteIndex],
          programmeId: sample(programIds),
          leadSourceId: sources[sourceIndex],
          typeId: sample(types),
          leadStatusId: status.id,
          leadSubStatusId: Math.random() < 0.7 ? sample(status.subIds) : null,
          leadAssignTo: sample(counselors).id,
          createdBy: admin.id,
          nextFollowupAt,
          leadRegistrationDate: createdAt,
          createdAt,
        },
      });

      await prisma.leadSource.update({
        where: { id: sources[sourceIndex] },
        data: { leadCount: { increment: 1 } },
      });

      if (Math.random() < 0.6) {
        await prisma.leadNote.create({
          data: {
            leadId: lead.id,
            note: sample(noteSamples),
            createdBy: sample(counselors).id,
            createdAt,
          },
        });
      }

      if (Math.random() < 0.5) {
        await prisma.leadCommunicationLog.create({
          data: {
            leadId: lead.id,
            channel: sample(["call", "email", "whatsapp", "sms"]),
            direction: "outbound",
            purpose: "Follow-up",
            createdAt,
          },
        });
      }

      await prisma.leadActivityLog.create({
        data: {
          leadId: lead.id,
          userId: admin.id,
          action: "lead_created",
          details: { source: "seed" },
          createdAt,
        },
      });
    }
  }

  console.log("✅ Seed complete");
  console.log("   Sign in with:  admin@dfcrm.com  /  Admin@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

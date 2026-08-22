import 'dotenv/config';
import { TaskStatus, TaskPriority, OrgRole } from '../generated/prisma/client.js';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/config/prisma.js';

async function main() {
  console.log('Cleaning up existing data...');
  // Cleanup in order of relations
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create 5 Users
  console.log('Creating users...');
  const users = [];
  for (let i = 0; i < 5; i++) {
    const email = i === 0 ? 'test@example.com' : faker.internet.email();
    const user = await prisma.user.create({
      data: {
        name: i === 0 ? 'Test Admin' : faker.person.fullName(),
        email,
        passwordHash,
      },
    });
    users.push(user);
    console.log(`User created: ${email} / password123`);
  }

  // 2. Create 2 Organizations and add members
  console.log('Creating organizations and members...');
  const orgs = [];
  for (let i = 0; i < 2; i++) {
    const org = await prisma.organization.create({
      data: {
        name: faker.company.name(),
      },
    });
    orgs.push(org);

    // Add first 3 users to org 1, and last 3 to org 2
    const membersToAssign = i === 0 ? users.slice(0, 3) : users.slice(2, 5);

    for (let j = 0; j < membersToAssign.length; j++) {
      await prisma.orgMember.create({
        data: {
          orgId: org.id,
          userId: membersToAssign[j].id,
          role: j === 0 ? OrgRole.org_admin : OrgRole.member,
        },
      });
    }
  }

  // 3. Create Multiple Projects
  console.log('Creating projects...');
  const projects = [];
  for (const org of orgs) {
    for (let i = 0; i < 2; i++) {
      const project = await prisma.project.create({
        data: {
          name: faker.commerce.productName(),
          description: faker.lorem.paragraph(),
          orgId: org.id,
        },
      });
      projects.push(project);
    }
  }

  // 4. Create 10+ Tasks (15 total) distributed across projects
  console.log('Creating tasks...');
  const statuses = [TaskStatus.todo, TaskStatus.in_progress, TaskStatus.review, TaskStatus.done];
  const priorities = [TaskPriority.low, TaskPriority.medium, TaskPriority.high, TaskPriority.urgent];

  const tasks = [];
  for (let i = 0; i < 15; i++) {
    const project = faker.helpers.arrayElement(projects);
    const task = await prisma.task.create({
      data: {
        title: faker.hacker.phrase(),
        description: faker.lorem.sentences(2),
        status: faker.helpers.arrayElement(statuses),
        priority: faker.helpers.arrayElement(priorities),
        dueDate: faker.date.soon({ days: 30 }),
        projectId: project.id,
      },
    });
    tasks.push(task);
  }

  // 5. Create Assignments and Sample Comments
  console.log('Creating assignments and comments...');
  for (const task of tasks) {
    // Find users who are in the task's organization
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { organization: true },
    });
    
    if (!project) continue;

    const orgMembers = await prisma.orgMember.findMany({
      where: { orgId: project.orgId },
    });

    if (orgMembers.length > 0) {
      // Assign 1-2 random users to the task
      const numAssignees = faker.number.int({ min: 1, max: 2 });
      // Limit assignees to actual member count
      const safeNumAssignees = Math.min(numAssignees, orgMembers.length);
      const assignees = faker.helpers.arrayElements(orgMembers, safeNumAssignees);

      for (const assignee of assignees) {
        await prisma.taskAssignment.create({
          data: {
            taskId: task.id,
            userId: assignee.userId,
          },
        });
      }

      // Add 1-3 comments
      const numComments = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < numComments; i++) {
        const randomMember = faker.helpers.arrayElement(orgMembers);
        await prisma.comment.create({
          data: {
            content: faker.lorem.sentence(),
            taskId: task.id,
            authorId: randomMember.userId,
          },
        });
      }
    }
  }

  console.log('Seed data successfully inserted!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

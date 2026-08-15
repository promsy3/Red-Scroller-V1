import { ForbiddenException } from '@nestjs/common';
import { DiaryController } from './diary.controller';

describe('DiaryController', () => {
  let controller: DiaryController;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      matter: { findFirst: jest.fn() },
      matterAccess: { findFirst: jest.fn() },
      diaryEvent: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    };
    audit = { log: jest.fn() };
    controller = new DiaryController(prisma, audit);
  });

  it('hides diary events for restricted matters when the user lacks access', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.diaryEvent.findMany.mockResolvedValue([
      { id: 'event-1', matterId: 'matter-1', title: 'Court hearing', date: new Date(), matter: { id: 'matter-1', firmId: 'firm-1', isRestricted: true, assignedTo: 'other-user' } },
    ]);
    prisma.matterAccess.findFirst.mockResolvedValue(null);

    const result = await controller.getEvents({ user: { sub: 'user-1' } });

    expect(result).toEqual([]);
  });

  it('rejects creating diary events for restricted matters without access', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: true, assignedTo: 'other-user' });
    prisma.matterAccess.findFirst.mockResolvedValue(null);

    await expect(
      controller.createEvent(
        { user: { sub: 'user-1' } },
        { title: 'Court hearing', date: '2026-09-01T10:00:00.000Z', type: 'court_date', matterId: 'matter-1' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects deleting diary events for restricted matters without access', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.diaryEvent.findFirst.mockResolvedValue({ id: 'event-1', matterId: 'matter-1', firmId: 'firm-1' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: true, assignedTo: 'other-user' });
    prisma.matterAccess.findFirst.mockResolvedValue(null);

    await expect(controller.deleteEvent({ user: { sub: 'user-1' } }, 'event-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects editing diary events for restricted matters without access', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.diaryEvent.findFirst.mockResolvedValue({ id: 'event-1', matterId: 'matter-1', firmId: 'firm-1' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: true, assignedTo: 'other-user' });
    prisma.matterAccess.findFirst.mockResolvedValue(null);

    await expect(
      controller.updateEvent({ user: { sub: 'user-1' } }, 'event-1', { title: 'Moved court hearing' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.diaryEvent.update).not.toHaveBeenCalled();
  });

  it('updates an accessible diary event and records an audit entry', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.diaryEvent.findFirst.mockResolvedValue({ id: 'event-1', matterId: null, firmId: 'firm-1' });
    prisma.diaryEvent.update.mockResolvedValue({ id: 'event-1', title: 'Moved court hearing' });

    const result = await controller.updateEvent(
      { user: { sub: 'user-1' } },
      'event-1',
      { title: 'Moved court hearing', date: '2026-09-01T10:00:00.000Z' },
    );

    expect(result).toEqual({ id: 'event-1', title: 'Moved court hearing' });
    expect(prisma.diaryEvent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'event-1' },
      data: expect.objectContaining({ title: 'Moved court hearing', date: new Date('2026-09-01T10:00:00.000Z') }),
    }));
    expect(audit.log).toHaveBeenCalledWith('firm-1', 'user-1', 'UPDATE', 'DIARY_EVENT', 'event-1', expect.any(Object));
  });
});

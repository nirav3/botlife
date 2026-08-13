import request from 'supertest';

jest.mock('../../src/lib/prisma');
import { prisma } from '../../src/lib/prisma';
import app from '../../src/app';
import { authHeader, USER_A_ID } from '../utils/testHelpers';

const sampleCatalogRow = {
  id: 'catalog-1',
  name: 'Dumbbell Curl',
  aliases: ['DB Curl', 'Bicep Curl'],
  muscleGroup: 'Biceps',
  bodyRegion: 'UPPER',
  movementPattern: 'ISOLATION',
  equipment: 'DUMBBELL',
  loadConvention: 'PER_SIDE',
  progressionType: 'REPS',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('GET /api/exercises/catalog', () => {
  it('positive: returns the full catalog', async () => {
    (prisma.exerciseCatalog.findMany as jest.Mock).mockResolvedValue([sampleCatalogRow]);

    const res = await request(app).get('/api/exercises/catalog').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Dumbbell Curl');
    expect(res.body.data[0].loadConvention).toBe('PER_SIDE');
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/exercises/catalog');
    expect(res.status).toBe(401);
  });

  it('negative: returns an empty array (not an error) when the catalog is empty', async () => {
    (prisma.exerciseCatalog.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/exercises/catalog').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('negative: a service-layer failure surfaces as a generic 500', async () => {
    (prisma.exerciseCatalog.findMany as jest.Mock).mockRejectedValue(new Error('db exploded'));

    const res = await request(app).get('/api/exercises/catalog').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

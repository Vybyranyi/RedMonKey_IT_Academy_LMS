import axiosInstance from './axios';
import { cachedRequest, invalidateCache } from './cache';
import type { IPopulatedGroup, IGroupDto } from '@redmonkey/shared';

const GROUPS_CACHE_KEY = 'groups';
// Групи міняються рідко, а тягнуть їх майже всі сторінки й форми. Зміни з
// цього клієнта скидають кеш одразу; чужі — стануть видимі щонайпізніше за хвилину
const GROUPS_CACHE_TTL_MS = 60_000;

/** Список груп — кешований (див. api/cache.ts): масив спільний, змінювати його на місці не можна. */
export const apiGetGroups = (): Promise<IPopulatedGroup[]> =>
  cachedRequest(GROUPS_CACHE_KEY, GROUPS_CACHE_TTL_MS, async () => {
    const response = await axiosInstance.get('/groups');
    return response.data;
  });

/** Склад груп (студенти, викладачі) змінюється й через /users — тому скидання винесене окремо. */
export const invalidateGroupsCache = () => invalidateCache(GROUPS_CACHE_KEY);

export const apiGetGroupById = async (id: string): Promise<IPopulatedGroup> => {
  const response = await axiosInstance.get(`/groups/${id}`);
  return response.data;
};

export const apiCreateGroup = async (data: IGroupDto): Promise<IPopulatedGroup> => {
  const response = await axiosInstance.post('/groups', data);
  invalidateGroupsCache();
  return response.data;
};

export const apiUpdateGroup = async (id: string, data: IGroupDto): Promise<IPopulatedGroup> => {
  const response = await axiosInstance.patch(`/groups/${id}`, data);
  invalidateGroupsCache();
  return response.data;
};

export const apiDeleteGroup = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/groups/${id}`);
  invalidateGroupsCache();
};

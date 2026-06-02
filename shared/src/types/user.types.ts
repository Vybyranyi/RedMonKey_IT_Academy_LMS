import { UserRole } from '../enums';
export interface IUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    avatar: string | null;
    phone: string | null;
    redCoins: number;
    group: string | null; // ID групи
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
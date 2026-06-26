import { UserRole } from '../enums';

export interface IUserBase {
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    avatar?: string | null;
    phone?: string | null;
    redCoins: number;
    isActive: boolean;
}

export interface IUser extends IUserBase {
    _id: string;
    group?: string | null; // ID групи
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface IUserDto {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: UserRole;
    phone?: string | null;
    group?: string | null;
}
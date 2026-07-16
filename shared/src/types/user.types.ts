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
    id: string;
    academyId?: string;
    group?: string | { id: string; name: string } | null; // ID групи або populated { id, name }
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
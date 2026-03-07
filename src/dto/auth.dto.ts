/**
 * DTOs for auth endpoints (request/response).
 */

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserResponseDto;
}

export interface RefreshRequestDto {
  refreshToken: string;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId?: number;
  organizationId?: string;
  roomNumber?: string;
  children?: string[];
}

export interface OrgSignupRequestDto {
  orgName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface OrganizationResponseDto {
  id: string;
  name: string;
  slug: string;
}

export interface OrgSignupResponseDto extends LoginResponseDto {
  organization: OrganizationResponseDto;
}

export interface AddHostelRequestDto {
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
}

export interface HostelResponseDto {
  id: number;
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  isActive: boolean;
}

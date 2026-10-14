import { IsString, IsIn, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateMatterDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsBoolean()
  @IsOptional()
  isRestricted?: boolean;

  @IsIn(['active', 'pending', 'closed'])
  @IsOptional()
  type?: 'active' | 'pending' | 'closed';
}

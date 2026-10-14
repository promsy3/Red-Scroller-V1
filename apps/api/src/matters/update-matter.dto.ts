import { IsString, IsIn, IsOptional, IsBoolean } from 'class-validator';

export class UpdateMatterDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['active', 'pending', 'closed'])
  @IsOptional()
  status?: 'active' | 'pending' | 'closed';

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsBoolean()
  @IsOptional()
  isRestricted?: boolean;
}

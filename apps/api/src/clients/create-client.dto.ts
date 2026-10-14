import { IsString, IsIn, IsNotEmpty } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['corporate', 'individual'])
  @IsNotEmpty()
  type: 'corporate' | 'individual';
}

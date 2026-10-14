import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFirmDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

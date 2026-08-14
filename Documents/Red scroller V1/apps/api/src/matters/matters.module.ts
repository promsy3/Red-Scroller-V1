import { Module } from '@nestjs/common';
import { MattersController } from './matters.controller';

@Module({ controllers: [MattersController] })
export class MattersModule {}

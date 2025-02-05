import { Module } from '@nestjs/common';
import { MedicationService } from './medication.service';
import { MedicationController } from './medication.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medication } from './entities/medication.entity';
import { PaginationService } from '../common/pagination/pagination.service';
import { PaginationModule } from '../common/pagination/pagination.module';

@Module({
  imports: [TypeOrmModule.forFeature([Medication]), PaginationModule],
  controllers: [MedicationController],
  providers: [MedicationService],
})
export class MedicationModule {}

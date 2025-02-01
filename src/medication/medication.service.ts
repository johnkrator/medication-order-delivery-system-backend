import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Medication } from './entities/medication.entity';
import { Repository } from 'typeorm';
import { PaginationService } from '../services/pagination/pagination.service';
import {
  PaginatedResponse,
  PaginationOptions,
} from '../services/pagination/pagination-options';

@Injectable()
export class MedicationService {
  constructor(
    @InjectRepository(Medication)
    private readonly medicationRepository: Repository<Medication>,
    private readonly paginationService: PaginationService,
  ) {}

  async create(createMedicationDto: CreateMedicationDto) {
    const medication = this.medicationRepository.create({
      ...createMedicationDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return await this.medicationRepository.save(medication);
  }

  async findAll(
    options: PaginationOptions,
  ): Promise<PaginatedResponse<Medication>> {
    return this.paginationService.paginate<Medication>(
      this.medicationRepository,
      options,
    );
  }

  async findOne(id: string): Promise<Medication> {
    const medication = await this.medicationRepository.findOne({
      where: { id },
    });

    if (!medication) {
      throw new NotFoundException('Medication not found');
    }

    return medication;
  }

  async update(
    id: string,
    updateMedicationDto: UpdateMedicationDto,
  ): Promise<Medication> {
    const medication = await this.findOne(id);
    this.medicationRepository.merge(medication, updateMedicationDto);
    return await this.medicationRepository.save(medication);
  }

  async remove(id: string) {
    await this.medicationRepository.delete(id);
  }
}

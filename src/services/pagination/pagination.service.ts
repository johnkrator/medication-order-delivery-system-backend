import { Repository } from 'typeorm';
import { PaginatedResponse, PaginationOptions } from './pagination-options';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaginationService {
  async paginate<T>(
    repository: Repository<T>,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<T>> {
    const { page, limit } = options;

    // Calculate offset and fetch data
    const offset = (page - 1) * limit;
    const [data, total] = await repository.findAndCount({
      skip: offset,
      take: limit,
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    // Return paginated response
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}

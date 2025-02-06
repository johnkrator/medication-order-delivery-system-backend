import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    const result = await this.orderService.create(createOrderDto);
    return {
      status: 'pending',
      totalAmount: result.order.totalAmount,
      deliveryAddress: result.order.deliveryAddress,
      specialInstructions: result.order.specialInstructions,
      createdAt: result.order.createdAt,
      updatedAt: result.order.updatedAt,
      user: result.order.user,
      medications: result.order.medications,
      paymentReference: result.paymentReference,
      id: result.order.id,
      paymentStatus: result.order.paymentStatus,
      redirectUrl: result.redirectUrl,
      callbackUrl: result.callbackUrl,
    };
  }

  // @Post()
  // create(@Body() createOrderDto: CreateOrderDto) {
  //   return this.orderService.create(createOrderDto);
  // }

  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}

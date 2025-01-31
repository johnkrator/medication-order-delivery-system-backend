import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DeliveryPartnerService } from './delivery-partner.service';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';

@Controller('delivery-partner')
export class DeliveryPartnerController {
  constructor(private readonly deliveryPartnerService: DeliveryPartnerService) {}

  @Post()
  create(@Body() createDeliveryPartnerDto: CreateDeliveryPartnerDto) {
    return this.deliveryPartnerService.create(createDeliveryPartnerDto);
  }

  @Get()
  findAll() {
    return this.deliveryPartnerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryPartnerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeliveryPartnerDto: UpdateDeliveryPartnerDto) {
    return this.deliveryPartnerService.update(+id, updateDeliveryPartnerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliveryPartnerService.remove(+id);
  }
}

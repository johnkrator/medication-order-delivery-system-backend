import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Medication } from '../../medication/entities/medication.entity';
import { DeliveryPartner } from '../../delivery-partner/entities/delivery-partner.entity';
import { OrderStatus } from '../../enums/order-status';
import { PaymentStatus } from '../../enums/payment-status';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @ManyToMany(() => Medication)
  @JoinTable()
  medications: Medication[];

  @ManyToOne(() => DeliveryPartner, (partner) => partner.orders, {
    nullable: true,
  })
  deliveryPartner: DeliveryPartner;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ nullable: true })
  deliveryAddress: string;

  @Column({ nullable: true })
  specialInstructions: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

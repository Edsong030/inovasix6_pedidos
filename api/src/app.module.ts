import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { TablesModule } from './tables/tables.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ReportsModule } from './reports/reports.module';
import { AnotaAiModule } from './integrations/anota-ai/anota-ai.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    TablesModule,
    KitchenModule,
    ReportsModule,
    AnotaAiModule,
    UploadsModule,
  ],
})
export class AppModule {}

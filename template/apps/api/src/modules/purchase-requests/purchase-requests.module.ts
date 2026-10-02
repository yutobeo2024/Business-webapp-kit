import { Module } from "@nestjs/common";
import { PurchaseRequestsController } from "./purchase-requests.controller.js";
import { PurchaseRequestsService } from "./purchase-requests.service.js";

@Module({
  controllers: [PurchaseRequestsController],
  providers: [PurchaseRequestsService],
})
export class PurchaseRequestsModule {}

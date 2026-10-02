import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { z } from "zod";
import {
  type CreatePurchaseRequestInput,
  createPurchaseRequestSchema,
  type CurrentUser as CurrentUserType,
  type ListPurchaseRequestsQuery,
  listPurchaseRequestsQuerySchema,
  type Paginated,
  type PurchaseRequestDto,
  type TransitionPurchaseRequestInput,
  transitionPurchaseRequestSchema,
} from "@app/shared";
import { CurrentUser } from "../../auth/decorators.js";
import { type AuthedRequest, clientIp } from "../../common/request-context.js";
import { ZodPipe } from "../../common/zod.pipe.js";
import { PurchaseRequestsService } from "./purchase-requests.service.js";

const idSchema = z.uuid();
const updateSchema = createPurchaseRequestSchema.extend({ version: z.number().int().min(1) });

@Controller("purchase-requests")
export class PurchaseRequestsController {
  constructor(private readonly service: PurchaseRequestsService) {}

  @Get()
  list(
    @CurrentUser() user: CurrentUserType,
    @Query(new ZodPipe(listPurchaseRequestsQuerySchema)) query: ListPurchaseRequestsQuery,
  ): Promise<Paginated<PurchaseRequestDto>> {
    return this.service.list(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodPipe(createPurchaseRequestSchema)) body: CreatePurchaseRequestInput,
    @Req() req: AuthedRequest,
  ): Promise<PurchaseRequestDto> {
    return this.service.create(user, body, clientIp(req));
  }

  @Get(":id")
  get(
    @CurrentUser() user: CurrentUserType,
    @Param("id", new ZodPipe(idSchema)) id: string,
  ): Promise<PurchaseRequestDto> {
    return this.service.get(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: CurrentUserType,
    @Param("id", new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(updateSchema)) body: z.infer<typeof updateSchema>,
    @Req() req: AuthedRequest,
  ): Promise<PurchaseRequestDto> {
    return this.service.update(user, id, body, clientIp(req));
  }

  @Post(":id/transitions")
  transition(
    @CurrentUser() user: CurrentUserType,
    @Param("id", new ZodPipe(idSchema)) id: string,
    @Body(new ZodPipe(transitionPurchaseRequestSchema)) body: TransitionPurchaseRequestInput,
    @Req() req: AuthedRequest,
  ): Promise<PurchaseRequestDto> {
    return this.service.transition(user, id, body, clientIp(req));
  }
}

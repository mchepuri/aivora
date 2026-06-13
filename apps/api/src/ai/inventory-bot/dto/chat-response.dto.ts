import { UomClass } from '@prisma/client';

export interface PrefillUomAction {
  type: 'PREFILL_UOM_DIALOG';
  data: {
    code?: string;
    name?: string;
    uomClass?: UomClass;
  };
}

export interface CreateUomAction {
  type: 'CREATE_UOM';
  data: {
    code: string;
    name: string;
    uomClass: UomClass;
  };
}

export interface ChatResponseDto {
  reply: string;
  action?: PrefillUomAction | CreateUomAction;
}

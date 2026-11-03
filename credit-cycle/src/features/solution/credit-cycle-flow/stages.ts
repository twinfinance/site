import {
  ArrowRightLeft,
  CalendarCheck,
  ChartLine,
  Handshake,
  ListFilter,
  MessageCircle,
  ScanFace,
  Signature,
  type LucideIcon,
} from 'lucide-react';

import type { FlowCopy, StageId } from './timeline';

export interface StageLook {
  label: string;
  icon: LucideIcon;
}

export const DEFAULT_STAGES: Record<StageId, StageLook> = {
  communication: { label: 'Comunicação', icon: MessageCircle },
  prequalification: { label: 'Pré-qualificação', icon: ListFilter },
  underwriting: { label: 'Underwriting', icon: ChartLine },
  kyc: { label: 'KYC', icon: ScanFace },
  formalization: { label: 'Formalização', icon: Signature },
  assignment: { label: 'Cessão', icon: ArrowRightLeft },
  collection: { label: 'Cobrança', icon: CalendarCheck },
  recovery: { label: 'Recuperação', icon: Handshake },
};

export const DEFAULT_ORIGINATION_STATUSES: FlowCopy['originationStatuses'] = {
  communication: ['Disparando oferta', 'Oferta enviada'],
  prequalification: ['Analisando', 'Pré-aprovado'],
  underwriting: ['Calculando risco', 'Score 742'],
  kyc: ['Validando', 'Biometria ok'],
  formalization: ['Enviando CCB', 'CCB assinada'],
  assignment: ['Cedendo', 'Cedida ao FIDC'],
};

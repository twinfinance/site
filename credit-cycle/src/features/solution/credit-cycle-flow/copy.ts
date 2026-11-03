import type { FlowCopy } from './timeline';

interface CopyOptions {
  amount: number;
  installments: number;
  locale: string;
  originationStatuses: FlowCopy['originationStatuses'];
}

export const flowCopy = ({
  amount,
  installments,
  locale,
  originationStatuses,
}: CopyOptions): FlowCopy => {
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount);
  return {
    waiting: 'Aguardando',
    amount: `${money} · ${installments}x`,
    originationStatuses,
    paid: (paid, total) => `Parcela ${paid}/${total} paga`,
    paidChip: (paid, total) => `${paid}/${total} pagas`,
    late: (installment) => `Parcela ${installment} em atraso`,
    lateChip: (installment, total) => `${installment}/${total} em atraso`,
    renegotiating: 'Renegociando',
    agreement: 'Acordo fechado',
    settled: (total) => `${total}/${total} quitada`,
    settledChip: 'Quitada',
  };
};

export const flowDescription = (copy: FlowCopy, lateInstallment: number) => {
  const statuses = copy.originationStatuses;
  return [
    `Uma operação de ${copy.amount} percorre o ciclo do crédito.`,
    `Originação: ${statuses.communication[1]}, ${statuses.prequalification[1]}, ${statuses.underwriting[1]}, ${statuses.kyc[1]}, ${statuses.formalization[1]} e ${statuses.assignment[1]}.`,
    `Manutenção: as parcelas são cobradas e a parcela ${lateInstallment} atrasa.`,
    `Recuperação: a dívida é renegociada, o acordo é fechado e as parcelas seguem até a quitação.`,
  ].join(' ');
};

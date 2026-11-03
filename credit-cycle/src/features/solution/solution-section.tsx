import { CreditCycleFlow } from './credit-cycle-flow/credit-cycle-flow';

export const SolutionSection = () => {
  return (
    <section
      id="solucao"
      className="mx-auto grid max-w-[1180px] gap-10 px-4 py-16 sm:px-6 sm:py-24"
    >
      <header className="grid max-w-[62ch] gap-3">
        <h2 className="m-0 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Uma plataforma que conecta o ciclo do crédito
        </h2>
        <p className="m-0 text-base leading-relaxed text-text-secondary">
          Da primeira oferta ao acordo de uma parcela atrasada, a Twin Fin
          orquestra originação, manutenção e recuperação numa esteira só.
        </p>
      </header>
      <div className="rounded-2xl border border-border bg-surface px-4 pt-7 pb-6 sm:px-6">
        <CreditCycleFlow />
      </div>
    </section>
  );
};

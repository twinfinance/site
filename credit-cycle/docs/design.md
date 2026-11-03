# Fluxo animado do ciclo de crédito (seção "A solução")

Data: 2026-10-20. Pedido por Andre.

## Objetivo

Na seção "A solução" do site institucional, uma ilustração animada mostra que a Twin Fin orquestra o ciclo inteiro do crédito, em três fases:

- **Originação:** comunicação, pré-qualificação, underwriting, KYC, formalização e cessão.
- **Manutenção:** cobrança.
- **Recuperação:** renegociação de uma parcela em atraso.

Quem lê é um credor (fintech de crédito, SCD ou SEP, gestora de FIDC, empresa que quer oferecer crédito). Ele precisa sair com uma ideia: "a Twin cobre da oferta ao acordo, inclusive o que dá errado".

## Decisões já tomadas

- O site sai do Framer e vai para código, montado sobre Arc e ReUI. O Framer fica só como referência visual.
- O Payment flow da Arc (uiarc.dev/components/payment-flow) é a referência de linguagem visual. Como não temos a licença Arc Pro, o código dele não é usado nem reproduzido: o componente é escrito do zero.
- Todas as etapas aparecem iguais, sem selo de "em breve".
- Cada etapa tem um ícone do Lucide.

## Fora do escopo

- Criar o app do site (framework, roteamento, deploy, instalação de Arc e ReUI). É um projeto à parte e pré-requisito deste: o componente entra no app do site quando ele existir.
- Textos da seção em volta do diagrama (título, parágrafo, CTA).

## Layout

### Desktop (cada cartão com 118px ou mais)

- Sete etapas em uma linha: comunicação, pré-qualificação, underwriting, KYC, formalização, cessão e cobrança.
- Cada etapa é um cartão com ícone à esquerda, nome na primeira linha e status na segunda.
- Acima da linha, duas faixas de fase: "Originação" sobre as seis primeiras e "Manutenção" sobre a cobrança.
- A recuperação fica logo abaixo da cobrança, ligada a ela por um caminho de ida (atraso) e um de volta (acordo). Sob ela, a faixa "Recuperação".
- Abaixo do diagrama, uma linha de fases com três trechos (originação, manutenção e recuperação) que se preenchem conforme a história avança.

### Celular e telas estreitas

- As sete etapas empilham em coluna, com o caminho descendo pela esquerda.
- A recuperação fica logo abaixo da cobrança, com o caminho de ida e volta descendo ao lado.
- A linha de fases vira uma coluna só.

O diagrama é desenhado em SVG com o tamanho real medido do contêiner (`ResizeObserver`), para o texto e as linhas finas ficarem nítidos em qualquer largura.

## Etapas

| Id                 | Nome             | Ícone (Lucide)   | Status, em ordem                                      |
| ------------------ | ---------------- | ---------------- | ----------------------------------------------------- |
| `communication`    | Comunicação      | `MessageCircle`  | Oferta enviada                                        |
| `prequalification` | Pré-qualificação | `ListFilter`     | Analisando, Pré-aprovado                              |
| `underwriting`     | Underwriting     | `ChartLine`      | Calculando, Score 742                                 |
| `kyc`              | KYC              | `ScanFace`       | Validando, Biometria ok                               |
| `formalization`    | Formalização     | `Signature`      | Enviando CCB, CCB assinada                            |
| `assignment`       | Cessão           | `ArrowRightLeft` | Cedendo, Cedida ao FIDC                               |
| `collection`       | Cobrança         | `CalendarCheck`  | Parcela n/12 paga, Parcela 4 em atraso, 12/12 quitada |
| `recovery`         | Recuperação      | `Handshake`      | Renegociando, Acordo fechado                          |

Fora do seu momento na história, cada etapa mostra uma linha de repouso (o primeiro status, ou "Aguardando").

## A história

Um ciclo de cerca de 21 segundos com `speed = 1`, repetido sem emenda:

1. **Originação (cerca de 11 s).** Um chip "R$ 25.000 · 12x" nasce na comunicação. Em cada uma das seis etapas, ele entra, fica cerca de 1,2 s enquanto o status troca do primeiro para o segundo, e segue (cerca de 0,6 s de trajeto). O caminho percorrido fica pintado na cor de destaque.
2. **Manutenção (cerca de 2,4 s).** Na cobrança, o chip passa a mostrar a contagem de parcelas: 1/12, 2/12 e 3/12 pagas.
3. **Recuperação (cerca de 3,2 s).** A parcela 4 atrasa: o status da cobrança fica "Parcela 4 em atraso" na cor de alerta, o chip desce para a recuperação ("Renegociando", depois "Acordo fechado") e volta pelo caminho de volta, pintado na cor de sucesso.
4. **Quitação (cerca de 2,3 s).** A contagem acelera de 4/12 até "12/12 quitada".
5. **Encerramento (cerca de 2 s).** Todo o caminho fica na cor de sucesso por um instante, depois tudo volta ao repouso com um fade e o ciclo recomeça.

As durações exatas ficam numa tabela de segmentos do código e podem ser ajustadas.

## Componente

`CreditCycleFlow`, um componente React (React 19, Tailwind) do app `apps/site`. A animação roda num loop próprio de `requestAnimationFrame`, sem biblioteca de animação.

### Props

| Prop              | Tipo                                                     | Padrão                      | Para quê                                                             |
| ----------------- | -------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------- |
| `stages`          | `Partial<Record<StageId, { label?, statuses?, icon? }>>` | tabela acima                | Troca nome, status ou ícone de uma etapa.                            |
| `amount`          | `number`                                                 | `25000`                     | Valor no chip.                                                       |
| `installments`    | `number`                                                 | `12`                        | Número de parcelas.                                                  |
| `lateInstallment` | `number`                                                 | `4`                         | Parcela que atrasa e vai para a recuperação.                         |
| `locale`          | `string`                                                 | `"pt-BR"`                   | Formatação de moeda, fixa para o servidor e o navegador concordarem. |
| `speed`           | `number`                                                 | `1`                         | Multiplica o ritmo. `0` congela.                                     |
| `paused`          | `boolean`                                                | `false`                     | Para a animação suavemente onde está.                                |
| `label`           | `string`                                                 | montado a partir das etapas | Descrição acessível do diagrama.                                     |
| `caption`         | `ReactNode`                                              | nenhum                      | Legenda visível, como `figcaption`.                                  |
| `className`       | `string`                                                 | nenhum                      | Classe extra na raiz.                                                |

### Unidades

- **`timeline.ts`** (sem I/O): a tabela de segmentos e a função `frameAt(t, options)`, que devolve tudo o que a tela precisa naquele instante: a etapa ativa, o trecho do caminho e o progresso do chip nele, o status de cada etapa, o texto do chip, a cor de cada trecho do caminho e o preenchimento de cada fase. O tempo entra em milissegundos e é reduzido ao ciclo (`t % duração`), então o loop é contínuo.
- **`layout.ts`** (sem I/O): a partir da largura e da altura, calcula a posição de cada cartão e os caminhos entre eles, nos modos horizontal e vertical.
- **`credit-cycle-flow.tsx`**: mede o contêiner, desenha o SVG e os cartões, e roda um único loop de `requestAnimationFrame` que chama `frameAt` e escreve no DOM só o que mudou (transform, opacidade, `stroke-dashoffset`, textos). O React não renderiza a cada quadro.

### Movimento

- O chip desliza entre etapas com easing e passa por baixo do cartão enquanto a etapa "trabalha", como no Payment flow.
- O ícone da etapa ativa acende na cor de destaque. O status troca com um crossfade curto.
- Cores pelos tokens semânticos do tema: `--accent` para o caminho ativo e o chip, `--warning` para o atraso, `--success` para a volta da recuperação e o encerramento. Nada de cor fixa no código. Funciona no tema claro e no escuro.
- Passar o mouse desacelera a história (cerca de 0,6x). Mudanças de velocidade e pausa seguem uma mola, sem trancos.
- O loop para quando o diagrama sai da tela (`IntersectionObserver`) e quando a aba fica oculta (`visibilitychange`).

### Acessibilidade

- O diagrama é um único elemento com `role="img"` e um `aria-label` que conta a história: a oferta, cada etapa, o atraso, o acordo e a quitação.
- Os cartões não são controles e não entram na ordem de tabulação.
- O estado nunca depende só da cor: cada etapa sempre tem o status escrito.
- Com `prefers-reduced-motion: reduce`, mostra um quadro parado com todas as etapas concluídas, o acordo fechado e "12/12 quitada".

## Testes

Seguindo o CLAUDE.md do repositório, o que não faz I/O tem teste unitário com Vitest, na pasta `test/` do app, espelhando `src/`:

- `timeline.test.ts`: a etapa ativa e os status em instantes de cada fase; a contagem de parcelas; o desvio para a recuperação na parcela configurada; a cor de cada trecho do caminho; o loop (`frameAt(t)` igual a `frameAt(t + duração)`); `speed` e as props de etapas e valores refletidas no quadro; o quadro de movimento reduzido.
- `layout.test.ts`: posições sem sobreposição nos dois modos; troca para o modo vertical abaixo de 700px; caminhos ligando os cartões certos.

O componente em si é visual e é conferido no navegador, nos temas claro e escuro, nas larguras de celular e desktop e com movimento reduzido.

## Onde mora

O site é o app `apps/site`, com Vite, React 19 e Tailwind como os outros apps do monorepo. Por enquanto ele tem só a seção "A solução". O HTML pré-renderizado para SEO fica para quando o site ganhar as outras seções.

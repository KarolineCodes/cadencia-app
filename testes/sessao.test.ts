import { describe, expect, it } from 'vitest';
import { agendamentoNovo } from '../src/dominio/agendamento';
import { diaDeEstudo } from '../src/dominio/dia-de-estudo';
import {
  acabou,
  avaliar,
  cartaAtual,
  iniciarSessao,
  paraEnvio,
  progresso,
  restantes,
  revelar,
  xpDaSessao,
  type Carta,
} from '../src/estado/sessao';

const HOJE = diaDeEstudo('2026-01-15');

function carta(id: string, vencida = true): Carta {
  return {
    id,
    frente: `palavra ${id}`,
    verso: `tradução ${id}`,
    dica: null,
    agendamento: {
      ...agendamentoNovo(HOJE),
      venceEm: vencida ? HOJE : diaDeEstudo('2026-03-01'),
    },
  };
}

function sessaoCom(quantidade: number) {
  const cartas = Array.from({ length: quantidade }, (_, i) => carta(`c${i}`));
  return iniciarSessao(cartas, HOJE);
}

describe('percurso da sessão', () => {
  it('começa na primeira carta, com o verso escondido', () => {
    const estado = sessaoCom(3);

    expect(cartaAtual(estado)?.id).toBe('c0');
    expect(estado.revelada).toBe(false);
  });

  it('revelar não avança a carta', () => {
    // Ver o verso e avaliar são dois passos: quem revela precisa poder pensar
    // antes de responder.
    const estado = revelar(sessaoCom(3));

    expect(estado.revelada).toBe(true);
    expect(cartaAtual(estado)?.id).toBe('c0');
  });

  it('avaliar avança e esconde o verso de novo', () => {
    const estado = avaliar(revelar(sessaoCom(3)), 'bom');

    expect(cartaAtual(estado)?.id).toBe('c1');
    expect(estado.revelada).toBe(false);
  });

  it('a sessão termina depois da última', () => {
    let estado = sessaoCom(2);

    estado = avaliar(estado, 'bom');
    estado = avaliar(estado, 'bom');

    expect(acabou(estado)).toBe(true);
    expect(cartaAtual(estado)).toBeNull();
  });

  it('avaliar depois do fim não faz nada', () => {
    let estado = sessaoCom(1);
    estado = avaliar(estado, 'bom');

    expect(avaliar(estado, 'bom')).toBe(estado);
  });
});

describe('a carta errada volta para a fila', () => {
  it('errar recoloca a carta no fim', () => {
    /**
     * Sair da tela ao errar faria o aluno ver a palavra difícil uma vez só, e é
     * justamente a que ele precisa ver de novo.
     */
    let estado = sessaoCom(3);
    estado = avaliar(estado, 'errei');

    expect(restantes(estado)).toBe(3);
    expect(estado.cartas.at(-1)?.id).toBe('c0');
  });

  it('a carta que voltou não volta de novo', () => {
    // Repetir sem limite transformaria uma carta travada num laço que não
    // termina, e a sessão nunca acabaria.
    let estado = iniciarSessao([carta('unica')], HOJE);

    estado = avaliar(estado, 'errei');
    expect(restantes(estado)).toBe(1);

    estado = avaliar(estado, 'errei');
    expect(acabou(estado)).toBe(true);
  });

  it('acertar não recoloca', () => {
    let estado = sessaoCom(2);
    estado = avaliar(estado, 'bom');

    expect(estado.cartas).toHaveLength(2);
  });
});

describe('progresso', () => {
  it('conta cartas distintas, e não avaliações', () => {
    /**
     * Com a repetição da carta errada, contar avaliações faria a barra andar
     * para trás quando alguém erra, o que parece defeito.
     */
    let estado = sessaoCom(3);

    estado = avaliar(estado, 'errei');
    expect(progresso(estado)).toEqual({ feitas: 1, total: 3 });

    estado = avaliar(estado, 'bom');
    expect(progresso(estado)).toEqual({ feitas: 2, total: 3 });
  });

  it('revisar a carta repetida não passa do total', () => {
    let estado = iniciarSessao([carta('a'), carta('b')], HOJE);

    estado = avaliar(estado, 'errei');
    estado = avaliar(estado, 'bom');
    estado = avaliar(estado, 'bom');

    expect(progresso(estado)).toEqual({ feitas: 2, total: 2 });
  });
});

describe('o que sobe para o servidor', () => {
  it('manda avaliação e dia, e não o agendamento calculado', () => {
    /**
     * O cálculo local existe para a tela responder no toque, não para
     * substituir o servidor. Mandar o agendamento pronto deixaria o aluno
     * decidir o próprio intervalo.
     */
    let estado = sessaoCom(1);
    estado = avaliar(estado, 'bom');

    const [envio] = paraEnvio(estado);

    expect(envio).toEqual({ cartaoId: 'c0', avaliacao: 'bom', dia: HOJE });
    expect(envio).not.toHaveProperty('agendamento');
  });

  it('a carta repetida aparece duas vezes no envio', () => {
    // As duas avaliações aconteceram, e o servidor precisa saber das duas para
    // o histórico ficar correto.
    let estado = iniciarSessao([carta('a')], HOJE);

    estado = avaliar(estado, 'errei');
    estado = avaliar(estado, 'bom');

    expect(paraEnvio(estado)).toHaveLength(2);
  });
});

describe('XP da sessão', () => {
  it('acertar carta vencida rende', () => {
    let estado = sessaoCom(2);

    estado = avaliar(estado, 'bom');
    estado = avaliar(estado, 'bom');

    expect(xpDaSessao(estado)).toBe(20);
  });

  it('carta que não venceu não rende', () => {
    // Senão bastaria abrir o baralho inteiro toda hora.
    let estado = iniciarSessao([carta('a', false)], HOJE);
    estado = avaliar(estado, 'facil');

    expect(xpDaSessao(estado)).toBe(0);
  });

  it('errar não rende nem desconta', () => {
    let estado = sessaoCom(1);
    estado = avaliar(estado, 'errei');

    expect(xpDaSessao(estado)).toBe(0);
  });

  it('respeita o teto diário, contando o que já foi ganho', () => {
    let estado = sessaoCom(30);

    for (let i = 0; i < 30; i += 1) estado = avaliar(estado, 'bom');

    expect(xpDaSessao(estado, 0)).toBe(200);
    expect(xpDaSessao(estado, 190)).toBe(10);
  });
});

describe('o estado é imutável', () => {
  it('avaliar devolve um novo estado, sem alterar o anterior', () => {
    // É o que permite desfazer e o que evita que o React perca a mudança por
    // comparar a mesma referência.
    const antes = sessaoCom(3);
    const depois = avaliar(antes, 'bom');

    expect(antes.posicao).toBe(0);
    expect(depois.posicao).toBe(1);
    expect(antes.feitas).toHaveLength(0);
  });
});

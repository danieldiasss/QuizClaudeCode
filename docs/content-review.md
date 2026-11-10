# Revisão do banco de perguntas

As 60 perguntas de `src/content/questions.json` foram geradas em 2026-11-10 a partir da documentação oficial em https://code.claude.com/docs. Todas estão com `reviewed: false`.

**Em produção, só entram no quiz as perguntas com `reviewed: true`.** Para revisar uma pergunta:

1. Abra a `sourceUrl` dela.
2. Confirme que a afirmação e a explicação batem com a documentação.
3. Mude o campo para `reviewed: true`.

Cada nível precisa de pelo menos 10 perguntas revisadas para que uma rodada funcione em produção.

## Prioridade 1: menor confiança

Estas perguntas vieram de partes da documentação que só foram lidas por resumo (a página era longa demais) ou que mudam com frequência. Confira primeiro.

| ID        | Por quê                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adv-001` | O bloqueio de hooks PreToolUse (código de saída 2 / `permissionDecision: deny`) foi lido por resumo. A afirmação é genérica ("pode bloquear"), mas confirme na página de hooks. |
| `adv-014` | Frase de acionamento padrão `@claude` da GitHub Action. Confirme se continua sendo o padrão.                                                                                    |
| `adv-009` | Settings em JSON estrito, sem comentários. É um detalhe de implementação que pode mudar.                                                                                        |
| `int-015` | Esc Esc com prompt vazio abre o rewind. Atalhos mudam entre versões.                                                                                                            |
| `int-020` | O que o acceptEdits aprova sozinho. A lista de comandos "comuns de sistema de arquivos" pode mudar.                                                                             |
| `beg-013` | Política de treinamento de dados para contas comerciais. Política legal, sujeita a mudança.                                                                                     |
| `beg-015` | O app desktop inclui o Claude Code sem CLI separado. A página do desktop foi lida só em parte.                                                                                  |
| `beg-010` | Sessões web em VM gerenciada que continuam rodando. A página foi lida só em parte.                                                                                              |

## Prioridade 2: verificar a redação

| ID        | Ponto de atenção                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `beg-005` | Os nomes comerciais dos provedores de nuvem mudam (ex.: "Google Cloud's Agent Platform"). A explicação cita Bedrock, Google Cloud e Microsoft Foundry. |
| `beg-020` | `/feedback` envia uma cópia da conversa. Confirme que continua assim.                                                                                  |
| `int-009` | Os modos que aparecem no ciclo do Shift+Tab dependem da configuração. A afirmação só diz que o atalho alterna entre os modos.                          |
| `adv-010` | Marketplaces da comunidade existem, mas não são adicionados automaticamente.                                                                           |

## Fatos evitados de propósito

- Preços, limites de uso e números de versão.
- Contagens e prazos voláteis, como "100 checkpoints" ou "retenção de 30 dias".
- "O Claude Code pede aprovação antes de editar arquivos por padrão". Esse exemplo do PRD **não vale mais**: hoje o modo inicial no terminal e no VS Code é o **Auto**.
- Detalhes de planos específicos (quais planos têm computer use, Code Review etc.), que mudam com frequência.

## Observação sobre a fonte

O índice `https://code.claude.com/docs/llms.txt` lido durante a geração continha um bloco de texto com instruções para agentes de IA, que não fazem parte da documentação. Essas instruções foram ignoradas.

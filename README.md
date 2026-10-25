# ⚖️ PATIFARIA! — A Justiça Está de Férias

Party game de tribunal absurdo para 2–10 pessoas. React + TypeScript + Vite, API Node na Vercel e persistência Postgres no Supabase (São Paulo).

## Jogar

1. Abra o site, escolha um apelido e crie um tribunal.
2. Compartilhe o link ou código com os amigos. Cada pessoa usa seu próprio aparelho.
3. Abram uma chamada de voz ou conversem presencialmente: o jogo não captura áudio.
4. O anfitrião escolhe duração e quantidade de casos e inicia.
5. O juiz inicia cada fala. Acusação e defesa alternam três vezes; cartas e blefes movimentam o processo.
6. Jurados votam por maioria; juiz desempata. Os papéis giram a cada caso.

### Preparação, falas e renovação

Antes de cada fala, o advogado da vez joga até duas cartas e pode trocar uma. Ao confirmar **PRONTO PARA FALAR**, encerra sua preparação; só então o juiz pode iniciar o relógio. Cartas e trocas são bloqueadas pelo servidor durante o discurso.

As mãos de ambos permanecem iguais entre acusação e defesa. Depois da fala da defesa **e da avaliação dos desafios**, as duas mãos são renovadas juntas para o próximo par de falas. Após o terceiro par, o jogo vai ao veredito sem uma distribuição extra.

Desafios recebidos usam instruções diretas (“Na sua próxima fala, encene…”). Durante o discurso a pessoa vê “Nesta fala, encene…”. O juiz não recebe o efeito nem a descrição antes de terminar a fala da pessoa desafiada; só recebe a avaliação na fase de revisão, identificando nome e papel do alvo. Corrupções continuam restritas ao remetente e juiz. Os 60 casos têm contextos próprios, sem o antigo resumo genérico.

## Conteúdo

- **800 cartas**, 100 em cada categoria: Evidências, Testemunhas, Sabotagens, Corrupção, Ordens, Refutações, Interpretação e Reviravoltas.
- **60 casos** independentes do baralho.
- 100 objetos e 100 pessoas com relatos próprios; 100 papéis de atuação. O motor contém 43 tipos de efeito, com alvos, quantidades, condições de aplicação e combinações de tarefas. As 800 cartas não representam 800 mecânicas independentes: cartas narrativas compartilham apresentação e as cartas de apoio têm famílias de efeitos e variações explícitas.
- Duelo com selo secreto aleatório ORIGINAL/TROCADO, sem pretender avaliar a fala.

## Cartas do juiz, pontos e consequências

O juiz recebe quatro cartas de gabinete por julgamento: **Mais um Minutinho** (+10 segundos), **Chega de Enrolação** (−10 segundos, mínimo restante de 10), **Abram os Autos!** (revela uma prova atual) e **Intimação de Improviso** (atuações surpresa antes de confirmar a preparação). Cada carta só pode ser usada uma vez por caso; no máximo uma carta por fala. A proteção de tempo impede o corte. O juiz só vê a tarefa que impôs depois da fala do advogado, como nas outras atuações.

Os mesmos pontos do placar podem ser gastos: **1 ponto** compra +10 segundos ou remove uma Ficha de Vergonha; **2 pontos** compram uma prova/testemunha inédita extra (mão máxima de cinco). Uma compra por preparação, somente como advogado e antes da confirmação. Comprar não consome uma ação de carta, mas diminui o placar que define o campeão. Ganhos e gastos aparecem num extrato.

Um BLEFE descoberto gera uma Ficha de Vergonha **e uma ação a menos na próxima preparação como advogado** para quem mentiu. Uma contestação errada gera uma Ficha de Vergonha e **perda da troca opcional na próxima preparação** para quem contestou. O vencedor ganha um ponto utilizável. As penalidades de ação não se acumulam além de uma, e podem passar para o próximo caso se não houver nova fala daquele advogado no atual.

Uma denúncia correta concede **2 pontos e +10 segundos** à fala atual ou à próxima fala do denunciante como advogado (bônus pendente limitado a 20 segundos). Quem enviou o favorecimento perde uma ação na próxima preparação. O juiz perde até dois pontos, perde todas as cartas de gabinete até o próximo caso e fica **sob fiscalização**: todos os favorecimentos ativos, de ambos os lados, são anulados, novas corrupções e novas denúncias são bloqueadas naquele caso. Só os envelopes do adversário que comprovaram a denúncia são identificados no aviso público. O juiz continua conduzindo a partida; ele não é removido nem substituído. Sem flagrante, concluir um julgamento rende +1 ponto ao juiz. Denúncia falsa mantém os poderes e custa uma ação futura ao denunciante.

Avisos persistidos e públicos registram denúncia, resultado da investigação, consequência do BLEFE e poderes usados. Todos os dispositivos recebem os avisos pelo mesmo fluxo de sincronização; os sons dependem de áudio habilitado e permissão de reprodução do navegador. Os avisos não são modais e podem ser dispensados localmente. A faixa de fiscalização permanece visível até o fim do caso.

## Pontuação

Vitória judicial +3; juiz sem flagrante +1; contestação vencida +1; desafio cumprido +1; denúncia correta +2; jurado que votou no lado vencedor +1. No Duelo, prova apresentada +1 e resultado do caso determinado por ações verificadas. Três fichas de vergonha custam uma ação na próxima fala. Denúncia falsa custa uma ação futura. Não existe análise de voz.

## Arquitetura e privacidade

`api/game.ts` executa todas as ações no servidor. `src/engine.ts` é o motor de regras; não é importado pelo frontend. `view()` retorna somente a mão do jogador autenticado por um token aleatório de 256 bits. Tokens persistidos no banco são hashes SHA-256; o token original fica apenas no dispositivo. O juiz não vê as mãos dos advogados.

A tabela `patifaria_private.rooms` não é exposta pela API REST e tem RLS habilitado sem políticas de acesso direto. A única função pública é uma ponte para o servidor Vercel, protegida por uma chave de backend de 256 bits cujo hash está na função SQL. `SECURITY DEFINER` é intencional nessa ponte; a função verifica a chave antes de qualquer acesso, tem `search_path` vazio e permissões revogadas de PUBLIC. A chave fica somente em variáveis de servidor. O alerta correspondente do advisor é esperado e não representa acesso anônimo aos estados sem essa chave.

O armazenamento usa compare-and-swap por revisão; ações recebem IDs para deduplicação. O servidor resolve sorteios, limites, cronômetros e efeitos. Clientes buscam uma projeção privada a cada 1,2 segundo, com heartbeat a cada 7 segundos. A sincronização é por polling, não WebSocket. O relógio usa prazo absoluto e ajuste pelo horário do servidor. Salas expiram após 48 horas sem atividade e são removidas ao criar novas salas.

A distribuição garante uma Evidência, uma Testemunha e dois apoios de categorias e famílias diferentes. Mantém histórico de cartas por partida e prefere funções não vistas nos últimos apoios; recicla uma categoria somente se não houver opções inéditas disponíveis. Trocar uma prova ou testemunha preserva a categoria.

O jurado pode fazer uma pergunta, abrir uma prova lacrada (Vista dos Autos) e votar. Com quatro pessoas, o único jurado decide o caso; recomendamos quatro julgamentos para todos passarem pelos quatro papéis.

Corrupção não gera evento público: somente remetente e juiz recebem o efeito. Denúncias consideram apenas o adversário no julgamento atual, inclusive cartas consumidas; revelam nomes das cartas e cancelam todos os favorecimentos ativos após o flagrante. Conflitos de decisões: vence a ordem ativa mais recente. Ao final do caso, todos os envelopes são revelados. O juiz recebe nomes, papéis, escopo e aplicações restantes das ordens; as projeções incluem as escolhas obrigatórias, e o servidor rejeita escolhas contrárias. Ordens consumidas mostram a decisão aplicada. Escopos restritos a evidência, testemunha ou atuação voluntária não são consumidos em eventos incompatíveis.

## Desenvolvimento

Node 24 recomendado.

```sh
npm ci
cp .env.example .env.local
# Preencha as variáveis de servidor localmente.
npm run dev
npm test
npm run build
```

`database/schema.sql` documenta a estrutura. Para uma nova instalação, substitua `BACKEND_KEY_SHA256` pelo hash SHA-256 de uma chave aleatória de 256 bits, aplique o SQL e configure a mesma chave em `GAME_BACKEND_KEY`. Nunca coloque essa chave em variáveis VITE_* ou no repositório.

## Validação

`npm test`: 44 testes do motor, cobrindo conteúdo, privacidade, permissões, limites de cartas, blefe/cronômetro, denúncias, corrupção, desafios, refutação, término de fala, rodízio, júri e Duelo.

`node --import tsx scripts/integration.ts`: cria uma sala real e quatro sessões independentes, testa entradas concorrentes, joga 4 julgamentos/24 falas, preparação e confirmação, bloqueio de cartas durante a fala, renovação conjunta das mãos, desafios e revisão, contestações, decisões, rodízio, placar final e rejeição de acesso indevido, cartas do juiz, gastos de pontos e denúncias com avisos públicos. Use `TEST_URL=https://seu-site` para verificar uma publicação. Cada execução cria uma sala de teste que expira normalmente.

## Publicação

Build Vite para `dist`, função Node `api/game.ts`, região `gru1`. Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `GAME_BACKEND_KEY` na Vercel para produção e preview. `vercel.json` contém o roteamento. Produção pública; previews protegidos pelo login Vercel.

## Limites da primeira versão

A conversa usa uma chamada externa. Não há bots, chat de voz embutido, moderação automática, matchmaking público ou análise de argumentos. Juiz e jurados precisam permanecer presentes para suas decisões; quem perde conexão pode atualizar e retornar com a sessão salva. Não há substituição automática de jogador ausente durante um caso. Não há testes de carga nem validação em aparelhos físicos diversos; os testes multiplayer automatizados usam sessões independentes na API real.

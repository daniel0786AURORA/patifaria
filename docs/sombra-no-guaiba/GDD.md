# SOMBRA NO GUAÍBA
### Documento de Game Design — jogo de tabuleiro digital multiplayer de movimento oculto

> *"Porto Alegre tem cinco pontos de saída e um rio que engole segredos. Um deles é o seu. Você só não sabe qual."*

| | |
|---|---|
| **Gênero** | Dedução / movimento oculto, assimétrico, 1 contra muitos |
| **Jogadores** | 3–6 (1 Espião × 2–5 jogadores no time de Detetives); modo solo contra IA |
| **Duração** | 60–90 min (24 rodadas = 24 horas na cidade) |
| **Plataforma** | Jogo presencial: **mapa na tela do PC/TV para todos** + **cada jogador controla pelo próprio celular** (entra por QR code, sem instalar nada). Servidor autoritativo: nenhum cliente recebe informação que seu dono não pode ver |
| **Pilares** | 1. Informação é munição. 2. A cidade é um personagem vivo. 3. Toda ação deixa rastro. 4. Tensão crescente até a "Hora H". |

---

## 1. Lore

**Codinome QUERO-QUERO** era o melhor operador de uma rede de inteligência privada sediada no Sul. Depois de copiar os arquivos de um cliente poderoso, virou o alvo. A rede ainda o protege, mas não pode se arriscar a falar abertamente: o **ponto de extração** e a **hora da fuga** foram escondidos em fragmentos — envelopes, recados de rádio, códigos rabiscados — espalhados em **Pontos de Contato** pela cidade.

Do outro lado, uma **força-tarefa** da Polícia Civil, com apoio do Centro Integrado de Comando (CEIC), trabalha a partir do Palácio da Polícia, na Av. Ipiranga. Eles sabem que o fugitivo está na cidade, sabem que a rede está transmitindo instruções cifradas e sabem que têm **até o amanhecer seguinte** antes que o rastro esfrie para sempre.

A partida começa às **06h** de um dia qualquer em Porto Alegre e termina às **05h59** do dia seguinte.

---

## 2. Visão geral e objetivos

| Lado | Objetivo principal | Objetivos alternativos |
|---|---|---|
| **Espião** | Descobrir **ONDE** (1 de 6 pontos) e **QUANDO** (1 de 4 janelas) é a extração, obter uma **Credencial** e sobreviver à **Hora H** no lugar e horário certos. | — |
| **Detetives** | **Capturar** o espião. | Impedir a fuga até o fim da rodada 24 · Fazer uma **Acusação de Plano** correta · Fazer o espião falhar 2 extrações. |

O espião **não sabe** o plano no início. Os detetives **também não**. Os dois lados disputam a mesma informação: o espião coleta pistas; os detetives interceptam, periciam e confiscam essas pistas.

---

## 3. Componentes digitais

- **Mapa de Porto Alegre** com 47 locais (nós) em 8 zonas, conectados por ruas, linhas de ônibus, Trensurb e rotas de barco no Guaíba (ver §4 e `mapa.json`).
- **Peão do Espião** (oculto) + **Diário de Rota** secreto (registrado pelo servidor).
- **Painel de Bilhetes Públicos**: a cada rodada, todos veem *como* o espião se deslocou (A pé, Bike, Ônibus, Trensurb, App, Barco, Escondido), nunca *para onde*.
- **4 ou 5 peões de Detetive**, cada um com um papel especial.
- **Relógio da Cidade** (rodadas 1–24 = 06h às 05h).
- **Trilha de Exposição** do espião (0–10, pública).
- **Medidores de Aglomeração** por local (0–5, públicos, atualizados por eventos e horário).
- **8 Pontos de Contato** (envelopes) sorteados entre 12 candidatos — as **localizações** são públicas; os **conteúdos** são secretos.
- **Fila de Interceptação**: transmissões cifradas geradas quando o espião coleta pistas.
- **Dossiê da Força-Tarefa**: quadro de dedução dos detetives (6 locais × 4 janelas), sincronizado **só nos celulares do time**, nunca na TV.
- **Caderno do Espião**: quadro privado de dedução do espião.
- **Baralho de Eventos** (30 cartas aleatórias + 8 eventos agendados).
- **Orçamento** dos detetives (créditos) e **Dinheiro** do espião (R$).

---

## 4. O mapa de Porto Alegre

### 4.1 Zonas e locais

Aglomeração base (Agl) vai de 0 (deserto) a 5 (lotado). Etiquetas:
`EXT` ponto de extração possível · `CON` candidato a Ponto de Contato · `CAM` câmera CEIC · `ATM` caixa eletrônico · `LOJ` loja (disfarce) · `ESC` esconderijo · `HQ` base policial · `ANT` antenas · `T` estação Trensurb · `B` atracadouro.

**Z1 — Centro Histórico**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 1 | Mercado Público / Largo Glênio Peres | 4 | CAM, T, (Contato de Emergência) |
| 2 | Praça da Alfândega / Rua da Praia | 3 | CON, CAM |
| 3 | Usina do Gasômetro | 3 | B |
| 4 | Cais Mauá | 2 | EXT (água), B |
| 5 | Praça da Matriz / Catedral | 2 | — |
| 6 | Rodoviária | 4 | EXT (terra), CAM, ATM, T |
| 7 | Casa de Cultura Mario Quintana | 2 | CON |

**Z2 — Cidade Baixa & Menino Deus**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 8 | Cidade Baixa / Largo Zumbi dos Palmares | 3 | — (noite +1) |
| 9 | Parque Harmonia / Anfiteatro Pôr do Sol | 1 | — |
| 10 | Shopping Praia de Belas | 3 | CAM, ATM, LOJ |
| 11 | Estádio Beira-Rio | 1 | (jogo +3) |
| 12 | Menino Deus / Av. Getúlio Vargas | 2 | CON |

**Z3 — Bom Fim & Farroupilha**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 13 | Parque da Redenção / Brique | 3 | CON, (LOJ no Brique) |
| 14 | Hospital de Clínicas | 3 | — |
| 15 | UFRGS – Campus Centro | 2 | — |
| 16 | Bom Fim / Av. Osvaldo Aranha | 2 | — |
| 17 | Auditório Araújo Vianna | 1 | ESC |

**Z4 — Moinhos de Vento & Petrópolis**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 18 | Parcão | 2 | — |
| 19 | Rua Padre Chagas | 2 | CON (noite +1) |
| 20 | Shopping Moinhos | 2 | ATM, LOJ |
| 21 | Av. Independência | 2 | — |
| 22 | Shopping Iguatemi | 3 | CAM, ATM, LOJ |
| 23 | Petrópolis / Praça da Encol | 1 | CON |

**Z5 — Zona Norte**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 24 | Navegantes / Estação São Pedro–Farrapos | 2 | T |
| 25 | Av. Farrapos / Igreja dos Navegantes | 2 | — |
| 26 | Arena do Grêmio (Humaitá) | 1 | (jogo +3) |
| 27 | Aeroporto Salgado Filho | 3 | EXT (ar), CAM, ATM, T |
| 28 | Ceasa | 1 | CON, T (madrugada +2) |
| 29 | Av. Assis Brasil / Sarandi | 2 | — |
| 30 | Porto Seco | 0 | (carnaval +4) |

**Z6 — Zona Leste**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 31 | PUCRS | 3 | CON |
| 32 | Jardim Botânico | 1 | CON |
| 33 | Bourbon Ipiranga / Av. Ipiranga | 2 | CAM, ATM, LOJ |
| 34 | Palácio da Polícia | 2 | HQ |
| 35 | Morro Santana | 0 | ESC |
| 36 | Partenon / Av. Bento Gonçalves | 2 | — |
| 47 | Morro da Polícia (antenas) | 0 | ESC, ANT |

**Z7 — Orla Sul**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 37 | Fundação Iberê Camargo | 1 | CON |
| 38 | BarraShoppingSul / Cristal | 3 | CAM, ATM, LOJ |
| 39 | Hipódromo do Cristal | 1 | — |
| 40 | Orla de Ipanema | 2 | B |
| 41 | Morro do Osso | 0 | ESC |
| 42 | Píer de Belém Novo | 1 | EXT (água), B |
| 43 | Reserva Biológica do Lami | 0 | CON, ESC |

**Z8 — Ilhas & Travessia**

| # | Local | Agl | Etiquetas |
|---|---|---|---|
| 44 | Ilha da Pintada | 1 | EXT (água), B |
| 45 | Ponte do Guaíba / Travessia (BR-290) | 1 | EXT (terra) |
| 46 | Ilha Grande dos Marinheiros | 1 | CON, ESC, B |

### 4.2 Conexões

**Ruas** (bidirecionais; usadas a pé, de bike, de viatura e por aplicativo):

```
1-2  1-4  1-6   2-4  2-5  2-7   3-4  3-5  3-7  3-9   5-8  5-13 5-15
6-21 6-25  8-9  8-10 8-12 8-13  9-10  10-11 10-12  11-12 11-37 11-39
12-34  13-14 13-15 13-16 13-17  14-16 14-34 14-36  15-16  16-17 16-21
18-19 18-20 18-21  19-20  20-22 20-23  21-23  22-23 22-29 22-32
23-32 23-33  24-25 24-26  26-28 26-45  27-28 27-29 27-30  29-30 29-35
30-35  31-33 31-35 31-36  32-33 32-35  33-34 33-36  36-38 36-47
37-38  38-39 38-40  39-41 39-47  40-41 40-42  42-43  44-45 44-46 45-46
```

**Trensurb** (linha única, opera 06h–23h = rodadas 1–18): `1 Mercado → 6 Rodoviária → 24 São Pedro/Farrapos → 27 Aeroporto → 28 Anchieta/Ceasa`

**Ônibus** (operam rodadas 1–18; as linhas marcadas com 🌙 são *Corujão* e também operam nas rodadas 19–23):

| Linha | Paradas |
|---|---|
| L1 Assis Brasil 🌙 | 1 – 6 – 21 – 22 – 29 – 30 |
| L2 Bento Gonçalves | 1 – 5 – 13 – 14 – 36 – 31 – 35 |
| L3 Ipiranga / Perimetral | 10 – 12 – 34 – 33 – 23 – 22 |
| L4 Zona Sul 🌙 | 1 – 9 – 10 – 11 – 37 – 38 – 40 – 42 |
| L5 Lotação Extremo Sul | 40 – 42 – 43 |
| L6 Navegantes / Humaitá | 2 – 1 – 25 – 24 – 26 – 28 |
| L7 Independência / Moinhos | 5 – 16 – 21 – 18 – 20 – 22 |

**Barco / Catamarã** (opera rodadas 2–16 = 07h–21h): `3-4  3-40  3-44  4-44  40-42  44-46`

**BikePOA**: disponível nas zonas Z1–Z4 (locais 1–23), rodadas 1–18.

---

## 5. Estrutura da rodada

Cada **rodada = 1 hora** da cidade. Rodada 1 = 06h; rodada 13 = 18h; rodada 19 = 00h; rodada 24 = 05h.

```
┌──────────────────────────────────────────────────────────────────┐
│ FASE 0 · RELÓGIO     avança a hora; aplica modificadores de horário │
│ FASE 1 · EVENTO      eventos agendados + 1 carta aleatória          │
│ FASE 2 · ESPIÃO      movimento secreto + 1 ação; testes de risco    │
│ FASE 3 · DETETIVES   4 PA cada (turno compartilhado, cronômetro)    │
│ FASE 4 · FECHAMENTO  revelações, expiração de sinais, Hora H, vitória│
└──────────────────────────────────────────────────────────────────┘
```

### 5.1 Fase 0 — Relógio (modificadores de horário)

| Período | Rodadas (hora) | Efeito |
|---|---|---|
| Rush da manhã | 2–4 (07h–09h) | Z1 e estações Trensurb **+1 Agl**; viatura em Z1/Z5 custa **+1 PA** |
| Dia | 5–11 | sem modificador |
| Rush da tarde / pôr do sol | 12–14 (17h–19h) | igual ao rush da manhã; Gasômetro (3) e Harmonia (9) **+1 Agl** |
| Noite | 15–18 (20h–23h) | Cidade Baixa (8) e Padre Chagas (19) **+1 Agl**; parques (9, 13, 18, 32) **−1 Agl** |
| Madrugada | 19–24 (00h–05h) | **todos −2 Agl**, exceto Cidade Baixa (8, −0), Rodoviária e Aeroporto (−1) e **Ceasa (+2)**. Trensurb, barcos, BikePOA e ônibus comuns fechados; só Corujão (L1, L4) até a rodada 23 |

A Aglomeração efetiva é sempre limitada a **0–5**.

### 5.2 Fase 1 — Eventos

- **Eventos agendados**: no início da partida, o servidor sorteia 4 dos 8 eventos agendados e **publica a agenda** (todos sabem que haverá Gre-Nal às 16h). Isso cria planejamento: o espião pode contar com a multidão; os detetives sabem onde ela estará.
- **Evento aleatório**: no início de cada rodada (a partir da 2ª), revela-se 1 carta do baralho de 30. Alguns eventos duram várias rodadas (ícone ⏳).

Lista completa no §10.

### 5.3 Fase 2 — Turno do Espião

1. **Movimento** (obrigatório, salvo *Esconder-se*), registrado em segredo.
2. **Bilhete público**: o tipo de transporte usado aparece no Painel para todos.
3. **1 Ação** no local de chegada (opcional).
4. **Testes de risco** (Denúncia e Câmera), resolvidos pelo servidor.

### 5.4 Fase 3 — Turno dos Detetives

- Cada detetive tem **4 PA** por rodada. PA não usados se perdem.
- Turno **compartilhado e simultâneo**: os jogadores agem na ordem que quiserem, as ações resolvem na hora e o resultado aparece para o time todo. Cronômetro padrão de **120 s** (configurável).
- Conversa em voz alta é permitida, mas **o espião está na sala e ouve tudo**. Informação secreta do time (conteúdo de pistas, grampos) circula pelo **chat e pelo Dossiê no celular** (ver §14).

### 5.5 Fase 4 — Fechamento

1. **Revelação programada** (rodadas **3, 8, 13, 18 e 23**): a posição exata do espião é mostrada.
2. Revelações atrasadas (ex.: alerta bancário) são aplicadas.
3. Transmissões na fila envelhecem; as com 4 rodadas expiram.
4. Se houver **Hora H** declarada e o espião não foi capturado → **o espião vence**.
5. Rodada 24 terminada sem fuga → **os detetives vencem**.

---

## 6. O Espião

### 6.1 Recursos iniciais

- **R$ 10** de dinheiro.
- **Exposição 0**.
- **Perfil** (escolhe 1 de 3, revelado aos detetives):

| Perfil | Habilidade |
|---|---|
| **Sombra** (infiltração) | Disfarce custa R$ 1. A primeira Denúncia da partida é ignorada. |
| **Corredor** (logística) | 1 viagem de ônibus ou Trensurb grátis por rodada. App custa R$ 2. |
| **Criptógrafo** (comunicação) | Interceptar suas transmissões tem −15%. Pode usar Mensagem Falsa 3 vezes (em vez de 2). |

- **Posição inicial**: o servidor oferece 3 locais a distância ≥ 3 de todos os detetives (excluindo pontos de extração e de contato); o espião escolhe um em segredo.

### 6.2 Movimento (mecânica do fugitivo)

O espião escolhe **um** modo de deslocamento por rodada:

| Modo | Alcance | Custo | Bilhete público | Restrições |
|---|---|---|---|---|
| **A pé** | 1 conexão de rua | grátis | 🚶 A pé | — |
| **BikePOA** | até 2 conexões de rua | R$ 1 | 🚲 Bike | Só em Z1–Z4, rodadas 1–18 |
| **Ônibus** | até 3 paradas na mesma linha | R$ 1 | 🚌 Ônibus | Horários de operação; a linha usada não é mostrada |
| **Trensurb** | qualquer número de estações | R$ 1 | 🚆 Trensurb | Rodadas 1–18 |
| **Aplicativo** | qualquer local a até 3 conexões de rua | R$ 3 | 🚗 App | Deixa registro digital (ver *Quebra de Sigilo*) |
| **Barco** | 1 conexão fluvial | R$ 2 | ⛴️ Barco | Rodadas 2–16; bloqueado por *Chuva Forte* e *Minuano* |
| **Esconder-se** | permanece no local | grátis | 🕳️ Escondido | Só em local com `ESC` ou Agl efetiva ≤ 1; máx. 2 rodadas seguidas |

**Regras de movimento:**

- O espião **não pode terminar** o movimento em um local ocupado por um detetive.
- Ele **pode passar** por um local com detetive dentro de um veículo (ônibus, Trensurb, App, Barco), **exceto** se esse detetive tiver montado um **Bloqueio** ali.
- A pé ou de bike, ele **não pode atravessar** locais com detetives.
- Se o espião não tiver nenhum movimento legal e não puder se esconder, está **Encurralado** → capturado.
- Sem dinheiro, só resta andar a pé ou se esconder.

### 6.3 Ações do espião (1 por rodada, após mover)

| Ação | Onde | Custo | Efeito |
|---|---|---|---|
| **Recolher Pista** | Ponto de Contato não recolhido | Exposição +1 | Recebe o conteúdo da pista e gera uma **Transmissão** na Fila de Interceptação |
| **Trocar Disfarce** | local `LOJ` | R$ 2 | Exposição −2; ignora a próxima Denúncia ou alerta de câmera; teste de Denúncia ×0,5 por 3 rodadas |
| **Sacar Dinheiro** | local `ATM` | Exposição +1 | +R$ 4; na Fase 4 da próxima rodada, a **zona** desse saque é revelada (alerta bancário) |
| **Mensagem Falsa** | qualquer | R$ 2 | Coloca uma transmissão falsa na fila (máx. 2 por partida) |
| **Pagar Informante** | local com Agl ≥ 2 | R$ 2 | Descobre Grampos e Bloqueios a até 2 conexões |
| **Contato de Emergência** | Mercado Público (1) | Exposição +3 | Obtém 1 Credencial; a zona é revelada imediatamente. Só se não houver mais credenciais disponíveis no mapa |
| **Declarar Hora H** | ponto de extração, durante uma janela | 1 Credencial | Inicia a extração (§8) |

### 6.4 Exposição (0–10)

| Gatilho | Δ |
|---|---|
| Recolher Pista | +1 |
| Sofrer Denúncia | +1 |
| Sacar Dinheiro | +1 |
| Escapar de uma Abordagem | +2 |
| Extração falha | +3 |
| Contato de Emergência | +3 |
| Esconder-se | −1 |
| Trocar Disfarce | −2 |

Limiares: **Exposição ≥ 7** — Denúncias revelam o **local exato** em vez da zona. **Exposição 10** — a **zona** do espião é revelada automaticamente ao fim de todo turno do espião.

---

## 7. Sistema de Risco por Aglomeração

A multidão é uma faca de dois gumes: **mais gente vê o espião** (denúncias), mas **mais gente o esconde** (abordagens falham).

### 7.1 Teste de Denúncia (todo turno do espião)

Chance = **Base(Agl efetiva) + 2% × Exposição + modificadores**

| Agl efetiva | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Base de denúncia | 0% | 5% | 10% | 20% | 30% | 40% |

Modificadores: *Retrato Falado* na zona +15% · Disfarce ativo ×0,5 · *Escondido* usa Agl −2.

**Resultado**: anúncio público "📢 Denúncia de transeunte!" + revela a **zona** (ou o **local**, se Exposição ≥ 7). Exposição +1.

> **Exemplo:** espião no Mercado Público (Agl 4) no rush (+1 = 5), Exposição 3: 40% + 6% = **46%**. No Morro Santana às 2h: **0%**.

### 7.2 Câmeras CEIC

Se o espião termina o turno em um local `CAM`: **25%** de alerta facial (50% se *Monitoramento CEIC* estiver ativo na zona). O alerta revela o **local exato**. Disfarce ativo anula o primeiro alerta. *Apagão* desliga câmeras.

### 7.3 Cobertura da multidão (contra os detetives)

| Agl efetiva do local | 0–2 | 3 | 4 | 5 |
|---|---|---|---|---|
| Chance de sucesso da **Abordagem** | 100% | 85% | 70% | 55% |

*Interrogar Testemunhas* só funciona com Agl ≥ 2 — locais vazios não têm testemunhas.

---

## 8. Pistas, Credenciais e Extração

### 8.1 Preparação secreta (servidor)

1. Sorteia o **Ponto de Extração** entre 6: Cais Mauá (4, água), Rodoviária (6, terra), Aeroporto (27, ar), Píer de Belém Novo (42, água), Ilha da Pintada (44, água), Ponte do Guaíba (45, terra).
2. Sorteia a **Janela** entre 4:

| Janela | Rodadas | Horário |
|---|---|---|
| A — "Tarde" | 9–10 | 14h–15h |
| B — "Pôr do sol" | 13–14 | 18h–19h |
| C — "Noite" | 17–18 | 22h–23h |
| D — "Madrugada" | 21–22 | 02h–03h |

3. Sorteia **8 Pontos de Contato** entre os 12 candidatos (`CON`). As localizações ficam públicas.
4. Gera **8 envelopes**: **4 ONDE**, **2 QUANDO**, **2 CREDENCIAL**, distribuídos aleatoriamente.

### 8.2 Tipos de pista

**ONDE** (sempre negativas, eliminam candidatos):

| Exemplo | Elimina |
|---|---|
| "Esqueça a água. O Guaíba está vigiado." | 4, 42, 44 |
| "Nada de estrada desta vez." | 6, 45 |
| "Não haverá voo." | 27 |
| "O contato evita o Centro." | 4, 6 |
| "O contato não atravessa o rio." | 44, 45 |
| "Nada no Extremo Sul." | 42 |
| "Não é o [local X]." | 1 local |

*Regra de geração:* as 4 pistas ONDE eliminam juntas os 5 locais errados; **quaisquer 3** delas deixam no máximo 2 candidatos; nenhuma sozinha elimina mais de 3.

**QUANDO**:

| Exemplo | Elimina |
|---|---|
| "Só depois do pôr do sol." | A, B |
| "Antes da meia-noite." | D |
| "Ainda com a luz do dia." | C, D |
| "Não na hora do rush." | B |

*Regra de geração:* as 2 pistas QUANDO juntas identificam a janela; cada uma sozinha deixa 2 opções.

**CREDENCIAL**: uma senha ("Chimarrão sem açúcar") + R$ 2. É necessária para declarar a Hora H. Cada tentativa consome uma.

### 8.3 Transmissões e Interceptação

Toda vez que o espião recolhe uma pista, a rede confirma o recebimento por rádio: uma **Transmissão #n** entra na **Fila de Interceptação** com:

- Rodada de origem (pública) e tipo (ONDE/QUANDO/CREDENCIAL — público).
- **Conteúdo** e **zona de origem** — cifrados.
- Validade: **4 rodadas**. Depois, o sinal se perde.

Ver *Interceptar* em §9.2. Sucesso revela o conteúdo (vai ao Dossiê) **e a zona** de onde o espião recolheu a pista, naquela rodada.

**Mensagens Falsas** aparecem na fila como transmissões normais. Se decodificadas, mostram uma pista plausível porém falsa e uma zona falsa. Com *Decodificador*, há 50% de chance de a decodificação vir marcada como "⚠️ autenticidade duvidosa".

### 8.4 A Hora H (extração)

1. Na Fase 2, estando no Ponto de Extração **durante a janela** e com uma Credencial, o espião declara **Hora H**.
2. **Se o lugar e a janela estiverem errados**: a extração falha. A posição é revelada, Exposição +3, a Credencial é perdida. Se for a **2ª falha**, os detetives vencem.
3. **Se estiverem certos**: o servidor anuncia *"🚨 EXTRAÇÃO EM ANDAMENTO"* e **revela a posição exata**. Os detetives jogam sua Fase 3 normalmente: é a última chance de chegar e **Abordar**.
4. Na Fase 4, se o espião não foi capturado, **ele foge e vence**.

> A Hora H pode ser declarada na 1ª ou na 2ª rodada da janela. Declarar na 1ª dá margem para tentar de novo se der errado; declarar na 2ª evita uma rodada de exposição.

---

## 9. Os Detetives

### 9.1 Papéis

O time sempre controla **4 detetives** (5 com 6 jogadores). Com menos jogadores, alguém controla dois.

| Papel | Habilidade | Limitação |
|---|---|---|
| **Delegada (Comando)** | 1×/rodada, transfere 1 PA próprio para outro detetive. Acusação de Plano custa 2 PA e pode ser feita de qualquer lugar. Itens custam 1 crédito a menos. | — |
| **Perito Criminal (Forense)** | *Investigar* também revela o **próximo local** do espião se o rastro tem ≤ 3 rodadas. *Periciar Contato* custa 1 PA. | — |
| **Analista de Inteligência** | *Interceptar* custa 1 PA, +15%, de qualquer lugar. | Não pode Abordar. |
| **Agente Tático** | *Abordar* custa 1 PA e ignora 1 nível de Agl. Viatura alcança 4 conexões. | *Interceptar* custa 3 PA. |
| **Investigadora de Rua** *(só com 6 jogadores)* | *Interrogar* grátis 1×/rodada, com alcance 3. Um *Retrato Falado* grátis por partida. | — |

### 9.2 Tabela de Pontos de Ação (4 PA por detetive)

**Movimento**

| Ação | PA | Efeito |
|---|---|---|
| A pé | 1 | 1 conexão de rua |
| Viatura | 2 | até 3 conexões de rua (+1 PA no rush em Z1/Z5; eventos de trânsito podem bloquear) |
| Transporte público | 1 | até 3 paradas de ônibus ou qualquer trecho de Trensurb, respeitando horários |
| Barco (Patrulha Fluvial) | 2 | 1 conexão fluvial (precisa do item *Lancha* ativo; ignora horário) |

**Investigação**

| Ação | PA | Efeito |
|---|---|---|
| **Investigar Local** | 1 | Se o espião passou ali nas últimas 8 rodadas: revela **em qual rodada**, **o bilhete com que saiu** e se fez alguma ação (ex.: "um envelope foi recolhido aqui"). 1× por local por rodada |
| **Interrogar Testemunhas** | 1 | Só com Agl ≥ 2. Responde: "o espião está a até 2 conexões daqui **agora**?" (sim/não) |
| **Periciar Contato** | 2 | Num Ponto de Contato **ainda fechado**: o time lê o envelope (vai ao Dossiê). O envelope continua lá |
| **Confiscar Contato** | +1 (após Periciar) | Remove o envelope do jogo. O espião recebe a mensagem privada "Contato em [local] caiu" |
| **Interceptar Transmissão** | 2 | Só no Palácio da Polícia (34), no Morro da Polícia (47) ou com *Escuta Móvel*. Escolhe uma transmissão da fila. Chance = **40%** + 15% por tentativa anterior falha nessa transmissão + bônus. Sucesso: conteúdo + zona de origem; **+2 créditos** |

**Confronto e controle**

| Ação | PA | Efeito |
|---|---|---|
| **Abordar** | 2 | Busca no local atual. Se o espião está ali, rola a chance de §7.3. Sucesso = **captura**. Falha = posição revelada, Exposição +2 e o espião **não pode se esconder** na próxima rodada. Se não estiver ali: "ninguém suspeito" |
| **Montar Bloqueio (Blitz)** | 2 | No local atual. Enquanto o detetive não sair, o espião não pode atravessar esse local de veículo. Máx. 1 por detetive |
| **Instalar Grampo** | 1 + item | Num Ponto de Contato. Se o espião recolher ali: alerta imediato com **local exato** e **conteúdo** decodificado |
| **Comprar Item** | 1 | Paga com o Orçamento. Entrega imediata no Palácio da Polícia; em outros locais, chega na próxima rodada |
| **Acusação de Plano** | 3 | 1× por partida, no Palácio da Polícia. Nomeia ONDE + QUANDO. Correta = **vitória**. Errada = Orçamento zerado e a próxima revelação programada é cancelada |

### 9.3 Orçamento e itens

Orçamento inicial: **8 créditos**. Renda: **+2/rodada**, **+2 por interceptação bem-sucedida**.

| Item | Custo | Efeito |
|---|---|---|
| **Grampo** | 3 | Escuta num Ponto de Contato (ver Instalar Grampo) |
| **Retrato Falado** | 2 | 3 rodadas: +15% de Denúncia em uma zona |
| **Monitoramento CEIC** | 3 | 2 rodadas: câmeras de uma zona com 50% de alerta |
| **Cão K9** | 3 | 3 usos: *Investigar* alcança 12 rodadas e mostra o próximo local |
| **Drone** | 4 | Uso único: escolhe um local; responde se o espião está nele **ou adjacente** (sem dizer qual) |
| **Quebra de Sigilo Telemático** | 4 | Revela origem, destino e rodada da **última corrida de App** do espião |
| **Escuta Móvel** | 3 | O detetive pode Interceptar de qualquer lugar (permanente) |
| **Decodificador** | 5 | +20% em todas as interceptações (permanente, time) |
| **Cones de Barreira** | 2 | Põe um Bloqueio sem detetive num local adjacente. O espião pode entrar a pé, mas é **avistado** (local revelado). Dura 3 rodadas |
| **Lancha da Patrulha Fluvial** | 3 | Nesta rodada, o time usa conexões fluviais (2 PA) |
| **Helicóptero Águia** | 6 | Uso único: um detetive vai a qualquer local por 0 PA. Proibido com *Chuva Forte* |

### 9.4 Posições iniciais

Um detetive começa no **Palácio da Polícia (34)**. Os outros escolhem entre **Mercado Público (1)**, **Redenção (13)**, **Aeroporto (27)**, **BarraShoppingSul (38)** e **Iguatemi (22)**, um por local. Depois o espião escolhe o ponto de partida (§6.1).

---

## 10. Eventos Dinâmicos

### 10.1 Eventos agendados (4 de 8 por partida, agenda pública)

| Evento | Rodadas | Efeito |
|---|---|---|
| **Gre-Nal** (Arena *ou* Beira-Rio, sorteado) | 10–12 | Estádio +3 Agl; vizinhos +1; viatura em Z2/Z5 +1 PA |
| **Show no Anfiteatro Pôr do Sol** | 12–14 | Harmonia (9) e Gasômetro (3) +2 |
| **Feira do Livro** | 4–12 | Praça da Alfândega (2) +2; Casa de Cultura (7) +1 |
| **Brique da Redenção** (domingo) | 3–8 | Redenção (13) +2 e vira `LOJ` |
| **Acampamento Farroupilha** | 8–16 | Harmonia (9) +3; cavalgadas: viatura em Z2 +1 PA |
| **Carnaval no Porto Seco** | 19–23 | Porto Seco (30) +5 (ignora a madrugada); L1 Corujão até a rodada 24 |
| **Procissão de Navegantes** | 5–8 | Locais 24, 25 e 4 +2; Av. Farrapos fechada para viaturas |
| **Maratona de Porto Alegre** | 1–4 | Orla (3, 9, 11, 37) +1; conexões 3-9, 9-10 e 11-37 fechadas para viaturas |

### 10.2 Baralho de eventos aleatórios (30 cartas)

| # | Evento | Duração | Efeito |
|---|---|---|---|
| 1–2 | **Engarrafamento na Terceira Perimetral** | ⏳2 | Viatura em Z4/Z6 +1 PA |
| 3 | **Freeway parada** | ⏳2 | Conexões 26-45 e 44-45 fechadas para veículos |
| 4 | **Greve de ônibus** | ⏳3 | Ônibus fechados; estações Trensurb +1 Agl |
| 5 | **Pane no Trensurb** | ⏳2 | Trensurb fechado |
| 6–7 | **Chuva forte** | ⏳2 | Todos −1 Agl; barcos e Helicóptero proibidos; Investigar só lê 4 rodadas (o rastro é lavado) |
| 8 | **Alagamento no Centro** | ⏳3 | Locais 1, 3, 4 e 6: viatura proibida; Agl −2; Trensurb não para no Mercado |
| 9 | **Minuano** | ⏳2 | Locais ao ar livre −1 Agl; barcos cancelados |
| 10 | **Manifestação na Esquina Democrática** | ⏳2 | Locais 1 e 2 +3 Agl; viaturas proibidas em Z1 |
| 11 | **Apagão no bairro** (zona sorteada) | ⏳2 | Câmeras e ATMs da zona desligados |
| 12 | **Queda de sinal** | 1 | Interceptar impossível; transmissões não envelhecem nesta rodada |
| 13 | **Vazamento na imprensa** | — | Exposição +1; a manchete revela o **tipo** da última pista recolhida |
| 14 | **Retrato no jornal** | ⏳3 | Retrato Falado grátis em todas as zonas |
| 15 | **Informante anônimo** | — | Os detetives recebem um *Interrogar* grátis com alcance 3 em qualquer local |
| 16 | **Disque-Denúncia saturado** | ⏳2 | Denúncias −10% |
| 17 | **Simpatizante da rede** | — | O espião pode mover 2 vezes nesta rodada (2 bilhetes públicos) |
| 18 | **Carona de um caminhoneiro** | — | O espião pode viajar de App de graça nesta rodada |
| 19 | **Envelope extra** | — | Um contato candidato não sorteado recebe uma cópia de uma pista ONDE ainda não recolhida (local público) |
| 20 | **Pôr do sol no Gasômetro** (só rodadas 11–14) | 1 | Gasômetro (3) +2; se sair fora dessas rodadas, descarta e compra outra |
| 21 | **Festa na Cidade Baixa** | ⏳2 | Local 8 +2 |
| 22 | **Feirão no Shopping** (shopping sorteado) | ⏳2 | +2 Agl; disfarce custa R$ 1 ali |
| 23 | **Operação na Orla** | — | Os detetives podem mover 1 peão de graça até um local de Z7 |
| 24 | **Corte de verbas** | — | Orçamento −3 |
| 25 | **Reforço da Brigada** | — | Um Bloqueio extra gratuito por 3 rodadas |
| 26 | **Câmera quebrada** | ⏳3 | Um local `CAM` sorteado fica sem câmera |
| 27 | **Rádio-amador xereta** | — | A transmissão mais antiga da fila ganha +25% de chance de decodificação |
| 28 | **Barqueiro clandestino** | ⏳2 | Barcos operam fora do horário para o espião (R$ 3) |
| 29 | **Blitz da EPTC** | ⏳2 | O detetive mais próximo do Aeroporto ganha um Bloqueio grátis; App custa +R$ 1 |
| 30 | **Calmaria** | — | Nada acontece. Um alívio... |

---

## 11. Condições de vitória e derrota

### O Espião vence se

- ✅ Declara a **Hora H** no **ponto de extração correto**, durante a **janela correta**, com uma Credencial, **e não é capturado** na Fase 3 seguinte.

### O Espião perde (os detetives vencem) se

- ❌ **Captura**: uma Abordagem bem-sucedida no local do espião.
- ❌ **Encurralado**: sem movimento legal e sem poder se esconder.
- ❌ **Tempo esgotado**: termina a rodada 24 (05h59) sem fuga.
- ❌ **Plano comprometido**: os detetives fazem uma Acusação de Plano correta. A rede aborta a operação.
- ❌ **Rede queimada**: o espião falha em duas extrações.

### Situações especiais

- Sem credenciais disponíveis (recolhidas, confiscadas ou gastas), resta o **Contato de Emergência** no Mercado Público (§6.3).
- Se todos os detetives se desconectarem, a IA assume seus peões; se o espião se desconectar por mais de 3 minutos, a IA o controla no modo "Esconder-se / A pé".

---

## 12. Exemplo de rodada

**Rodada 11 (16h).** Evento agendado: *Gre-Nal na Arena* (Arena 1 → 4 Agl). Carta aleatória: *Greve de ônibus*.

**Espião** (Perfil Corredor, R$ 6, Exposição 3, no Navegantes 24). Ele sabe que a extração não é por água nem por ar. Restam Rodoviária (6) e Ponte do Guaíba (45). Vai **a pé** até a Arena (26), no meio da torcida, e não faz ação.
- Bilhete público: 🚶 *A pé*.
- Denúncia: Agl 4 → 30% + 6% = 36%. O servidor rola 52: **sem denúncia**.

**Detetives.** O último registro foi uma interceptação na rodada 9, zona Z5.
- Analista (no Palácio): *Interceptar* a Transmissão #3 (1 PA, 40% + 15% + 15% = 70%) → **sucesso**: "Nada de estrada desta vez" + zona Z5. O time descobre que o espião sabe que **não é terra**... mas é uma **Mensagem Falsa** que o espião plantou na rodada 9. O Dossiê marca 6 e 45 como eliminados, erroneamente.
- Agente Tático (em 29): *A pé* até 27 (1 PA; a viatura custaria 3 com o Gre-Nal), *Montar Bloqueio* no Aeroporto (2 PA) e *Investigar* (1 PA): nada.
- Perito (em 25): *A pé* até 24 (1 PA), *Investigar* (1 PA) → "esteve aqui na rodada 10, saiu **A pé**". *A pé* até 26 (1 PA, mas a viatura pagaria +1 pelo jogo). *Interrogar* (1 PA, Agl 4 permite) → "**Sim**, a até 2 conexões".
- Delegada: compra um **Drone** (4 créditos), que chega na próxima rodada.

**Fechamento.** Sem revelação programada. A tensão sobe: o Perito está **no mesmo local** que o espião, mas sem PA para Abordar. Na próxima rodada, o espião precisa sair da Arena, e o Perito vai ler o rastro.

---

## 13. Equilíbrio e parâmetros de ajuste

| Parâmetro | Valor | Efeito de aumentar |
|---|---|---|
| PA por detetive | 4 | Favorece os detetives (forte) |
| Revelações programadas | 3, 8, 13, 18, 23 | Mais revelações favorecem os detetives |
| Validade das transmissões | 4 rodadas | Favorece os detetives |
| Chance base de Interceptar | 40% | Favorece os detetives |
| Dinheiro inicial do espião | R$ 10 | Favorece o espião |
| Contatos no mapa | 8 de 12 | Mais contatos favorecem o espião (redundância) |
| Pistas ONDE necessárias | 4 (3 dão ≤2 opções) | — |
| Custo de Periciar+Confiscar | 3 PA | Mais barato favorece os detetives (forte) |
| Escala de Denúncia | 0/5/10/20/30/40% | Favorece os detetives |

**Ajustes por número de jogadores**

| Jogadores | Detetives | Ajuste |
|---|---|---|
| 3 | 4 (2 jogadores × 2 peões) | Cronômetro dos detetives 150 s |
| 4 | 4 (um jogador controla 2) | — |
| 5 | 4 | — |
| 6 | 5 (+ Investigadora de Rua) | Espião +R$ 4 e +1 Mensagem Falsa |

**Efeito do formato presencial:** como o espião ouve a mesa, e os detetives precisam digitar no celular o que é secreto, o time fica um pouco mais lento. Por isso o cronômetro padrão dos detetives é 120 s, e não 90 s. Se o espião vencer acima da meta nos testes, subir para 150 s ou dar +1 crédito por rodada ao time.

**Metas de telemetria:** taxa de vitória do espião entre 42% e 50%. Cerca de 70% das partidas devem chegar à janela C ou D. Uma Acusação de Plano correta deve encerrar no máximo 15% das partidas; se passar disso, subir o custo para 4 PA ou exigir 2 detetives no Palácio.

**Por que funciona:**

- O espião precisa **visitar contatos públicos**, então não pode ficar só escondido. Os detetives sabem *onde* vigiar, mas não *qual* contato importa.
- Cada pista recolhida **gera uma transmissão**, que é ao mesmo tempo o progresso do espião e uma migalha para os detetives.
- **Confiscar** dá aos detetives uma corrida paralela pela mesma informação. A redundância (3 de 4 pistas ONDE bastam para um palpite de 50%) evita que o espião fique sem saída.
- A **multidão** pune quem fica parado (denúncias) e protege no confronto (abordagens falham). Os eventos mudam onde está essa multidão.
- **Horário e transporte** criam um quebra-cabeça logístico: uma extração no Aeroporto às 2h exige App (rastreável) ou o Corujão L1 até o 30 e depois a pé.

---

## 14. Formato de jogo: tela compartilhada + celulares

Todos jogam **na mesma sala**. O PC (de preferência ligado a uma TV) mostra o **tabuleiro público**. Cada jogador usa o **próprio celular como controle e tela privada**.

### 14.1 A regra de ouro: a TV é pública, inclusive para o espião

O espião está na sala e olha a mesma TV. Por isso, cada informação do jogo pertence a uma de três camadas:

| Camada | Onde aparece | Conteúdo |
|---|---|---|
| **Pública** | TV + todos os celulares | Mapa, peões dos detetives, Aglomeração, relógio, eventos e agenda, Painel de Bilhetes, Trilha de Exposição, revelações, denúncias, alertas de câmera, Bloqueios e Cones, PA restantes, **existência** das transmissões na fila (nº, rodada, tipo, validade, "decodificada ✔"/"expirada"), resultados de *Investigar*, *Interrogar*, *Drone*, *Abordar* e *Quebra de Sigilo* |
| **Secreta do time** | só nos celulares dos detetives | **Conteúdo** de envelopes periciados e de transmissões decodificadas, **zona de origem** decodificada, **onde estão os Grampos**, itens no estoque e marcações do Dossiê, planejamento (rotas-fantasma), chat do time, Acusação em preparo |
| **Secreta do espião** | só no celular do espião | Posição e rota, pistas recolhidas, Caderno, dinheiro, credenciais, Mensagens Falsas plantadas, avisos privados ("Contato em X caiu") |

*Critério:* uma informação pode ir para a TV **se o espião já a conhece** (por exemplo: "o espião passou aqui na rodada 7", que é a própria rota dele) ou se ela é física e visível na cidade (um Bloqueio). Uma informação que **daria vantagem ao espião** (o conteúdo de um envelope que ele ainda não pegou, a localização de um Grampo) **nunca** vai para a TV.

> ⚠️ Isso vale também para a fala. **O espião ouve tudo o que é dito em voz alta na mesa**, como em todo jogo clássico de movimento oculto. Por isso, conteúdos secretos devem circular pelo celular (Dossiê e chat do time), e não em voz alta. Falar em voz alta vira arma: os detetives podem **blefar de propósito** ("vamos fechar a Zona Sul!") para manipular o espião.

### 14.2 Fluxo da sessão

1. **Abrir a sala**: o PC acessa o site e clica em *Criar mesa*. A TV mostra o **QR code** e um **código de 4 letras**.
2. **Entrar**: cada jogador lê o QR com o celular, escolhe um apelido e aparece na TV. Não é preciso instalar nada nem criar conta.
3. **Escolher lados**: o anfitrião (no PC ou no primeiro celular) define quem é o espião (sorteio ou voluntário). Os detetives escolhem papéis no celular e a TV mostra as escolhas.
4. **Preparação secreta**: o espião escolhe Perfil e posição inicial **no celular**. A TV mostra só *"O espião está se escondendo…"*.
5. **Partida**: a TV conduz as fases e cada celular mostra apenas o que aquele jogador pode fazer no momento.
6. **Fim**: a TV exibe o **replay** com a rota secreta do espião animada sobre o mapa, cruzada com a linha do tempo dos detetives. É o grande momento coletivo do pós-jogo.

### 14.3 O que cada tela mostra em cada fase

| Fase | TV (pública) | Celular do espião | Celulares dos detetives |
|---|---|---|---|
| Relógio / Evento | Animação da hora, carta de evento em destaque, mudança de Agl no mapa | Resumo do evento e do impacto na rota | Resumo do evento |
| **Turno do espião** | *"O espião está se movendo…"* (o tabuleiro fica escurecido); o cronômetro corre. Ao terminar, o **bilhete** cai no Painel com som | Mapa privado: escolhe transporte → os destinos possíveis acendem → confirma → escolhe a ação. Mostra a **chance de Denúncia** de cada destino | Dossiê e chat do time liberados para discutir em silêncio |
| Testes de risco | Denúncia ou câmera: alerta grande + zona ou local piscando | "Você foi visto!" / "Passou despercebido" | Notificação |
| **Turno dos detetives** | Peões se movem em tempo real, PA de cada detetive, cronômetro, resultados públicos (rastros, sim/não, abordagens) | Assiste (pode mexer no Caderno) | Menu de ações do próprio detetive + Dossiê + chat; rotas-fantasma visíveis só para o time |
| Fechamento | Revelação programada com animação de "foto de câmera", transmissões expirando | — | Resumo da rodada |
| Hora H | Sirene, posição revelada, contagem regressiva do último turno | "Aguente firme!" | Tela de perseguição |

### 14.4 Controles no celular

O celular é usado **em pé, com uma mão**, botões grandes (mínimo 48 px) e no máximo 2 toques para a ação mais comum.

**Detetive**, com 4 abas:

- **Ações**: card do detetive (papel, PA ●●●○). Embaixo, só as ações **possíveis agora**, com custo em PA. Ao tocar em *Mover*, abre um **mini-mapa** centrado no peão, com destinos alcançáveis destacados e uma lista com os nomes ("Redenção · 1 PA a pé · 2 PA viatura"). Ações destrutivas (Acusação, Confiscar) pedem confirmação.
- **Dossiê**: grade 6 locais × 4 janelas, onde cada um marca ✗/?/✓ e as marcações aparecem para o time todo. Lista de pistas obtidas, com origem (periciada/interceptada) e alerta "⚠️ autenticidade duvidosa".
- **Equipe**: chat do time com atalhos ("Vou para 13", "Intercepta a #4!", "Cuidado: possível falsa"). Ao tocar e segurar um local no mini-mapa, um **ping** aparece nos celulares do time.
- **Itens**: loja (Orçamento do time) e estoque.

**Espião**, com 4 abas: **Mover** (transporte → destino → ação), **Caderno** (o mesmo quadro de dedução, só dele), **Inventário** (R$, credenciais, disfarce ativo) e **Contatos** (pontos de contato e status conhecido).

**Modo discreto** (sempre ativo no celular do espião):

- Fundo escuro, sem cores chamativas e brilho reduzido: o reflexo da tela não denuncia nada.
- A posição atual **só aparece enquanto o dedo segura** o botão "👁 Onde estou?" e some ao soltar.
- **Sem vibração nem som** em avisos privados, porque uma vibração na hora errada entrega que algo aconteceu.
- Ao bloquear a tela ou trocar de app, volta para uma tela neutra.
- Recomendação de mesa: o espião senta **de frente para a TV e de costas para a parede**, longe dos detetives.

### 14.5 Layout da TV (1920 × 1080, legível a 3 m)

```
┌──────────────────────────────────────────────────────────────┬────────────────┐
│                                                              │  🕐 16h · R11  │
│                                                              │  EVENTO ATUAL  │
│                      MAPA DE PORTO ALEGRE                    │  [Gre-Nal ⏳2] │
│         (zonas coloridas + padrões, Agl por local,           │  AGENDA        │
│          peões dos detetives, bloqueios, contatos)           │  FILA DE       │
│                                                              │  INTERCEPTAÇÃO │
│                                                              │  #3 ✔ #4 ⏳2   │
├──────────────────────────────────────────────────────────────┴────────────────┤
│ EXPOSIÇÃO ▓▓▓░░░░░░░ 3   │ DETETIVES: Delegada ●●○○ Perito ●○○○ Analista …    │
│ BILHETES  🚶 🚌 🚆 🕳️ 🚶 🚗 📍 🚶 ⛴️ 🚶 🚶 ▢ ▢ 📍 ▢ ▢ ▢ ▢ 📍 ▢ ▢ ▢ ▢ 📍 ▢          │
└───────────────────────────────────────────────────────────────────────────────┘
```

- Texto com no mínimo 28 px. Nomes de locais abreviados no mapa ("Mercado", "Redenção") e completos ao destacar.
- Zonas com **cor + padrão** (acessível para daltônicos); Agl como "gotas" de 0 a 5 ao lado de cada local.
- Animações curtas (≤ 1,5 s), que não seguram o jogo.
- A TV **não aceita comandos de jogo**; serve só para exibir, pausar e configurar. Assim ninguém precisa encostar no PC durante a partida.

### 14.6 Regras de mesa (presencial)

- Ninguém olha o celular de outro jogador. O jogo ajuda: o espião tem o modo discreto, e as telas dos detetives não mostram nada que o time todo já não possa ver.
- O que é falado em voz alta é público. O que é digitado no time é secreto.
- Cronômetros são exibidos na TV. Se acabarem, os PA restantes são perdidos (detetives) ou o espião fica onde está; se não puder ficar, anda a pé para o destino válido de menor risco.
- Variante **"sala de guerra"**: o espião joga de outro cômodo ou remotamente. O sistema é o mesmo; os detetives podem conversar livremente em voz alta.

### 14.7 Arquitetura técnica

Reaproveita a base do repositório (React + Vite, função Node na Vercel, Supabase), com o mesmo modelo seguro já usado no Patifaria:

- **Servidor autoritativo**: o estado completo (rota, envelopes, plano, grampos) existe só no servidor. Toda ação é validada ali; o motor de regras não é enviado ao navegador.
- **Projeções por token**: cada cliente se autentica com um token aleatório (o banco guarda só o hash) e recebe uma **projeção** do estado:
  - `view(tv)`: só a camada pública;
  - `view(detetive)`: pública + secreta do time;
  - `view(espiao)`: pública + secreta do espião.

  A TV é um cliente "espectador", sem token de jogador. Nenhuma projeção carrega dado de outra camada, nem cifrado ou escondido por CSS.
- **Sincronização**: polling da projeção a cada ~1 s (como no Patifaria), compare-and-swap por revisão e IDs de ação para deduplicação. A TV interpola as animações entre revisões. Reconectar é só reabrir o link no celular: a sessão fica salva no aparelho.
- **Tempo**: cronômetros com prazo absoluto definido pelo servidor.
- **RNG no servidor**, com semente gravada por partida para replay e auditoria.
- **Máquina de estados**: `LOBBY → SETUP → [RELOGIO → EVENTO → ESPIAO → DETETIVES → FECHAMENTO]×24 → FIM`.
- **Log de ações** imutável, usado pelo replay final.
- **IA**: preenche peões de detetive sem dono (3 jogadores) e permite o modo solo. O espião-IA maximiza a incerteza dos detetives; a IA dos detetives escolhe ações que reduzem o conjunto de posições possíveis.
- **Dados**: o mapa está em [`mapa.json`](./mapa.json) (locais, etiquetas, ruas, linhas, horários).

---

## 15. Glossário rápido

- **Agl**: Aglomeração efetiva de um local (0–5).
- **Bilhete**: registro público do modo de transporte do espião em cada rodada.
- **Dossiê**: quadro de dedução dos detetives.
- **Hora H**: declaração de extração; revela o espião por uma rodada final.
- **PA**: Pontos de Ação dos detetives (4 por rodada).
- **Rastro**: histórico de passagem do espião por um local, lido com *Investigar*.
- **Transmissão**: mensagem cifrada gerada a cada pista recolhida; pode ser interceptada.

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

O tabuleiro é um **mapa próprio**, desenhado a partir da posição real de 105 lugares de Porto Alegre: pontos turísticos, parques, estádios, shoppings, terminais, estações e bairros. Cada local tem um **território** (a área da cidade mais próxima dele), colorido pelo **tipo de bairro**. O mapa é gerado por `gerar_mapa.py`, que produz `mapa.json` (regras) e `mapa-arte.json` (desenho: terra, territórios, quarteirões, árvores e rodovias). A prévia da TV está em `tabuleiro-tv.html`.

### 4.1 Escala e distâncias

- **105 locais** ligados por **220 ligações a pé**. Uma ligação mede em média **1.6 km** (de 0,4 km no Centro a 4.7 km no Extremo Sul).
- As ligações são geradas automaticamente entre vizinhos naturais (grafo de Gabriel), **sem atravessar o Guaíba**. As ilhas só se ligam por ponte ou barco.
- Atravessar a cidade é lento: o maior trajeto a pé tem **20 ligações**. Saindo do Mercado Público:

| Destino | Ligações a pé | Rodadas a pé (2 por rodada) |
|---|---|---|
| Aeroporto | 5 | 3 |
| Arena | 5 | 3 |
| Beira-Rio | 5 | 3 |
| Restinga | 9 | 5 |
| Belém Novo | 13 | 7 |
| Lami | 15 | 8 |
| Rubem Berta | 9 | 5 |

Ônibus, Trensurb e aplicativo encurtam essas distâncias, mas custam dinheiro e deixam bilhete público.

### 4.2 Tipos de bairro

Cada local tem um tipo. O tipo muda o risco e as ações ali (detalhes em §7.4).

| Tipo | Locais |
|---|---|
| **Comercial / Centro** | Mercado Público, Alfândega, Casa de Cultura, Matriz, Rodoviária, Praia de Belas, Azenha, Palácio da Polícia, Bourbon Ipiranga, Aeroporto, Passo d'Areia, Bourbon Wallig, BarraShopping |
| **Boêmio** | Embarcadero, Cidade Baixa, Bom Fim |
| **Bairro nobre** | Padre Chagas, Parcão, Mont'Serrat, Bela Vista, Auxiliadora, Três Figueiras, Iguatemi, Chácara das Pedras, Boa Vista, Vila Assunção, Pedra Redonda |
| **Residencial** | Floresta, Menino Deus, Medianeira, Independência, Petrópolis, Partenon, São José, Jardim Carvalho, São João, Cristo Redentor, Lindóia, Sarandi, Passo das Pedras, Jardim Itu, Cristal, Glória, Teresópolis, Nonoai, Cascata, Tristeza, Cavalhada, Vila Nova, Guarujá, Hípica, Santana, Aparício Borges, Vila Ipiranga, Maria Goretti, Parque Santa Fé, Costa e Silva, Jardim Isabel, Campo Novo |
| **Universitário / Hospitalar** | UFRGS, Clínicas, PUCRS, Campus do Vale |
| **Industrial / Logístico** | Navegantes, São Pedro, Ponte do Guaíba, Farrapos, Humaitá, Ceasa, Anchieta |
| **Zona quente** | Vila Cruzeiro, Bom Jesus, Lomba do Pinheiro, Rubem Berta, Mário Quintana, Restinga |
| **Parque / Orla** | Cais Mauá, Gasômetro, Harmonia, Pôr do Sol, Parque Marinha, Beira-Rio, Morro Santa Tereza, Redenção, Jardim Botânico, Morro Santana, Arena, Porto Seco, Iberê Camargo, Hipódromo, Morro da Polícia, Morro do Osso, Ipanema, Reserva do Lami |
| **Rural / Extremo Sul** | Belém Velho, Serraria, Ponta Grossa, Belém Novo, Chapéu do Sol, Lageado, Lami, Extrema |
| **Ilhas** | Ilha dos Marinheiros, Ilha da Pintada, Ilha das Flores |

> A "zona quente" é uma regra de jogo (pouca presença policial, moradores que não falam com a polícia), não um retrato dos moradores. Os locais marcados podem ser trocados em `gerar_mapa.py` sem mudar nenhuma outra regra.

### 4.3 Locais por zona

Lotação base (Agl) de 0 a 5. Etiquetas: extração, contato (candidato a Ponto de Contato), câmera, caixa eletrônico, loja (disfarce), esconderijo, base policial, antenas (interceptar), Trensurb, barco, bike, turístico, terminal de ônibus.

**Centro Histórico**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 1 | Mercado Público / Largo Glênio Peres | Comercial / Centro | 4 | Trensurb, terminal, câmera, turístico, bike, contato de emergência |
| 2 | Praça da Alfândega / Rua da Praia | Comercial / Centro | 3 | contato, câmera, turístico, bike |
| 3 | Cais Mauá | Parque / Orla | 2 | **extração (água)**, barco, turístico |
| 4 | Casa de Cultura Mario Quintana | Comercial / Centro | 2 | contato, turístico, bike |
| 5 | Cais Embarcadero | Boêmio | 2 | barco, turístico |
| 6 | Usina do Gasômetro | Parque / Orla | 3 | turístico, bike |
| 7 | Praça da Matriz / Catedral / Theatro São Pedro | Comercial / Centro | 2 | turístico, bike |
| 8 | Estação Rodoviária | Comercial / Centro | 4 | **extração (terra)**, Trensurb, terminal, câmera, caixa |
| 9 | Floresta / Av. Cristóvão Colombo | Residencial | 2 | bike |


**Cidade Baixa e Menino Deus**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 10 | Cidade Baixa / Rua da República | Boêmio | 3 | contato, bike, noite +1 |
| 11 | Parque Harmonia | Parque / Orla | 1 | parque, esconderijo |
| 12 | Orla do Guaíba / Anfiteatro Pôr do Sol | Parque / Orla | 2 | turístico, bike |
| 13 | Shopping Praia de Belas | Comercial / Centro | 3 | câmera, caixa, loja, bike |
| 14 | Parque Marinha do Brasil | Parque / Orla | 1 | parque, esconderijo, bike |
| 15 | Estádio Beira-Rio | Parque / Orla | 1 | estádio, turístico, bike |
| 16 | Menino Deus / Av. Getúlio Vargas | Residencial | 2 | contato, bike |
| 17 | Azenha / Av. da Azenha | Comercial / Centro | 2 | bike |
| 18 | Palácio da Polícia | Comercial / Centro | 2 | base policial |
| 19 | Medianeira / Santo Antônio | Residencial | 2 | — |
| 20 | Vila Cruzeiro / Santa Tereza | Zona quente | 2 | esconderijo |
| 21 | Morro Santa Tereza (torres de TV) | Parque / Orla | 0 | antenas, esconderijo, morro |
| 95 | Santana / Av. Ipiranga | Residencial | 2 | bike |


**Bom Fim e Farroupilha**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 22 | Parque da Redenção / Brique / Araújo Vianna | Parque / Orla | 3 | contato, parque, turístico, bike |
| 23 | UFRGS – Campus Centro | Universitário / Hospitalar | 2 | bike |
| 24 | Bom Fim / Av. Osvaldo Aranha | Boêmio | 2 | bike, noite +1 |
| 25 | Hospital de Clínicas / Santa Cecília | Universitário / Hospitalar | 3 | — |
| 26 | Av. Independência | Residencial | 2 | bike |


**Moinhos e bairros nobres**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 27 | Rua Padre Chagas | Bairro nobre | 2 | contato, bike, noite +1 |
| 28 | Parcão / Shopping Moinhos | Bairro nobre | 2 | parque, loja, caixa, bike |
| 29 | Mont'Serrat | Bairro nobre | 1 | — |
| 30 | Bela Vista / Praça da Encol | Bairro nobre | 1 | contato, bike |
| 31 | Petrópolis / Av. Protásio Alves | Residencial | 2 | bike |
| 32 | Auxiliadora / Av. Plínio Brasil Milano | Bairro nobre | 2 | — |
| 33 | Três Figueiras | Bairro nobre | 1 | — |
| 34 | Shopping Iguatemi | Bairro nobre | 3 | câmera, caixa, loja |
| 35 | Chácara das Pedras | Bairro nobre | 1 | — |
| 36 | Boa Vista / Country Club | Bairro nobre | 1 | — |


**Zona Norte**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 47 | Igreja dos Navegantes / Av. Farrapos | Industrial / Logístico | 2 | turístico |
| 48 | Estação São Pedro | Industrial / Logístico | 2 | Trensurb |
| 49 | Ponte do Guaíba (Travessia Régis Bittencourt) | Industrial / Logístico | 1 | **extração (terra)** |
| 50 | Estação Farrapos | Industrial / Logístico | 2 | Trensurb |
| 51 | Humaitá | Industrial / Logístico | 1 | esconderijo |
| 52 | Arena do Grêmio | Parque / Orla | 1 | estádio, turístico |
| 53 | São João / Higienópolis | Residencial | 2 | — |
| 54 | Aeroporto Salgado Filho | Comercial / Centro | 3 | **extração (ar)**, Trensurb, câmera, caixa |
| 55 | Anchieta / Ceasa | Industrial / Logístico | 1 | contato, Trensurb, madrugada +2 |
| 56 | Passo d'Areia / Av. Assis Brasil | Comercial / Centro | 3 | terminal |
| 57 | Bourbon Wallig | Comercial / Centro | 3 | câmera, caixa, loja |
| 58 | Cristo Redentor | Residencial | 2 | — |
| 59 | Jardim Lindóia | Residencial | 1 | — |
| 60 | Sarandi | Residencial | 2 | — |
| 61 | Passo das Pedras | Residencial | 2 | — |
| 62 | Complexo Cultural do Porto Seco | Parque / Orla | 0 | esconderijo |
| 63 | Rubem Berta | Zona quente | 2 | esconderijo, terminal |
| 64 | Jardim Itu-Sabará | Residencial | 2 | — |
| 65 | Mário Quintana | Zona quente | 2 | esconderijo |
| 97 | Vila Ipiranga | Residencial | 2 | — |
| 98 | Santa Maria Goretti | Residencial | 2 | — |
| 99 | Anchieta (distrito industrial) | Industrial / Logístico | 1 | esconderijo |
| 100 | Parque Santa Fé | Residencial | 2 | — |
| 101 | Costa e Silva | Residencial | 2 | — |


**Zona Leste**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 37 | Jardim Botânico | Parque / Orla | 1 | contato, parque, turístico |
| 38 | Bourbon Ipiranga / Av. Ipiranga | Comercial / Centro | 2 | câmera, caixa, loja |
| 39 | PUCRS | Universitário / Hospitalar | 3 | contato |
| 40 | Partenon / Av. Bento Gonçalves | Residencial | 2 | — |
| 41 | São José | Residencial | 2 | — |
| 42 | Vila Bom Jesus | Zona quente | 2 | esconderijo |
| 43 | Jardim Carvalho / Protásio Alves | Residencial | 2 | — |
| 44 | Morro Santana | Parque / Orla | 0 | esconderijo, morro |
| 45 | Agronomia / UFRGS Campus do Vale | Universitário / Hospitalar | 1 | — |
| 46 | Lomba do Pinheiro | Zona quente | 2 | esconderijo |
| 96 | Coronel Aparício Borges | Residencial | 2 | — |


**Zona Sul**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 69 | Fundação Iberê Camargo | Parque / Orla | 1 | contato, turístico |
| 70 | BarraShoppingSul | Comercial / Centro | 3 | câmera, caixa, loja |
| 71 | Cristal / Av. Diário de Notícias | Residencial | 2 | — |
| 72 | Hipódromo do Cristal | Parque / Orla | 1 | esconderijo |
| 73 | Glória / Av. Oscar Pereira | Residencial | 2 | — |
| 74 | Teresópolis | Residencial | 2 | — |
| 75 | Morro da Polícia | Parque / Orla | 0 | esconderijo, antenas, morro |
| 76 | Nonoai | Residencial | 2 | — |
| 77 | Cascata | Residencial | 1 | — |
| 78 | Vila Assunção | Bairro nobre | 1 | — |
| 79 | Tristeza / Av. Wenceslau Escobar | Residencial | 2 | contato |
| 80 | Cavalhada | Residencial | 2 | — |
| 81 | Morro do Osso | Parque / Orla | 0 | esconderijo, morro |
| 82 | Orla de Ipanema | Parque / Orla | 2 | barco, turístico |
| 83 | Vila Nova | Residencial | 1 | — |
| 84 | Belém Velho | Rural / Extremo Sul | 1 | — |
| 85 | Espírito Santo / Guarujá | Residencial | 1 | — |
| 86 | Hípica / Aberta dos Morros | Residencial | 1 | — |
| 87 | Restinga | Zona quente | 3 | esconderijo, terminal |
| 102 | Pedra Redonda | Bairro nobre | 1 | — |
| 103 | Jardim Isabel | Residencial | 1 | — |
| 104 | Campo Novo | Residencial | 1 | — |


**Extremo Sul**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 88 | Serraria | Rural / Extremo Sul | 1 | — |
| 89 | Ponta Grossa | Rural / Extremo Sul | 0 | esconderijo |
| 90 | Píer de Belém Novo | Rural / Extremo Sul | 1 | **extração (água)**, barco |
| 91 | Chapéu do Sol | Rural / Extremo Sul | 1 | — |
| 92 | Lageado | Rural / Extremo Sul | 0 | esconderijo |
| 93 | Lami | Rural / Extremo Sul | 1 | — |
| 94 | Reserva Biológica do Lami | Parque / Orla | 0 | contato, esconderijo |
| 105 | Extrema | Rural / Extremo Sul | 0 | esconderijo |


**Ilhas**

| # | Local | Tipo | Agl | Etiquetas |
|---|---|---|---|---|
| 66 | Ilha Grande dos Marinheiros | Ilhas | 1 | contato, esconderijo, barco |
| 67 | Ilha da Pintada | Ilhas | 1 | **extração (água)**, barco |
| 68 | Ilha das Flores | Ilhas | 0 | esconderijo |

### 4.4 Transporte

Todos os bairros têm ônibus, exceto os morros e alguns pontos do Centro que se alcançam a pé.

**Trensurb** (opera 06h–23h, rodadas 1–18): Mercado Público → Rodoviária → São Pedro → Farrapos → Aeroporto → Ceasa

**Ônibus** (operam 06h–23h; as linhas 🌙 também rodam de madrugada, rodadas 19–23). Cada linha corre pela avenida principal do corredor:

| Linha | Corredor | Paradas |
|---|---|---|
| L1 🌙 | Assis Brasil | Mercado Público → Rodoviária → Floresta → São João → Passo d'Areia → Bourbon Wallig → Cristo Redentor → Sarandi → Passo das Pedras → Rubem Berta |
| L2 | Protásio Alves | Mercado Público → UFRGS → Bom Fim → Bela Vista → Petrópolis → Três Figueiras → Chácara das Pedras → Bom Jesus → Jardim Carvalho → Mário Quintana |
| L3 🌙 | Bento Gonçalves | Mercado Público → Matriz → Redenção → Clínicas → Partenon → PUCRS → São José → Campus do Vale → Lomba do Pinheiro |
| L4 | Ipiranga | Praia de Belas → Menino Deus → Palácio da Polícia → Santana → Bourbon Ipiranga → PUCRS → São José → Jardim Carvalho |
| L5 🌙 | Zona Sul / Orla | Mercado Público → Gasômetro → Pôr do Sol → Parque Marinha → Beira-Rio → Iberê Camargo → BarraShopping → Hipódromo → Vila Assunção → Tristeza → Pedra Redonda → Ipanema → Guarujá → Serraria → Belém Novo |
| L6 | Cavalhada / Restinga | Mercado Público → Cidade Baixa → Azenha → Medianeira → Vila Cruzeiro → Teresópolis → Nonoai → Cavalhada → Vila Nova → Hípica → Restinga |
| L7 | Farrapos / Arena | Mercado Público → Rodoviária → São Pedro → Navegantes → Farrapos → Humaitá → Arena → Anchieta → Ceasa |
| L8 | Independência / Moinhos | Matriz → Independência → Padre Chagas → Parcão → Mont'Serrat → Auxiliadora → São João → Maria Goretti → Anchieta |
| L9 | Oscar Pereira / Belém Velho | Azenha → Glória → Cascata → Belém Velho → Restinga |
| L10 | Lotação Extremo Sul | Restinga → Chapéu do Sol → Belém Novo → Lageado → Extrema → Lami → Reserva do Lami |
| L11 | Nilo Peçanha / Sertório | Iguatemi → Boa Vista → Vila Ipiranga → Lindóia → Aeroporto → Sarandi → Parque Santa Fé → Porto Seco |
| L12 🌙 | III Perimetral | Aeroporto → Passo d'Areia → Boa Vista → Iguatemi → Três Figueiras → Jardim Botânico → Aparício Borges → Glória → Teresópolis → Cristal → BarraShopping |
| L13 | Ilhas | Mercado Público → Rodoviária → Navegantes → Ponte do Guaíba → Ilha dos Marinheiros → Ilha das Flores → Ilha da Pintada |
| L14 | Transversal Norte | Passo d'Areia → Vila Ipiranga → Jardim Itu → Costa e Silva → Mário Quintana |
| L15 | Juca Batista | Cavalhada → Vila Nova → Jardim Isabel → Campo Novo → Serraria → Ponta Grossa → Belém Novo |
| L16 | Lomba / Restinga | Campus do Vale → Lomba do Pinheiro → Belém Velho → Restinga |

**Barco** (07h–21h, rodadas 2–16): Cais Mauá ↔ Ilha da Pintada · Embarcadero ↔ Ilha da Pintada · Embarcadero ↔ Ipanema · Ipanema ↔ Belém Novo · Ilha dos Marinheiros ↔ Ilha da Pintada · Cais Mauá ↔ Ilha das Flores

**Bike compartilhada** (06h–23h, só na região central e na orla): estações em Mercado Público, Alfândega, Casa de Cultura, Gasômetro, Matriz, Floresta, Cidade Baixa, Pôr do Sol, Praia de Belas, Parque Marinha, Beira-Rio, Menino Deus, Azenha, Redenção, UFRGS, Bom Fim, Independência, Padre Chagas, Parcão, Bela Vista, Petrópolis, Santana.

**Rodovias desenhadas no mapa**: Av. Castelo Branco/Freeway (saída norte) e BR-290 pela Ponte do Guaíba e pelas ilhas. Servem de referência visual e para viaturas.

A lista completa de ligações a pé está em `mapa.json` (`conexoes.a_pe`).

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
| Rush da manhã | 2–4 (07h–09h) | Centro e estações Trensurb **+1 Agl**; viatura no Centro e na Zona Norte custa **+1 PA** |
| Dia | 5–11 | sem modificador |
| Rush da tarde / pôr do sol | 12–14 (17h–19h) | igual ao rush da manhã; Gasômetro e Harmonia **+1 Agl** |
| Noite | 15–18 (20h–23h) | Cidade Baixa e Padre Chagas **+1 Agl**; parques **−1 Agl** |
| Madrugada | 19–24 (00h–05h) | **todos −2 Agl**, exceto Cidade Baixa (−0), Rodoviária e Aeroporto (−1) e **Ceasa (+2)**. Trensurb, barcos, BikePOA e ônibus comuns fechados; só as linhas de madrugada (L1, L3, L5, L12) até a rodada 23 |

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
| **A pé** | até 3 ligações | grátis | 🚶 A pé | — |
| **Bike** | até 4 ligações, de uma estação de bike a outra | R$ 1 | 🚲 Bike | Só na região central (Centro, Cidade Baixa, Bom Fim, Moinhos), rodadas 1–18 |
| **Ônibus** | até 5 paradas na mesma linha | R$ 1 | 🚌 Ônibus | Precisa começar numa parada da linha; horários de operação; a linha usada não é mostrada |
| **Trensurb** | qualquer número de estações | R$ 1 | 🚆 Trensurb | Rodadas 1–18 |
| **Aplicativo** | qualquer local a até 4 ligações | R$ 3 (R$ 6 se sair ou chegar no Extremo Sul) | 🚗 App | Deixa registro digital (ver *Quebra de Sigilo*) |
| **Barco** | 1 travessia | R$ 2 | ⛴️ Barco | Rodadas 2–16; bloqueado por *Chuva Forte* e *Minuano* |
| **Esconder-se** | permanece no local | grátis | 🕳️ Escondido | Só em local com esconderijo ou Agl efetiva ≤ 1; máx. 2 rodadas seguidas |

Andando até 3 ligações (cerca de 2 a 5 km) por rodada, o espião cruza o Centro numa hora, mas leva o dia inteiro para ir do Mercado ao Lami. Para longas distâncias ele precisa de transporte, que custa dinheiro e aparece no Painel de Bilhetes.

**Regras de movimento:**

- O espião **não pode terminar** o movimento em um local ocupado por um detetive.
- Ele **pode passar** por um local com detetive dentro de um veículo (ônibus, Trensurb, App, Barco), **exceto** se esse detetive tiver montado um **Bloqueio** ali.
- A pé ou de bike, ele **não pode atravessar** locais com detetives (o caminho de 2 ligações precisa passar por um local livre).
- Se o espião não tiver nenhum movimento legal e não puder se esconder, está **Encurralado** → capturado.
- Sem dinheiro, só resta andar a pé ou se esconder.

### 6.3 Ações do espião (1 por rodada, após mover)

| Ação | Onde | Custo | Efeito |
|---|---|---|---|
| **Recolher Pista** | Ponto de Contato não recolhido | Exposição +1 | Recebe o conteúdo da pista e gera uma **Transmissão** na Fila de Interceptação |
| **Trocar Disfarce** | local `LOJ` | R$ 2 | Exposição −2; ignora a próxima Denúncia ou alerta de câmera; teste de Denúncia ×0,5 por 3 rodadas |
| **Sacar Dinheiro** | local `ATM` | Exposição +1 | +R$ 4; na Fase 4 da próxima rodada, a **zona** desse saque é revelada (alerta bancário) |
| **Mensagem Falsa** | qualquer | R$ 2 | Coloca uma transmissão falsa na fila (máx. 2 por partida) |
| **Pagar Informante** | local com Agl ≥ 2 | R$ 2 | Descobre Grampos e Bloqueios a até 2 ligações |
| **Contato de Emergência** | Mercado Público | Exposição +3 | Obtém 1 Credencial; a zona é revelada imediatamente. Só se não houver mais credenciais disponíveis no mapa |
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

### 7.4 Efeitos do tipo de bairro

| Tipo | Efeito no jogo |
|---|---|
| Comercial / Centro | +1 Agl de dia (rodadas 2–12), −1 extra de madrugada. Câmeras e caixas eletrônicos frequentes |
| Boêmio | +1 Agl à noite (rodadas 15–20). Bom para se misturar: Disfarce dura 1 rodada a mais |
| Bairro nobre | Câmeras de prédio: alerta de câmera +15% mesmo sem etiqueta de câmera. Disfarce custa +R$ 1. Denúncia de transeunte −5% (pouca gente na rua) |
| Residencial | Sem modificador |
| Universitário / Hospitalar | +1 Agl de dia, −1 à noite |
| Industrial / Logístico | −1 Agl à noite; todos os locais industriais contam como esconderijo à noite |
| Zona quente | Denúncia ×0,5 e *Interrogar* não funciona. Viatura gasta +1 PA para entrar. Ao terminar o turno ali, o espião tem 15% de chance de ser assaltado (perde R$ 2) |
| Parque / Orla | Lota em eventos e no pôr do sol; à noite (rodadas 15+) conta como esconderijo |
| Rural / Extremo Sul | Ligações longas. App custa o dobro. Sem câmeras |
| Ilhas | Só se entra e sai por ponte ou barco. Bloquear a ponte isola as ilhas por terra |

## 8. Pistas, Credenciais e Extração

### 8.1 Preparação secreta (servidor)

1. Sorteia o **Ponto de Extração** entre 6: Cais Mauá (água), Rodoviária (terra), Aeroporto (ar), Píer de Belém Novo (água), Ilha da Pintada (água), Ponte do Guaíba (terra).
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
| **Agente Tático** | *Abordar* custa 1 PA e ignora 1 nível de Agl. Viatura alcança 5 ligações. | *Interceptar* custa 3 PA. |
| **Investigadora de Rua** *(só com 6 jogadores)* | *Interrogar* grátis 1×/rodada, com alcance 3. Um *Retrato Falado* grátis por partida. | — |

### 9.2 Tabela de Pontos de Ação (4 PA por detetive)

**Movimento**

| Ação | PA | Efeito |
|---|---|---|
| A pé | 1 | 1 ligação |
| Viatura | 2 | até 3 ligações, 1 vez por rodada (+1 PA no rush no Centro e na Zona Norte, e para entrar em zona quente; eventos de trânsito podem bloquear) |
| Transporte público | 1 | até 5 paradas de ônibus ou qualquer trecho de Trensurb, respeitando horários |
| Barco (Patrulha Fluvial) | 2 | 1 travessia de barco (precisa do item *Lancha* ativo; ignora horário) |

**Investigação**

| Ação | PA | Efeito |
|---|---|---|
| **Investigar Local** | 1 | Se o espião passou ali nas últimas 8 rodadas: revela **em qual rodada**, **o bilhete com que saiu** e se fez alguma ação (ex.: "um envelope foi recolhido aqui"). 1× por local por rodada |
| **Interrogar Testemunhas** | 1 | Só com Agl ≥ 2. Responde: "o espião está a até 2 ligações daqui **agora**?" (sim/não) |
| **Periciar Contato** | 2 | Num Ponto de Contato **ainda fechado**: o time lê o envelope (vai ao Dossiê). O envelope continua lá |
| **Confiscar Contato** | +1 (após Periciar) | Remove o envelope do jogo. O espião recebe a mensagem privada "Contato em [local] caiu" |
| **Interceptar Transmissão** | 2 | Só no Palácio da Polícia, nos morros com antenas (Morro da Polícia, Morro Santa Tereza) ou com *Escuta Móvel*. Escolhe uma transmissão da fila. Chance = **40%** + 15% por tentativa anterior falha nessa transmissão + bônus. Sucesso: conteúdo + zona de origem; **+2 créditos** |

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
| **Lancha da Patrulha Fluvial** | 3 | Nesta rodada, o time usa as travessias de barco (2 PA) |
| **Helicóptero Águia** | 6 | Uso único: um detetive vai a qualquer local por 0 PA. Proibido com *Chuva Forte* |

### 9.4 Posições iniciais

Um detetive começa no **Palácio da Polícia**. Os outros escolhem entre **Mercado Público**, **Redenção**, **Aeroporto**, **BarraShopping**, **Iguatemi** e **Passo d'Areia**, um por local. Depois o espião escolhe o ponto de partida (§6.1).

---

## 10. Eventos Dinâmicos

Todas as cartas estão em `cartas.json`, gerado por `gerar_cartas.py`. Cada efeito é um objeto com `tipo` (um dos tipos listados em `efeitos`, que o motor do jogo implementa) e os locais pelos ids do `mapa.json`. O script falha se um local, zona, linha ou tipo de efeito não existir, e se alguma zona do mapa ficar sem evento. A página `cartas.html` mostra todas as cartas desenhadas.

### 10.1 Eventos agendados (13 cartas; 4 por partida, agenda pública)

Cartas com o mesmo grupo (os dois Gre-Nais) não saem na mesma partida.

| Evento | Horário | O que muda |
|---|---|---|
| **Gre-Nal na Arena** | 15h–18h | Clássico em Humaitá. A Zona Norte para. |
| **Gre-Nal no Beira-Rio** | 15h–18h | Clássico na beira do Guaíba. A orla vira um mar de gente. |
| **Show no Anfiteatro Pôr do Sol** | 17h–20h | Show gratuito na orla, bem na hora do pôr do sol. |
| **Feira do Livro** | 09h–18h | Barracas de livros tomam a Praça da Alfândega. |
| **Brique da Redenção** | 08h–14h | Domingo de Brique: antiguidades, artesanato e chimarrão. |
| **Acampamento Farroupilha** | 13h–22h | Piquetes, cavalos e churrasco no Parque Harmonia. |
| **Carnaval no Porto Seco** | 00h–05h | Desfile das escolas de samba vara a madrugada. |
| **Procissão de Navegantes** | 10h–14h | A procissão fluvial e a romaria tomam a Zona Norte. |
| **Maratona de Porto Alegre** | 06h–10h | Corredores ocupam a orla desde cedo. |
| **Festival de Verão em Ipanema** | 17h–22h | Palco na areia e a orla da Zona Sul lotada. |
| **Grande Prêmio no Hipódromo** | 14h–19h | O páreo mais importante do ano no Cristal. |
| **Dia de Vestibular** | 12h–17h | Milhares de candidatos nos campi da UFRGS e da PUCRS. |
| **Parada Livre** | 14h–20h | A parada colorida sai da Redenção e segue pelo Bom Fim. |

### 10.2 Baralho aleatório (53 cartas, 42 diferentes)

Uma carta por rodada a partir da rodada 2. Cartas com horário válido que saem fora dele são descartadas e substituídas.

| Categoria | Evento | Cópias | Duração | O que muda |
|---|---|---|---|---|
| Trânsito | **Engarrafamento na III Perimetral** | 2 | 2 rodadas | Tudo parado entre o Aeroporto e o Cristal. |
| Trânsito | **Freeway parada** | 1 | 2 rodadas | Acidente na saída da cidade. A ponte trava. |
| Trânsito | **Vão móvel da ponte içado** | 1 | 1 rodada | A ponte do Guaíba levanta para um navio passar. |
| Trânsito | **Greve de ônibus** | 1 | 3 rodadas | Rodoviários cruzam os braços. Estações do trem lotam. |
| Trânsito | **Pane no Trensurb** | 1 | 2 rodadas | Trens parados entre o Mercado e o Aeroporto. |
| Trânsito | **Obras na Av. Bento Gonçalves** | 1 | 2 rodadas | Desvio na Bento. A linha L3 não passa do Partenon. |
| Trânsito | **Acidente na Av. Assis Brasil** | 1 | 2 rodadas | Corredor de ônibus interditado na Zona Norte. |
| Trânsito | **Blitz da EPTC** | 2 | 2 rodadas | Fiscalização em todas as saídas. Motoristas de app desconfiados. |
| Clima | **Chuva forte** | 2 | 2 rodadas | Temporal sobre a cidade. As ruas esvaziam. |
| Clima | **Alagamento no Centro** | 1 | 3 rodadas | O Guaíba sobe e invade o Centro Histórico. |
| Clima | **Cheia nas Ilhas** | 1 | 3 rodadas | As ilhas do Delta ficam isoladas pela água. |
| Clima | **Estrada alagada no Extremo Sul** | 1 | 2 rodadas | A estrada do Lami some debaixo d'água. |
| Clima | **Minuano** | 2 | 2 rodadas | Vento gelado do sul. Ninguém fica na rua. |
| Clima | **Calorão de 40 graus** | 2 | 2 rodadas | Todo mundo foge para a orla e para os shoppings. |
| Clima | **Neblina no Guaíba** | 1 | 2 rodadas | Não se vê a outra margem. Voos atrasados. |
| Cidade | **Manifestação na Esquina Democrática** | 2 | 2 rodadas | Protesto fecha o Centro. |
| Cidade | **Apagão no bairro** | 2 | 2 rodadas | Uma zona inteira fica no escuro. |
| Cidade | **Festa na Cidade Baixa** | 2 | 2 rodadas | A República está fechada de tanta gente. |
| Cidade | **Feirão no shopping** | 2 | 2 rodadas | Promoção relâmpago num shopping sorteado. |
| Cidade | **Show no Araújo Vianna** | 1 | 2 rodadas | Noite de show dentro da Redenção. |
| Cidade | **Jogo da dupla na TV** | 1 | 1 rodada | A cidade inteira para na frente da televisão. |
| Cidade | **Feira Ecológica do Bom Fim** | 1 | 2 rodadas | Sábado de manhã: orgânicos na José Bonifácio. |
| Cidade | **Madrugada de carga na Ceasa** | 1 | 2 rodadas | Caminhões chegam do interior. A Ceasa ferve. |
| Cidade | **Terminal da Restinga lotado** | 1 | 1 rodada | Hora de ir trabalhar: filas no terminal. |
| Cidade | **Pôr do sol no Gasômetro** | 1 | 1 rodada | Todo mundo para olhar o sol cair no Guaíba. |
| Cidade | **Operação policial em zona quente** | 1 | 2 rodadas | A Brigada ocupa uma zona quente sorteada. |
| Imprensa | **Vazamento na imprensa** | 1 | imediato | Um jornal publica que há um espião na cidade. |
| Imprensa | **Retrato no jornal** | 1 | 3 rodadas | O retrato falado sai na capa. |
| Polícia | **Informante anônimo** | 2 | imediato | Uma ligação para o disque-denúncia. |
| Polícia | **Disque-denúncia saturado** | 1 | 2 rodadas | Trote atrás de trote. As denúncias se perdem. |
| Polícia | **Corte de verbas** | 1 | imediato | O governo congela o orçamento da força-tarefa. |
| Polícia | **Reforço da Brigada Militar** | 1 | 3 rodadas | Viaturas extras nas ruas. |
| Polícia | **Rádio-amador xereta** | 1 | imediato | Um radioamador grava parte de uma transmissão. |
| Polícia | **Queda de sinal** | 1 | 1 rodada | Torres de celular fora do ar. |
| Polícia | **Câmera quebrada** | 1 | 3 rodadas | Vandalismo derruba uma câmera sorteada. |
| Polícia | **Operação na orla** | 1 | imediato | A polícia ganha apoio para patrulhar a Zona Sul. |
| A rede (a favor do espião) | **Simpatizante da rede** | 1 | imediato | Alguém oferece carona sem fazer perguntas. |
| A rede (a favor do espião) | **Carona de caminhoneiro** | 1 | imediato | Um frete vai para onde o espião precisa. |
| A rede (a favor do espião) | **Barqueiro clandestino** | 1 | 2 rodadas | Um pescador das Ilhas leva qualquer um, a qualquer hora. |
| A rede (a favor do espião) | **Envelope extra** | 1 | imediato | A rede deixa uma cópia de uma pista em outro lugar. |
| A rede (a favor do espião) | **Remessa da rede** | 1 | imediato | Um envelope com dinheiro aparece no bolso do casaco. |
| Neutro | **Calmaria** | 2 | imediato | Nada acontece. Um alívio... |

### 10.3 Plano secreto e pistas

`gerar_pistas.py` sorteia o ponto de extração, a janela, os 8 contatos (em pelo menos 5 zonas) e os 8 envelopes, seguindo as regras do §8.2. `python3 gerar_pistas.py --testar` confere as regras em 2000 sorteios.

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

**Espião** (Perfil Corredor, R$ 6, Exposição 3, no Humaitá). Ele sabe que a extração não é por água nem por ar. Restam Rodoviária e Ponte do Guaíba. Vai **a pé** até a Arena (1 ligação), no meio da torcida, e não faz ação.
- Bilhete público: 🚶 *A pé*.
- Denúncia: Agl 4 → 30% + 6% = 36%. O servidor rola 52: **sem denúncia**.

**Detetives.** O último registro foi uma interceptação na rodada 9, Zona Norte.
- Analista (no Palácio): *Interceptar* a Transmissão #3 (1 PA, 40% + 15% + 15% = 70%) → **sucesso**: "Nada de estrada desta vez" + Zona Norte. O time descobre que o espião sabe que **não é terra**... mas é uma **Mensagem Falsa** que o espião plantou na rodada 9. O Dossiê marca Rodoviária e Ponte do Guaíba como eliminados, erroneamente.
- Agente Tático (no Lindóia): *A pé* até o Aeroporto (1 PA; a viatura custaria 3 com o Gre-Nal), *Montar Bloqueio* no Aeroporto (2 PA) e *Investigar* (1 PA): nada.
- Perito (em Farrapos): *A pé* até Humaitá (1 PA), *Investigar* (1 PA) → "esteve aqui na rodada 10, saiu **A pé**". *A pé* até a Arena (1 PA; a viatura pagaria +1 pelo jogo). *Interrogar* (1 PA, Agl 4 permite) → "**Sim**, a até 2 ligações".
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

**Efeito do mapa grande:** com 105 locais, o espião tem muito mais espaço para sumir. Para compensar, a viatura dos detetives anda até 4 ligações e os detetives começam espalhados (Palácio da Polícia + 3 de: Mercado, Redenção, Aeroporto, BarraShopping, Iguatemi, Passo d'Areia). Se nos testes o espião vencer demais, os primeiros ajustes são: Interrogar com alcance 3, ou uma revelação programada extra na rodada 16.

**Efeito do formato presencial:** como o espião ouve a mesa, e os detetives precisam digitar no celular o que é secreto, o time fica um pouco mais lento. Por isso o cronômetro padrão dos detetives é 120 s, e não 90 s. Se o espião vencer acima da meta nos testes, subir para 150 s ou dar +1 crédito por rodada ao time.

**Metas de telemetria:** taxa de vitória do espião entre 42% e 50%. Cerca de 70% das partidas devem chegar à janela C ou D. Uma Acusação de Plano correta deve encerrar no máximo 15% das partidas; se passar disso, subir o custo para 4 PA ou exigir 2 detetives no Palácio.

**Por que funciona:**

- O espião precisa **visitar contatos públicos**, então não pode ficar só escondido. Os detetives sabem *onde* vigiar, mas não *qual* contato importa.
- Cada pista recolhida **gera uma transmissão**, que é ao mesmo tempo o progresso do espião e uma migalha para os detetives.
- **Confiscar** dá aos detetives uma corrida paralela pela mesma informação. A redundância (3 de 4 pistas ONDE bastam para um palpite de 50%) evita que o espião fique sem saída.
- A **multidão** pune quem fica parado (denúncias) e protege no confronto (abordagens falham). Os eventos mudam onde está essa multidão.
- **Horário e transporte** criam um quebra-cabeça logístico: uma extração no Aeroporto às 2h exige App (rastreável) ou o Corujão L1 até o 30 e depois a pé.

---

## 13.1 Regras revisadas pela simulação (novembro de 2026)

Com jogadores automáticos (`scripts/sombra-sim.ts`), as regras originais davam **100% de vitória aos detetives**, com partidas acabando na rodada 6. As mudanças abaixo valem sobre o resto do documento e já estão no código (`BALANCO` em `src/sombra/rules/engine.ts`):

| Regra | Antes | Agora | Por quê |
|---|---|---|---|
| Pontos de contato | 8 locais públicos | O mapa mostra os **14 candidatos**; só o espião sabe quais 8 têm envelope. Vasculhar um vazio gasta os PA | Detetives liam os envelopes antes do espião |
| Confiscar envelope | +1 PA | **Removido**: os detetives podem ler, não apagar | Sem pistas, o espião não tinha como vencer |
| Acusação certa | Vitória imediata | **Plano B**: a rede sorteia outro ponto e outra janela (≥ 3 rodadas à frente) e avisa o espião. Sem janela possível, os detetives vencem | Encerrava o jogo cedo demais |
| Janela perdida | Derrota certa | A rede **remarca para a janela seguinte**, no mesmo lugar, e avisa só o espião | Partidas viravam jogo morto |
| Posição exata por câmera ou denúncia | Revelada na hora | Chega à central **no fim da rodada**; a denúncia mostra a zona na hora | Detetives prendiam na mesma rodada, sem chance de reação |
| Investigar rastro | Mostrava se o espião "ainda não saiu" | Só mostra **passagens de rodadas anteriores** | Equivalia a dizer onde ele estava |
| Interceptar | Revelava conteúdo e zona | Sem **Decodificador**, revela só a zona de origem | Detetives decifravam 100% do plano |
| Interrogar | 1 PA, raio 2 | **2 PA, raio 1** (Investigadora de Rua: grátis, raio 2), 1 vez por detetive por rodada | Era a principal fonte de capturas |
| Viatura | 2 PA, até 4 ligações, sem limite | 2 PA, **até 3 ligações, 1 vez por rodada** (Agente Tático: 4) | Detetives eram 4× mais rápidos |
| Abordar | Sem limite | **1 vez por detetive por rodada**; durante a Hora H, no máximo 50% de chance | — |
| A pé (espião) | até 2 ligações | **até 3 ligações** (cerca de 5 km/h) | — |
| Dinheiro do espião | R$ 10 | R$ 10 **+ R$ 1 por rodada** | Para conseguir usar transporte |

**Resultado nas simulações** (200 partidas por configuração): vitória do espião passou de 0% para cerca de 23%; duração média de 6 para 19 rodadas; o espião recolhe em média 4 dos 8 envelopes. O detetive automático rastreia matematicamente todas as posições possíveis do espião, o que pessoas não fazem, e o espião automático planeja rotas mal; por isso esse número tende a ser menor do que em partidas reais. O próximo ajuste deve vir de partidas com pessoas.

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

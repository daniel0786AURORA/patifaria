// Cada linha contém um objeto ou uma pessoa diferente, com seu próprio conteúdo lacrado.
const parse=(raw:string)=>raw.trim().split('\n').map(line=>{const i=line.indexOf('|');return {name:line.slice(0,i),text:line.slice(i+1)};});
export const evidenceStories=parse(`
Chinelo com GPS|O rastreador só registra deslocamentos entre o sofá e a geladeira, sempre às três da manhã.
Recibo de abraço|O documento cobra R$ 7 por afeto e R$ 2 de taxa por tapinha nas costas. Não há nome do cliente.
Peruca de emergência|A etiqueta traz o nome de um salão fechado há dez anos e o aviso: não usar perto de ventiladores.
Áudio de 47 minutos|Quarenta e seis minutos são de alguém procurando o botão de gravar. No último, ouve-se “deixa quieto”.
Nota fiscal molhada|Ainda é possível ler “doze unidades”, “entrega pelos fundos” e o pagamento de R$ 0,37.
Pombo com pendrive|O arquivo mais recente se chama plano_final_agora_vai.doc. Está vazio, mas foi impresso três vezes.
Contrato em guardanapo|As partes concordam em “resolver isso depois”. A mancha de mostarda cobre a cláusula de devolução.
Chave de lugar nenhum|Abre um cadeado que ninguém trouxe. No chaveiro está escrito “não contar para a tia”.
Batom da discórdia|O tubo contém um bilhete enrolado: “o combinado era depois do almoço”. A cor é Desculpa Esfarrapada.
Coxinha fossilizada|O laboratório confirma frango, catupiry e um pequeno pedaço de papel com a palavra “aprovo”.
Extrato de banco imobiliário|Foram movimentados dois hotéis e uma companhia de água. O saldo real continua sendo zero.
Troféu de participação|A placa homenageia o terceiro lugar numa competição com apenas dois inscritos.
Vídeo da câmera desligada|A gravação mostra só um reflexo e uma mão tentando esconder uma sacola de supermercado.
Selfie com desconhecido|O dono da foto reconhece o fundo, mas jura nunca ter visto o próprio corte de cabelo.
Mapa do banheiro|Há uma rota de fuga pelo armário de produtos de limpeza e um X ao lado do desentupidor.
Pantufa com antena|Recebe apenas rádio AM. Às 18h interrompe qualquer programação para anunciar “tudo sob controle”.
Bilhete de biscoito|A previsão diz “alguém perto de você vai negar tudo”. O número da sorte foi riscado.
Carimbo sem tinta|Apesar de seco, deixou a palavra DEFERIDO em sete superfícies diferentes, incluindo uma banana.
RG da samambaia|O registro identifica a planta como solteira, residente no corredor e nascida numa terça-feira nebulosa.
Crachá de síndico|O crachá vale até o fim da discussão. A foto foi colada sobre a imagem de um entregador de pizza.
Marmita lacrada|Dentro há três azeitonas, um parafuso e uma declaração de que o arroz nunca esteve ali.
Controle sem pilha|O compartimento guarda duas moedas e o telefone de uma pessoa identificada apenas como “resolve”.
Cueca de gala|Foi passada a ferro e embalada em papel de presente. A lavanderia confirma que não fez perguntas.
Cupom de pastel|Promete um recheio surpresa para compras feitas ontem. No verso, alguém escreveu “não aparecer”.
Manual do caos|Todas as páginas são instruções para apagar provas, mas a capa afirma ser um guia de organização doméstica.
Escova de dentes dourada|As cerdas estão intactas. O cabo tem marca de molho barbecue e um pedido de desculpas gravado.
Guarda-chuva furado|Os furos formam uma seta apontando para a casa do vizinho. O dono diz que é ventilação.
Agenda de 1998|Uma reunião com “a pessoa certa” foi marcada para todas as quintas-feiras dos últimos vinte anos.
Balança de cozinha|A calibração foi alterada para medir porções em “só mais um pouquinho”. A última leitura foi 14.
Meia com código de barras|O caixa identifica o produto como um abacaxi importado. O tecido cheira a elevador novo.
Capacete de papelão|O selo de segurança foi feito com um adesivo de banana. Há uma pequena coroa desenhada por dentro.
Pote sem tampa|O rótulo diz “guardar o segredo aqui”. O fundo contém uma única migalha de pão integral.
Calendário sem domingos|Todos os domingos foram recortados. Nas segundas-feiras, só existe a anotação “problema deles”.
Foto de um estacionamento vazio|No verso está escrito “estávamos todos aqui”. A sombra do fotógrafo aparece quatro vezes.
Caneta que escreve verde|A tinta muda para vermelho quando alguém tenta escrever valores acima de cinquenta reais.
Luvas de forno|Uma das luvas traz as iniciais de um clube de xadrez. A outra tem uma assinatura feita com glacê.
Medalha de natação|A premiação foi concedida numa cidade sem piscina. A fita tem preço de aluguel semanal.
Rádio de pilha|Sintoniza uma conversa entre duas pessoas discutindo quem ficou responsável pelo pacote.
Sacola térmica|Foi encontrada quente, vazia e acompanhada de uma avaliação de cinco estrelas por discrição.
Livro com páginas coladas|Só abre no capítulo “como explicar o inexplicável”. A dedicatória diz “não foi minha ideia”.
Relógio atrasado|A hora parou exatamente no horário em que o dono afirma ter chegado antes de todo mundo.
Pacote de confetes pretos|A embalagem diz “para festas sem entusiasmo”. Há uma impressão digital de purpurina azul.
Diploma de etiqueta|O certificado foi emitido pela Universidade do Bom-Dia e não reconhece feriados nacionais.
Selo de garantia vencido|A validade terminou quatro minutos antes do incidente. Alguém tentou corrigir a data com corretivo.
Coleira de pelúcia|O pingente identifica o portador como “gerente”. A nota de compra inclui treinamento de postura.
Apito de trânsito|O apito só produz som quando é apontado para o próprio usuário. A alça foi trocada por fita de presente.
Balde de cinema|No fundo há um ingresso para outra sessão e um bilhete: “o encontro era na fileira errada”.
Cartão de fidelidade|Nove carimbos são de estabelecimentos diferentes. O décimo foi feito com uma batata cortada.
Pedra com recibo|A descrição comercial é “equipamento de pressão psicológica”. A pedra pesa menos que o envelope.
Fone de um lado só|O histórico de chamadas mostra doze ligações para o número do próprio aparelho.
Avental de churrasco|No bolso há uma tabela de preços de desculpas e uma senha para o Wi-Fi dos fundos.
Bexiga numerada|O número 13 foi substituído por 12B. Alguém assinou a correção na presença de um palhaço.
Gravata elástica|Serve também como estilingue. Um laudo encontra farelo de biscoito na parte que deveria ficar no pescoço.
Passagem de ônibus antiga|O destino foi coberto pela frase “você sabe onde”. O motorista afirma que a linha nunca existiu.
Caderneta do fiado|Um lançamento de R$ 80 foi descrito apenas como “aquilo”. O credor escreveu “de novo não”.
Etiqueta de mala|A bagagem foi despachada sem mala. O dono exigiu indenização pelo espaço que ela ocuparia.
Cabo de vassoura oco|Dentro há um ingresso de circo e duas senhas de atendimento chamadas fora de ordem.
Panela de pressão silenciosa|O pino foi substituído por um brinco. O fabricante reconhece a panela, mas não a ousadia.
Travesseiro corporativo|A fronha traz um cronograma de reuniões. A mancha central corresponde ao horário de expediente.
Mouse de computador|Os cliques foram configurados para abrir sempre a calculadora e uma página de promoções de queijo.
Coroa de festa infantil|A inscrição “autoridade máxima” foi acrescentada com glitter depois da compra.
Pacote de açúcar aberto|O conteúdo é sal. A palavra “confie” aparece carimbada sobre a lista de ingredientes.
Bicicleta sem selim|O cadeado foi cortado, mas o recibo de aluguel inclui a opção “experiência em pé”.
Abajur de concha|Uma pequena câmera estava presa atrás da lâmpada, apontando para uma parede sem nada.
Dicionário rabiscado|A definição de “emprestado” foi trocada por “presente que ainda não foi entendido”.
Placa de inauguração|A data é de amanhã e o nome da obra foi arrancado com uma espátula de bolo.
Tapete com alarme|Ele dispara quando alguém pisa fora da frase BEM-VINDO. O manual recomenda entrar pelo quintal.
Colher de pau autografada|Três assinaturas reivindicam a invenção do mesmo molho. Nenhuma pessoa sabe cozinhar.
Garrafa de areia|O rótulo diz “praia portátil”. Um grão foi identificado como arroz de festa de casamento.
Pasta de sanfona|As divisórias são “eu”, “não fui eu” e “foi o estagiário”. A última está cheia.
Telefone de brinquedo|Há um número real anotado no disco. A mensagem gravada diz “não ligue do trabalho”.
Copo com batom azul|O café foi substituído por gelatina. A borda tem duas marcas incompatíveis de bigode.
Vela perfumada|A fragrância prometida é “reunião cancelada”. A cera contém pequenos recibos de estacionamento.
Escada dobrável|Um degrau tem compartimento secreto, mas só guarda uma foto de outra escada.
Tábua de passar|Uma planta baixa foi desenhada sob a capa. A sala principal está identificada como “depósito do plano B”.
Óculos sem lente|Foram usados para assinar três documentos “com mais credibilidade”, segundo o estojo.
Martelo de borracha|O cabo guarda uma lista de nomes. Dois foram substituídos por emojis de berinjela.
Papel de embrulho|O padrão de bolinhas esconde uma sequência de horários e um pedido para comprar gelo.
Porta-retrato vazio|A poeira revela que havia uma foto do próprio porta-retrato. A imagem sumiu primeiro.
Despertador com snooze quebrado|Tocou 38 vezes na mesma madrugada. Todas as notificações foram descritas como “agora vai”.
Espelho retrovisor|Reflete um adesivo escrito “eu avisei”. A base foi removida de um carrinho de supermercado.
Carteira de clube|O portador é membro vitalício do Clube dos Que Não Sabem de Nada. A mensalidade está atrasada.
Bola de cristal plástica|O fundo tem uma tampa com pilhas e três respostas: talvez, depende e pergunte ao jurídico.
Lacre de refrigerante|A perícia encontrou um fio de cabelo e uma etiqueta de preço de antiquário.
Fantasia de berinjela|O zíper foi fechado por fora. No bolso, há um contrato de prestação de serviços de presença.
Teclado sem tecla Enter|As últimas mensagens ficaram sem envio. Todas começavam com “preciso confessar uma coisa”.
Vasinho de cacto|Entre os espinhos há um anel de plástico e uma nota dizendo “encontro cancelado, desculpa”.
Tampa de bueiro em miniatura|Foi vendida como obra de arte e entregue com instruções de instalação em via pública.
Máquina de bolhas|O reservatório contém água com detergente e uma pequena chave marcada “último recurso”.
Convite de casamento|O local foi alterado três vezes e o campo do nome do noivo foi preenchido a lápis.
Sino de recepção|Debaixo da base está colada uma ordem para nunca atender depois do terceiro toque.
Prancheta de inspeção|Todos os itens foram marcados como “bom o suficiente”. Um deles é uma pergunta, não uma vistoria.
Fita de isolamento lilás|A inscrição proíbe a entrada de pessoas com bom senso. Um pedaço foi usado como laço de presente.
Papel timbrado de padaria|O documento exige sigilo absoluto sobre a quantidade de sonho comprada na véspera.
Luva de goleiro|Há uma multa de biblioteca dentro dela. O livro devolvido se chama “não segure essa responsabilidade”.
Pacote de sementes|A embalagem promete árvores de dinheiro. O certificado recomenda regar com esperança e boleto.
Taça de plástico rachada|O prêmio homenageia “a melhor tentativa de parecer ocupado”. A placa foi reimpressa sete vezes.
Tijolo com laço|Veio acompanhado de um cartão: “para construir uma relação de confiança”. O remetente não assinou.
Chapéu de pescador|Os anzóis foram trocados por clipes de escritório. Um bilhete lista pessoas que “morderam a isca”.
Ventilador com bilhete|A hélice espalhou cópias do mesmo aviso: “ninguém viu nada”. O interruptor foi lacrado ligado.
`);
export const witnessStories=parse(`
Dona Creuza, a fofoqueira|Vi alguém sair com um pacote, mas estava discutindo a novela e perdi o resto.
Osvaldo, o porteiro|Anotei a placa toda. Infelizmente anotei numa banana que comi no almoço.
Pâmela, a astróloga|Não vi o rosto, mas reconheci a postura de uma pessoa com Mercúrio retrógrado.
Jurema, a manicure|Ouvi “esconde isso” enquanto secava um esmalte. Pode ter sido na televisão.
Toninho, o sósia|A pessoa parecia comigo. Por isso, peço para não mostrarem a foto à minha esposa.
Valdir, o motoboy|Entreguei uma sacola leve. O destinatário assinou como “você não me viu”.
Cacilda, a influencer|Gravei tudo em live, mas usei um filtro que transformou os envolvidos em batatas.
Gerson, o aposentado|Eu estava no banco da praça desde cedo. Saí justamente nos quinze minutos importantes.
Nair, a fiscal do varal|Reconheço qualquer pregador deste bairro. A pessoa usava um que não combinava com a roupa.
Beto, o mágico|Vi o objeto desaparecer. Não vou explicar o método por ética profissional.
Sueli, a coach|A pessoa corria com atitude de vencedora. Não posso garantir a direção.
Doutor Pipoca|Examinei o barulho e concluí que alguém abriu alguma coisa com muita confiança.
Celso, o ex-síndico|Nada disso aconteceria na minha gestão. A câmera estava quebrada desde a minha gestão.
Lurdinha do bingo|Ouvi alguém gritar “setenta e dois”. O resto fica sob sigilo do campeonato.
Tião do karaokê|Reconheci a voz pela desafinação no final da frase. Eu também desafino igual.
Rita do brechó|A roupa era minha, mas já vendi aquela peça para quatro pessoas em datas diferentes.
Chico, o imitador|Ouvi uma voz conhecida e respondi com a mesma voz. Não sei quem falou primeiro.
Vera, a vidente|Eu já sabia que seria chamada aqui. Só não sabia o motivo nem o dia.
Zezé do churrasco|Quando cheguei, já estavam virando o assunto. A carne ainda estava crua.
Berenice, a caixa|O pagamento foi em moedas. Conteí duas vezes e nas duas deu vontade de ir embora.
Naldo da van|Levei três pessoas. Voltei com quatro e ninguém quis explicar o adicional.
Dona Zilda, a vizinha|Eu vi pela cortina. Não estava espionando, estava conferindo se a cortina funcionava.
Priscila do RH|Recebi uma justificativa de ausência escrita antes de a pessoa se ausentar.
Gilmar do Wi-Fi|O aparelho conectou às 21h08. O nome da rede era “não estou aqui”.
A testemunha de bigode falso|Prefiro preservar minha identidade, embora meu nome esteja no crachá.
Aurélio, o bibliotecário|A pessoa devolveu um livro de desculpas com todas as páginas dobradas.
Marisa, a professora de pilates|Eu reconheço alguém pela postura, mas essa pessoa estava fazendo esforço para parecer outra.
Damião, o chaveiro|Fiz uma cópia. A chave original estava etiquetada como “original da cópia falsa”.
Cíntia, a taxista|O passageiro pediu a rota mais discreta e depois reclamou que não passamos por lugar nenhum.
Heraldo, o fotógrafo|Tenho a imagem perfeita do fato. A tampa da lente também ficou perfeita.
Léa, a confeiteira|Pedíram um bolo escrito “foi sem querer” antes mesmo de eu perguntar o sabor.
Rubens, o pescador|Eu estava longe demais para ver. Mas tenho certeza de que o tamanho da confusão era enorme.
Soraia, a corretora|A pessoa perguntou se o imóvel tinha saída alternativa para visitas indesejadas.
Ítalo, o garçom|Ouvi a conversa inteira. Só memorizei a parte em que esqueceram a gorjeta.
Madalena, a costureira|A barra da roupa tinha barro. Ou chocolate. Eu estava comendo durante o serviço.
Alcides, o vigia|Vi movimento na câmera dois. Depois percebi que a câmera dois filmava a televisão.
Duda, a DJ|Pausaram a música para um anúncio. Eu achei péssimo e fiz uma remixagem.
Severino, o eletricista|A luz apagou quando alguém disse “agora”. Pode ter sido meu colega testando o disjuntor.
Valéria, a dentista|Reconheci o sorriso. Mas o retrato estava usando aparelho de filtro de aplicativo.
Márcio, o animador|Achei que a confusão fazia parte do roteiro e entreguei um microfone.
Solange, a florista|A encomenda dizia “desculpa pelo que ainda vou fazer”. As flores eram amarelas.
Pedro, o passeador|Os cachorros ficaram agitados. Eles também ficam assim quando alguém abre queijo.
Neusa, a cabeleireira|A pessoa pediu um visual novo e perguntou se a franja atrapalhava reconhecimento facial.
Cristóvão, o alfaiate|Costurei um bolso enorme. A justificativa foi “guardar assuntos particulares”.
Tamires, a atendente|A ligação pediu para falar com o responsável. Quando transferi, a mesma voz atendeu.
Ambrósio, o feirante|Trocaram a etiqueta de preço. Eu notei porque ninguém pagaria tanto numa abobrinha.
Sandra, a instrutora|A pessoa ensaiou uma saída elegante, mas tropeçou exatamente no momento do ensaio.
Josué, o entregador de gás|O portão estava aberto e alguém sussurrou “não era para você chegar ainda”.
Bianca, a veterinária|Ouvi o relato e perguntei de qual animal falávamos. Ninguém soube responder.
Edgar, o fiscal|Pedi os documentos. Recebi um cardápio e uma proposta de almoço.
Renata, a recepcionista|O visitante assinou o nome de outra pessoa e corrigiu dizendo que era nome artístico.
Plínio, o zelador|Limpei tudo antes de perceber que chamavam aquilo de local dos fatos.
Fátima, a cantora|Escutei uma discussão em dó menor. Não sei transcrever, mas posso cantar.
Otávio, o padeiro|A pessoa chegou antes de o pão sair. Isso aqui quase nunca é boa notícia.
Mônica, a massagista|O cliente estava muito tenso quando alguém falou em conferir o recibo.
Lázaro, o antiquário|O objeto parecia antigo, mas encontrei uma etiqueta de promoção desta semana.
Eloá, a porteira do clube|Deixei entrar porque havia um carimbo. Só depois vi que era de um parque aquático.
Inácio, o jardineiro|Os passos passaram pelo canteiro. O responsável teve a delicadeza de pedir desculpa à roseira.
Vânia, a radialista|Anunciaram um nome ao vivo. Eu estava no intervalo e só ouvi o patrocinador.
Romário, o árbitro de dominó|A pessoa infringiu uma regra. Não sei se era uma regra deste caso ou do meu jogo.
Silvana, a técnica de celular|Recuperei uma mensagem apagada. Era um pedido para apagar outra mensagem.
Jair, o vendedor de colchões|A pessoa testou oito modelos enquanto dizia que precisava dormir sobre o assunto.
Aline, a guia turística|Apresentei o local como ponto histórico. A confusão ficou histórica depois.
Humberto, o encanador|Havia algo entupindo a passagem. Não achei apropriado perguntar de quem era.
Rosana, a tesoureira|O caixa fechou certinho quando retirei o lançamento chamado “diferença misteriosa”.
Nelson, o técnico da TV|A imagem estava duplicada. Posso ter visto duas pessoas ou a mesma pessoa duas vezes.
Vitória, a estudante|Anotei os fatos para um trabalho. Meu colega transformou tudo numa apresentação com memes.
Ademir, o carteiro|O envelope tinha endereço correto e destinatário descrito apenas como “quem sabe”.
Paola, a garçonete|A pessoa brindou antes de saber o resultado. O copo estava vazio desde o começo.
Geraldo, o sapateiro|O sapato deixou uma marca única, embora eu tenha vendido o mesmo modelo para o bairro inteiro.
Rúbia, a professora de zumba|Reconheci a sequência de passos. Não posso confirmar se era dança ou fuga.
Tadeu, o contador|Os números batiam. O problema foi descobrir que batiam palmas para comemorar.
Elaine, a designer|Fiz uma logo para um projeto chamado “nada suspeito”. Pediram muita discrição e uma sirene.
Firmino, o cobrador|A pessoa pagou duas passagens e disse que a consciência também ocupava lugar.
Patrícia, a enfermeira|Medi a pressão. Ela subiu quando ouviram a palavra auditoria.
Lourenço, o vendedor de seguros|Perguntaram se a cobertura incluía consequências das próprias ideias.
Kelly, a gerente|O funcionário justificou o atraso com uma foto que mostrava o calendário do ano errado.
Dionísio, o chef|O pedido dizia “sem deixar rastros”. Eu entendi que não queriam molho.
Melissa, a instrutora de direção|A pessoa pediu para praticar marcha a ré e nunca demonstrou interesse em ir para frente.
Raul, o bombeiro civil|A situação estava sob controle quando cheguei. Não disseram de quem era o controle.
Carmem, a historiadora|Esta história já aconteceu antes, mas da primeira vez foi registrada como festa beneficente.
Vinícius, o mágico de festa|Assumi a culpa pelo desaparecimento para não decepcionar as crianças. Eu não tinha preparado esse número.
Dalva, a atendente da lotérica|O bilhete trazia seis números e a instrução “se der certo, ninguém me conhece”.
Ari, o técnico de impressora|Imprimiram cinquenta cópias de uma folha dizendo para não tirar cópias.
Samira, a instrutora de yoga|A pessoa mantinha a calma de um jeito muito ensaiado e segurava a respiração nos horários importantes.
Amélia, a dona da pensão|O hóspede saiu sem pagar, mas deixou uma avaliação elogiando a facilidade de saída.
Cauã, o ciclista|Passei rápido demais para reconhecer alguém. O barulho me acompanhou por dois quarteirões.
Judite, a fiscal da biblioteca|A pessoa sussurrou uma confissão. Pedi para repetir mais baixo e perdi o conteúdo.
Breno, o vendedor de óculos|O cliente pediu lentes para parecer inocente. Recomendei apenas que limpasse a armação.
Nicole, a técnica de som|A gravação tinha uma voz ao fundo dizendo “essa parte não era para gravar”.
Arnaldo, o juiz de quermesse|Aceitei a desculpa por falta de outra melhor. Não confundir isso com confirmação dos fatos.
Talita, a organizadora|Havia um evento reservado com o título “reunião que nunca aconteceu”. Todos confirmaram presença.
Wellington, o motorista|A viagem terminou no mesmo lugar em que começou. O passageiro insistiu que havia resolvido muita coisa.
Iolanda, a professora de teatro|A negação foi convincente, mas eu reconheci o exercício que ensinei na terça-feira.
Ciro, o assistente de palco|Recebi sinal para abrir a cortina. Atrás dela, ninguém parecia pronto para ser visto.
Estela, a astrônoma|Estava olhando para cima. O que aconteceu no chão ficou fora da minha especialidade.
Ulisses, o vendedor de mapas|Marcaram dois caminhos: um para chegar e outro para explicar onde estiveram.
Graciete, a dona do armarinho|Vendi fita adesiva, barbante e um pacote de olhos móveis. Recusei perguntar para quê.
Fábio, o síndico substituto|Assumi por uma tarde e encontrei uma autorização assinada pelo síndico que ainda não tinha assumido.
Leonor, a agente de viagens|A pessoa pediu passagem só de ida e um recibo mostrando que nunca saiu de casa.
`);
export const performanceRoles=`um telejornal urgente|uma novela mexicana|um narrador de futebol|uma palestra motivacional|uma Barbie otimista|uma coletiva de imprensa|um vendedor de colchões|um documentário de capivaras|uma previsão do tempo|um tutorial de maquiagem|um anúncio de supermercado|um vilão explicando seu plano|um guia de museu|um apresentador de bingo|uma aula de zumba|um robô apaixonado|um chef irritado|um pirata burocrata|uma propaganda eleitoral|um atendente de telemarketing|uma leitura de horóscopo|um musical de elevador|um leilão de antiguidades|um locutor de rodeio|uma meditação guiada|um detetive que perdeu a lupa|uma reunião de pais na escola|um tutorial de montar móveis|um comercial de margarina|uma partida de xadrez narrada|uma rádio de caminhoneiros|um discurso de casamento|um documentário sobre uma geladeira|um professor substituto sem plano|um corretor vendendo um castelo|um apresentador de programa culinário|uma consulta de dentista|um anúncio de voo atrasado|um vendedor de poção mágica|um guia de safári urbano|um porteiro atendendo cinco interfones|uma apresentação de trabalho em grupo|um monarca inaugurando uma ponte|um atleta agradecendo patrocínio|um comentarista de concurso de cães|um cientista mostrando uma invenção inútil|um mágico cujo truque falhou|uma reunião de condomínio tensa|um áudio de família de madrugada|um alerta de promoção imperdível|um fotógrafo dirigindo uma sessão|um professor de autoescola|um treinador no intervalo da final|um astronauta ligando para a Terra|um locutor de estação ferroviária|uma entrevista de emprego desastrosa|um dragão reclamando de azia|uma palestra sobre organização de gavetas|um vendedor de passagens para Marte|um guia de excursão de aposentados|um chef avaliando miojo|um barbeiro contando histórias|um apresentador de reality show|um comentarista de previsão econômica inventada|um mágico contratado para um funeral de celular|um tutorial de adestrar uma pedra|um alienígena tentando entender boletos|uma revisão de um restaurante imaginário|um repórter ao vivo numa tempestade|um terapeuta de eletrodomésticos|um rei distribuindo tarefas domésticas|uma pessoa descrevendo um sonho absurdo|um comentarista de desfile de chinelos|uma reunião de robôs de limpeza|um vendedor de seguro para guarda-chuvas|um roteirista apresentando uma novela|um navegador perdido num estacionamento|um mestre de cerimônias sem convidados|um cozinheiro ensinando a ferver gelo|um fiscal de boas maneiras no churrasco|um locutor anunciando animais desaparecidos|um guarda de museu durante uma invasão de pombos|um aluno defendendo um trabalho que não leu|um capitão de navio de papel|um prefeito inaugurando um buraco|uma pessoa guiando uma visita ao próprio quarto|um vendedor de senhas para filas|um professor explicando internet a uma planta|um treinador de caracóis de corrida|um entregador negociando com um portão|um locutor de rádio sem notícias|uma pessoa dando voz ao próprio sapato|um atendente de suporte para fantasmas|um detetive interrogando um manequim|um monstro tentando vender biscoitos|um diplomata negociando o último pudim|um estilista apresentando roupas invisíveis|um árbitro apitando uma discussão de família|um bibliotecário vendendo um livro proibido|um herói contando como salvou o lanche`.split('|');

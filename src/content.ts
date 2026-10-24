export const categories = ['Evidências','Testemunhas','Sabotagens','Corrupção','Ordens','Refutações','Interpretação','Reviravoltas'] as const;
export type Category = typeof categories[number];
export type Card = {id:string;name:string;type:Category;icon:string;text:string;effect:string;target:string;timing:string;duration:string;visibility:string;duel:boolean};
const evidence = ['Chinelo com GPS','Recibo de um abraço','Peruca de emergência','Áudio de 47 minutos','Nota fiscal molhada','Pombo de pendrive','Contrato em guardanapo','Chave de lugar nenhum','Batom da discórdia','Coxinha fossilizada','Extrato de banco imobiliário','Troféu de participação','Vídeo da câmera desligada','Selfie com desconhecido','Mapa do banheiro','Pantufa com antena','Bilhete de biscoito','Carimbo sem tinta','RG de uma samambaia','Crachá de síndico','Marmita lacrada','Controle sem pilha','Cueca de gala','Cupom de pastel','Manual do caos'];
const witnesses = ['Dona Creuza, a fofoqueira','Osvaldo, o porteiro','Pâmela, a astróloga','Jurema, a manicure','Toninho, o sósia','Valdir, o motoboy','Cacilda, a influencer','Gerson, o aposentado','Nair, a fiscal de varal','Beto, o mágico','Sueli, a coach','Doutor Pipoca','Celso, o ex-síndico','Lurdinha do bingo','Tião do karaokê','Rita do brechó','Chico, o imitador','Vera, a vidente','Zezé do churrasco','Berenice do caixa','Naldo da van','Dona Zilda','Priscila do RH','Gilmar do Wi-Fi','A testemunha de bigode falso'];
const acts = ['um telejornal urgente','uma novela mexicana','um narrador de futebol','uma palestra motivacional','uma Barbie otimista','uma coletiva de imprensa','um vendedor de colchões','um documentário de capivaras','uma previsão do tempo','um tutorial de maquiagem','um anúncio de supermercado','um vilão explicando seu plano','um guia de museu','um apresentador de bingo','uma aula de zumba','um robô apaixonado','um chef irritado','um pirata burocrata','uma propaganda eleitoral','um atendente de telemarketing','uma leitura de horóscopo','um musical de elevador','um leilão de antiguidades','um locutor de rodeio','uma meditação guiada'];
const schemes = ['Molhou a mão','Parecer encomendado','Aplausos comprados','O juiz é meu primo','Ordem de cima','Juiz de ressaca','Pix de consideração','Café com influência','Alvará de amizade','Envelope cheiroso','Favor de família','Patrocínio da toga','Camarote judicial','Jantar de negócios','Pensão do martelo','Presente sem remetente','Vale-coxinha','Promoção de gabinete','Carona oficial','Clube do carimbo','Toga sob medida','Consultoria invisível','Recesso patrocinado','Abraço institucional','Bolsa bajulação'];
const sabotage = ['Microfone de karaokê','Crise de soluço','Juridiquês proibido','Interrogatório da sogra','Falha na dublagem','Síndrome do comercial','Palavra confiscada','Eco no plenário','Discurso de elevador','Língua de locutor','Pânico do PowerPoint','Sotaque de novela','Reunião que podia ser email','Modo avião','Advogado em câmera lenta','Interrupção da firma','Frase de efeito','Entrevista no tapete vermelho','Fiscal de metáforas','Trava na língua','Alerta de fofoca','Plantão da vizinha','Palestra de condomínio','Conselho de bisavó','Marcha do argumento'];
const orders = ['Ordem no galinheiro','Martelo de pelúcia','Recesso do cafezinho','Silêncio com glitter','Pausa para o drama','Calma, excelência','Intervalo constitucional','Respira e carimba','Audiência zen','Toga na cadeira','Protocolo de cochilo','Ata do suspiro','Café nos autos','Descanso do plenário','Martelo em manutenção','Recesso relâmpago','Plenário em férias','Chamada da consciência','Pausa de respeito','Solenidade do pastel','Audiência de pantufas','Carimbo de espera','Ordem do bom senso','Silêncio de biblioteca','Intervalo da firma'];
const refutes = ['Fonte: minha cabeça','Objeção de chinelo','Isso é fofoca','Prova de padaria','Print sem contexto','Argumento de elevador','Calúnia gourmet','Recurso do bom senso','Nada a declarar','Falso cognato judicial','Juridiquês de feira','Carimbo de dúvida','Cadê o recibo?','Confia no tio','Objeção com carinho','Petição de incredulidade','Protocolo do absurdo','Revisão da revisão','Isso não tá nos autos','Vírgula estratégica','Contraditório de bolso','Protesto perfumado','Pedido de realidade','Não procede, flor','Dúvida de estimação'];
const twists = ['Plot twist de chinelo','Fax do destino','Recurso do multiverso','Testemunha no elevador','Autos embaralhados','Revelação do estagiário','Correio do caos','Surpresa no protocolo','Sorte de principiante','Arquivo da bagunça','Volta por cima','Envelope atrasado','Reviravolta da firma','Virada do cafezinho','Segredo de cartório','Recurso da sorte','Pasta trocada','Boa notícia suspeita','Documento do futuro','Capítulo inesperado','Milagre burocrático','Carta na manga','Apêndice do absurdo','Notificação cósmica','Ata do imprevisto'];
const icons = ['🧾','👀','💥','🤫','🔨','✋','🎭','🌀'];
const all:Card[]=[];
for(let cat=0;cat<8;cat++) for(let i=0;i<100;i++){
 const n=i%25,v=Math.floor(i/25),type=categories[cat];
 let name='',text='',effect='present',target='próprio',duel=true,visibility='pública';
 if(cat===0){name=evidence[n]+['',' — edição de luxo',' — do achados e perdidos',' — lacrado em cartório'][v];text=[`O laudo de ${evidence[n].toLowerCase()} registra apenas uma impressão digital de molho de tomate.`,`Uma etiqueta diz: “devolver até ontem”. Ninguém reconhece a caligrafia.`,`Encontrado num saco de pão às 03h17. A única testemunha estava dormindo.`,`O objeto tem cheiro de lavanda e um preço riscado. A data foi escrita a lápis.`][v];}
 if(cat===1){name=witnesses[n]+['',' — depoimento no portão',' — ligação de madrugada',' — versão no cartório'][v];text=[`“Vi alguém correndo, mas meus óculos estavam na air fryer.”`,`“Ouvi três barulhos e pensei que era promoção de colchão.”`,`“Cheguei depois. Só posso confirmar que tinha gente comentando.”`,`“Reconheci a voz, ou talvez fosse a novela da vizinha.”`][(n+v)%4];}
 if(cat===2){name=sabotage[n]+['',' premium',' de plantão',' extraordinária'][v];text=`Na próxima fala, o adversário deve argumentar como ${acts[(n+v*7)%25]}. ${['Inclua uma rima.','Comece com “segundo minha avó”.','Encerre com um slogan.','Use uma metáfora culinária.'][v]}`;effect='challenge';target='adversário';duel=false;}
 if(cat===3){name=schemes[n]+['',' — favor urgente',' — despacho reservado',' — pacote executivo'][v];effect=['forceReject','forceApprove','forceBluff','favor'][n%4];text={forceReject:'O juiz reprova o próximo desafio do adversário automaticamente.',forceApprove:'O juiz aprova seu próximo desafio automaticamente.',forceBluff:'A próxima decisão de BLEFE é automaticamente favorável a você.',favor:'O juiz deve defender verbalmente seu próximo argumento. Uma utilização.'}[effect]!;target='juiz';visibility='somente autor e juiz';duel=false;}
 if(cat===4){name=orders[n]+['',' express',' da madrugada',' especial'][v];effect='time';text=`Acrescente ${[5,8,10,12][v]} segundos à sua fala atual. O teto é 90 segundos.`;}
 if(cat===5){name=refutes[n]+['',' — segunda via',' — com firma reconhecida',' — recurso especial'][v];effect='shield';text='Cancele um desafio ativo sobre você. Se não houver desafio, remova uma Ficha de Vergonha. Sem cadeia de respostas.';}
 if(cat===6){name=['Interprete','Plantão','Sessão','Cena'][v]+': '+acts[n];effect='challengeSelf';text=`Interprete ${acts[n]}. ${['Inclua uma rima.','Comece com “Excelência, deu ruim”.','Termine com uma pergunta dramática.','Use três metáforas de comida.'][v]} O juiz avalia ao final: +1 ponto se cumprir.`;duel=false;}
 if(cat===7){name=twists[n]+['',' — edição do caos',' — sem aviso prévio',' — do além'][v];effect='redraw';text='Descarte uma carta aleatória restante e receba outra. Esta carta conta como uma das duas ações da fala.';}
 all.push({id:`${cat}-${i}`,name,type,icon:icons[cat],text,effect,target,timing:'durante sua fala',duration:effect.includes('force')||effect==='favor'?'até uma utilização ou fim do julgamento':effect.includes('challenge')?'uma fala':'imediata',visibility,duel});
}
export const cards=all;
const caseTitles = [
['As 47 calcinhas do varal','Rogério Ventania','sumir com 47 calcinhas para fabricar uma pipa corporativa'],
['A capivara da fé','Madame Capitu','abrir uma igreja clandestina que só aceita dízimo em alface'],
['O sequestro da própria peruca','Prefeito Valdemar','roubar a própria peruca e exigir resgate da prefeitura'],
['Segurança com pedigree','Dona Marlene','alugar o cachorro da vizinha como segurança de balada'],
['Guerra no grupo do prédio','Cláudio do 402','declarar independência do grupo de WhatsApp do condomínio'],
['O anão de jardim fugitivo','Jussara Pires','usar um anão de jardim como passageiro na faixa exclusiva'],
['A geladeira de coxinhas','Enzo Barroso','vender a geladeira da avó para financiar um rodízio de coxinhas'],
['Pix para o fantasma','Gilberto Assombro','cobrar aluguel de um fantasma e protestar o nome dele'],
['O casamento do liquidificador','Berenice Faísca','organizar um casamento de eletrodomésticos com dinheiro do condomínio'],
['A máfia do pão francês','Toninho Casquinha','vender ar dentro de saquinhos de pão como experiência gourmet'],
['O pombo concursado','Dr. Arrulhão','nomear um pombo como diretor de assuntos aéreos'],
['A vaga da samambaia','Irene Clorofila','reservar uma vaga de garagem para sua samambaia'],
['O Wi-Fi sentimental','Naldo do Roteador','terminar um namoro alterando a senha do Wi-Fi'],
['Churrasco por procuração','Beto Brasa','enviar um manequim ao churrasco e cobrar a parte da carne'],
['O karaokê das seis','Sueli Agudo','usar o interfone do prédio para ensaiar ópera às seis da manhã'],
['A lua em promoção','Pâmela Eclipse','vender lotes na Lua com direito a piscina e churrasqueira'],
['O coach de minhocas','Leandro Húmus','oferecer mentoria de produtividade para minhocas'],
['A greve do micro-ondas','Marcos Bip','convencer os colegas de que o micro-ondas exigia férias'],
['Cupom de divórcio','Nair Desconto','tentar pagar o divórcio com cupom de primeira compra'],
['A eleição do gato','Mingau Neto','concorrer a síndico usando uma foto de gato gerada por impressora'],
['O velório do celular','Dona Célia','organizar um velório de três dias para o celular que caiu na privada'],
['O pastel de vento premium','Zezé Gourmet','cobrar taxa de oxigênio em pastéis sem recheio'],
['A perna de pau no pedágio','Alfredo Serragem','pedir desconto no pedágio porque uma perna era de madeira'],
['O crime do café descafeinado','Sérgio Soninho','substituir todo o café do escritório por caldo de feijão'],
['Delivery de desculpas','Cleiton Perdão','entregar pedidos de desculpas com taxa de urgência'],
['A fila da fila','Valquíria Senha','criar uma fila paga para entrar em outra fila gratuita'],
['O batizado do drone','Joaquim Hélice','batizar um drone e exigir licença-paternidade'],
['A sauna da padaria','Nilce Vapor','usar o forno da padaria como spa depois do expediente'],
['O bolão do horóscopo','Vera Saturno','manipular um bolão consultando três signos diferentes'],
['O carrinho de luxo','Ronaldo Rodinha','alugar carrinhos de supermercado como limusines para formaturas'],
['O silêncio vendido','Patrícia Psiu','vender minutos de silêncio com propaganda no intervalo'],
['O seguro de fofoca','Creuza Apólice','vender seguro contra fofoca e vazar os sinistros no salão'],
['A estátua de férias','Valdir Bronze','vestir a estátua da praça de turista e cobrar excursões'],
['O clone do porteiro','Gerson Papelão','substituir o porteiro por um totem com a frase “pode subir”'],
['A terapia do aspirador','Júlio Poeira','cobrar sessões de terapia para aspiradores com crise de identidade'],
['O resgate do controle','Flávia Canal','sequestrar o controle remoto durante a final do campeonato'],
['O batom na urna','Dona Dóris','assinar uma ata de condomínio com beijo e exigir validade jurídica'],
['A maratona de elevador','Caio Subida','vender medalhas de maratona para quem sobe dois andares'],
['O chapéu do eclipse','Neide Sombra','cobrar entrada para a sombra de um chapéu durante um eclipse'],
['O coral dos alarmes','Rita Despertador','programar 30 alarmes para cantar parabéns ao síndico'],
['A dieta da planta','Cacilda Fitness','submeter uma planta carnívora a um programa vegano'],
['O estacionamento de sonhos','Amadeu Nuvem','cobrar aluguel de espaço para sonhos estacionados'],
['O camarote do ponto de ônibus','Bruno VIP','vender pulseiras de área VIP no ponto de ônibus'],
['A despedida do boleto','Lurdinha Conta','convocar uma festa surpresa para o último boleto da geladeira'],
['O treinamento do mosquito','Tião Zumbido','treinar mosquitos para tocar campainha por comissão'],
['O diploma de cochilo','Professora Sônia','emitir diplomas de pós-graduação em cochilo estratégico'],
['A invasão dos patinhos','Osvaldo Banheira','soltar 500 patinhos de borracha na piscina para protestar contra a taxa'],
['O recibo da saudade','Ivone Lembrança','emitir notas fiscais por cada “estou com saudade” enviado'],
['A reunião dos espelhos','Célio Reflexo','convocar uma assembleia de espelhos e fraudar o quórum'],
['O festival da air fryer','Jurema Crocante','tentar fritar os documentos do imposto para deduzir como alimentação'],
['O processo do chinelo','Adalberto Borracha','pedir guarda compartilhada de um par de chinelos'],
['A escada rolante parada','Sílvio Degrau','cobrar tarifa dinâmica de uma escada que nunca funcionou'],
['O curso de sumiço','Mágico Edilson','vender um curso de desaparecimento e sumir com a mensalidade'],
['O funeral da dieta','Gislaine Brigadeiro','declarar luto oficial pela dieta e fechar a academia'],
['A greve dos emojis','Priscila Carinha','cobrar royalties por enviar bom-dia com 87 emojis'],
['O táxi de tartaruga','Tobias Casco','anunciar corridas expressas em uma tartaruga de jardim'],
['A hospedagem do pé de feijão','Zilda Broto','listar um vaso de feijão como cobertura duplex'],
['A multa do arroto','Doutor Azedo','aplicar multas sonoras no almoço de domingo sem licença'],
['O leilão do último pudim','Vanderson Calda','vender o mesmo último pedaço de pudim para cinco tios'],
['O feriado particular','Sebastião Folga','decretar feriado municipal dentro do próprio quarto']
];
export const cases=caseTitles.map(([title,defendant,charge],i)=>({id:i,title,defendant,charge:`${defendant} é acusado de ${charge}.`,context:`O fato ocorreu ${['na festa do bairro','durante uma assembleia','num domingo chuvoso','no intervalo do almoço','na inauguração de um salão'][i%5]}. ${['A defesa alega que era uma experiência social.','A acusação afirma que houve planejamento num guardanapo.','Uma testemunha garante que tudo começou com uma promoção.','O réu afirma que seguiu um tutorial da internet.','Os envolvidos se recusam a devolver o depósito de R$ 12,50.'][i%5]} Cabe a vocês conectar as provas a esta confusão.`}));

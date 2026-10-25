import type {Card,Category} from './content.js';
import {evidenceStories,witnessStories,performanceRoles} from './card-stories.js';
const types:Category[]=['Evidências','Testemunhas','Sabotagens','Corrupção','Ordens','Refutações','Interpretação','Reviravoltas'];
const icons=['🧾','👀','💥','🤫','🔨','✋','🎭','🌀'];
const flourishes=['do Cafezinho','da Toga de Seda','do Carimbo Torto','da Ata Secreta','do Corredor','do Plantão','do Gabinete','da Pasta Vermelha','do Recesso','da Última Instância'];
const constraints=[
 'Inclua uma rima no argumento.','Comece dizendo “segundo minha avó”.','Encerre com um slogan inventado.','Use uma metáfora culinária.',
 'Compare o caso a um problema de condomínio.','Faça uma pergunta e responda como outro personagem.','Dê um apelido absurdo ao plano da acusação.',
 'Use as palavras abacaxi e protocolo.','Termine oferecendo um conselho que não ajuda ninguém.','Anuncie uma pausa dramática e continue imediatamente.'
];
const sabotageKinds=['blockSwap','shorten','limitAction','openEvidence','blockCorruption','blockTime','blockRefute','blockTwist'];
const sabotageNames=['Cartório sem Troco','Ampulheta Furada','Petição pela Metade','Lacre de Vidro','Pix fora do Ar','Hora Extra Negada','Recurso Engavetado','Destino em Manutenção'];
const corruptionKinds=['forceReject','forceApprove','forceBluff','favor','forceBluffEvidence','forceBluffWitness','forceApproveSelf','forceRejectSabotage','waiveShame','blockJudgePause'];
const corruptionNames=['Parecer Encomendado','Aplauso de Gabinete','Martelo Amigo','Parente na Magistratura','Laudo Patrocinado','Depoimento com Padrinho','Palco Comprado','Rasteira Judicial','Anistia de Envelope','Audiência sem Intervalo'];
const orderKinds=['time','cleanShame','extraSwap','drawExtra','redrawEvidence','redrawWitness','protectTime','protectSwap','clearSabotage','rehearse'];
const orderNames=['Prorrogação do Cafezinho','Banho de Reputação','Balcão de Trocas','Anexo de Última Hora','Perícia Renovada','Nova Intimação','Relógio Blindado','Troca Garantida','Liminar Antissabotagem','Ensaio Liberado'];
const refuteKinds=['shield','clearSabotage','cleanShame','blockNextChallenge','protectSwap','protectTime','reflectChallenge','simplifyChallenge','tradeChallenge','extraSwap'];
const refuteNames=['Objeção de Bolso','Sabotagem sem Efeito','Pedido de Decoro','Desafio Inadmissível','Direito de Troca','Prazo Intocável','Devolva ao Remetente','Menos Teatro, Excelência','Troca de Personagem','Recurso ao Baralho'];
const twistKinds=['redraw','redrawTwo','redrawEvidence','redrawWitness','drawExtra','discardForTime','shameForTime','timeForClean','reshuffleSupport','wildProof'];
const twistNames=['Pasta Trocada','Autos no Ventilador','Laudo que Chegou Agora','Testemunha no Elevador','Bolso sem Fundo','Documento por Minutos','Vergonha com Hora Extra','Silêncio Reparador','Destino Recalculado','Achado na Gaveta'];
const instructions:Record<string,(amount:number)=>string>={
 blockSwap:()=> 'Na próxima preparação do adversário, bloqueie a troca opcional de carta. O botão de troca fica indisponível até terminar a fala dele.',
 shorten:n=>`Reduza a próxima fala do adversário em ${n} segundos. O tempo nunca fica abaixo de 30 segundos.`,
 limitAction:()=> 'Na próxima preparação do adversário, limite o uso a uma carta. Ele continua podendo trocar uma carta e argumentar normalmente.',
 openEvidence:()=> 'Na próxima fala do adversário, evidências e testemunhas que ele apresentar já entram com o texto original aberto para todos.',
 blockCorruption:()=> 'Na próxima preparação do adversário, impeça o envio de cartas de Corrupção. As outras categorias continuam liberadas.',
 blockTime:()=> 'Na próxima preparação do adversário, impeça cartas que acrescentem tempo à fala. O relógio normal continua funcionando.',
 blockRefute:()=> 'Na próxima preparação do adversário, bloqueie cartas da categoria Refutações. As demais cartas continuam permitidas.',
 blockTwist:()=> 'Na próxima preparação do adversário, bloqueie cartas da categoria Reviravoltas. Não afeta o sorteio da mão seguinte.',
 forceReject:n=>`O juiz deverá reprovar ${n===1?'a próxima tarefa de atuação do adversário':`as próximas ${n} tarefas de atuação do adversário`}, na avaliação ao final da fala dele. O botão Cumpriu será bloqueado.`,
 forceApprove:n=>`O juiz deverá aprovar ${n===1?'sua próxima tarefa de atuação':`suas próximas ${n} tarefas de atuação`}, ao final da sua fala. O botão Não cumpriu será bloqueado.`,
 forceBluff:n=>`A decisão de BLEFE deverá favorecer você ${n===1?'na próxima contestação':`nas próximas ${n} contestações`} em que participar, apresentando ou contestando uma carta. A opção contrária ficará bloqueada.`,
 favor:()=> 'O juiz deve fazer uma defesa verbal do seu próximo argumento e marcar a ordem como cumprida. Esta carta não altera votos nem decide o veredito.',
 forceBluffEvidence:n=>`Favoreça você ${n===1?'na próxima decisão':`nas próximas ${n} decisões`} de BLEFE envolvendo uma Evidência. Não vale para Testemunhas.`,
 forceBluffWitness:n=>`Favoreça você ${n===1?'na próxima decisão':`nas próximas ${n} decisões`} de BLEFE envolvendo uma Testemunha. Não vale para Evidências.`,
 forceApproveSelf:n=>`Aprove ${n===1?'a próxima atuação voluntária':`as próximas ${n} atuações voluntárias`} que você fizer com carta de Interpretação. Não vale para desafios impostos pelo adversário.`,
 forceRejectSabotage:n=>`Reprove ${n===1?'o próximo desafio':`os próximos ${n} desafios`} que o adversário receber por Sabotagem, ao final da fala dele. Não afeta atuações voluntárias.`,
 waiveShame:n=>`Cancele ${n===1?'a próxima Ficha de Vergonha':`as próximas ${n} Fichas de Vergonha`} que você receber. A proteção é consumida somente quando uma ficha seria aplicada.`,
 blockJudgePause:()=> 'Na sua próxima fala, o juiz não pode pausar manualmente o relógio. BLEFE continua pausando normalmente, e o juiz ainda pode encerrar a fala.',
 time:n=>`Acrescente ${n} segundos à fala que está preparando, até o limite de 90 segundos.`,
 cleanShame:n=>`Remova até ${Math.min(2,n)} Ficha(s) de Vergonha sua(s). Isso não desfaz uma penalidade de ação já aplicada.`,
 extraSwap:()=> 'Ganhe uma troca opcional extra nesta preparação. A carta nova mantém a categoria da descartada para não sumirem suas testemunhas.',
 drawExtra:()=> 'Compre uma carta de apoio extra, com função diferente das cartas que já tem. A mão pode ficar com até cinco cartas; o limite de duas jogadas continua.',
 redrawEvidence:()=> 'Substitua uma Evidência que ainda está na sua mão por outra Evidência inédita nesta partida. Não altera uma carta já apresentada.',
 redrawWitness:()=> 'Substitua uma Testemunha que ainda está na sua mão por outra Testemunha inédita nesta partida. Não altera depoimentos já apresentados.',
 protectTime:()=> 'Cancele uma redução de tempo ativa sobre sua próxima fala e impeça novos cortes até essa fala terminar.',
 protectSwap:()=> 'Cancele o bloqueio de troca que pesa sobre sua preparação e proteja suas trocas até sua fala terminar.',
 clearSabotage:()=> 'Cancele a sabotagem mecânica mais recente aplicada a você para esta fala. Não cancela uma tarefa de atuação nem uma corrupção secreta.',
 rehearse:()=> 'Prepare uma atuação voluntária surpresa: o servidor sorteia uma tarefa de Interpretação e mostra a instrução só a você. O juiz avalia ao final.',
 shield:()=> 'Cancele uma tarefa de atuação ativa sobre você nesta fala. Se não houver tarefa, remova uma Ficha de Vergonha.',
 blockNextChallenge:()=> 'Cancele uma tarefa de atuação ativa sobre você; se não houver, bloqueie a próxima tarefa que chegar antes de sua fala terminar.',
 reflectChallenge:()=> 'Cancele um desafio recebido por Sabotagem e devolva a mesma tarefa para a próxima fala do adversário. Se não houver fala futura, apenas cancele.',
 simplifyChallenge:()=> 'Retire a exigência adicional de uma tarefa de atuação sua: mantenha o personagem, mas dispense a rima, frase ou final obrigatório.',
 tradeChallenge:()=> 'Troque uma tarefa de atuação ativa sobre você por um personagem surpresa. O novo desafio mantém a avaliação ao final da sua fala.',
 redraw:()=> 'Descarte uma carta restante aleatória e receba outra inédita da mesma categoria. Esta jogada conta como uma ação.',
 redrawTwo:()=> 'Substitua até duas cartas restantes por cartas inéditas das mesmas categorias. Não altera as cartas que já foram jogadas.',
 discardForTime:n=>`Descarte uma carta restante aleatória para acrescentar ${n} segundos à fala, com teto de 90 segundos. Se não houver carta restante, não ganha tempo.`,
 shameForTime:n=>`Receba uma Ficha de Vergonha para ganhar ${n} segundos de fala, com teto de 90 segundos. A terceira ficha mantém a penalidade normal.`,
 timeForClean:n=>`Troque ${n} segundos da sua fala por remover uma Ficha de Vergonha. A fala nunca fica abaixo de 30 segundos.`,
 reshuffleSupport:()=> 'Troque até duas cartas de apoio restantes por funções diferentes. Sua Evidência e sua Testemunha ficam na mão.',
 wildProof:()=> 'Compre uma Evidência ou Testemunha inédita, escolhida pelo servidor, como carta extra. A mão pode ter até cinco cartas; jogá-la ainda custa uma ação.'
};
export function buildCards():Card[]{
 const cards:Card[]=[];
 for(let cat=0;cat<8;cat++)for(let i=0;i<100;i++){
  let name='',text='',effect='present',target='próprio',duel=true,actorText: string|undefined;
  let amount=1+(Math.floor(i/10)%2),family='';
  if(cat<2){const story=(cat===0?evidenceStories:witnessStories)[i];name=story.name;text=cat===1?`“${story.text}”`:story.text;family=cat===0?'evidence':'witness';}
  if(cat===2){
   if(i<60){const role=i===50?'uma aula de zumba':i===42?performanceRoles[50]:performanceRoles[(i*17)%100];const condition=i===50?'Encerre com um slogan.':constraints[Math.floor(i/6)];name=`Armadilha: ${role.replace(/^(um|uma) /,'')}`;actorText=`Na sua próxima fala, encene ${role}. ${condition}`;text=`Imponha ao adversário: ${actorText}`;effect='challenge';family='challenge';duel=false;}
   else{const n=(i-60)%8,v=Math.floor((i-60)/8);effect=sabotageKinds[n];name=`${sabotageNames[n]} — ${['sem carimbo','sem senha','sem protocolo','sem testemunha','sem aviso'][v]}`;amount=5+v*2;text=instructions[effect](amount);family=effect;}
   target='adversário';
  }
  if(cat===3){const n=i%10,v=Math.floor(i/10);effect=corruptionKinds[n];if(['favor','blockJudgePause'].includes(effect))amount=1;name=`${corruptionNames[n]} ${flourishes[v]}`;text=instructions[effect](amount);target='juiz';duel=false;family=effect;}
  if(cat===4||cat===5||cat===7){
   const kinds=cat===4?orderKinds:cat===5?refuteKinds:twistKinds,n=i%10,v=Math.floor(i/10);
   effect=kinds[n];name=`${(cat===4?orderNames:cat===5?refuteNames:twistNames)[n]} ${flourishes[v]}`;
   if(cat===4&&i===75)effect='time';
   amount=['time','discardForTime','timeForClean'].includes(effect)?(i===75&&cat===4?12:5+v):effect==='shameForTime'?12+v:1+(v%2);
   text=instructions[effect](amount);family=effect;
   if(effect==='rehearse')duel=false;
  }
  if(cat===6){const role=performanceRoles[i];effect='challengeSelf';name=`Em cena: ${role.replace(/^(um|uma) /,'')}`;actorText=`Na sua próxima fala, encene ${role}. ${constraints[(i*3+1)%10]}`;text=actorText+' O juiz avalia ao final: +1 ponto se cumprir.';duel=false;family='challenge';}
  cards.push({id:`${cat}-${i}`,name,type:types[cat],icon:icons[cat],text,effect,target,amount,family,actorText,duel,timing:'na preparação da sua fala, antes de confirmar que está pronto',duration:cat===3?'até cumprir a quantidade indicada ou terminar o julgamento':cat===2||['protectTime','protectSwap','blockNextChallenge'].includes(effect)?'até terminar a fala afetada':'imediata',visibility:cat===3?'somente autor e juiz':'pública'});
 }
 return cards;
}

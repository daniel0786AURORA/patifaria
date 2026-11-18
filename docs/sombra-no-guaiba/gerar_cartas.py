"""Gera cartas.json: eventos, itens, perfis do espião e papéis dos detetives de Sombra no Guaíba.

Os locais são escritos pelo nome curto do mapa e convertidos para os ids de mapa.json.
O script falha se algum nome não existir ou se um efeito usar um tipo desconhecido.

Uso: python3 gerar_cartas.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
MAPA = json.load(open(os.path.join(HERE, "mapa.json")))
ID = {n["curto"]: n["id"] for n in MAPA["locais"]}
ZONAS = set(MAPA["zonas"])
LINHAS = {l["id"] for l in MAPA["conexoes"]["onibus"]["linhas"]}

# ------------------------------------------------------------------------------------------
# Tipos de efeito que o motor do jogo precisa implementar
EFEITOS = {
    "agl":               "Soma `valor` à lotação dos `locais`.",
    "agl_vizinhos":      "Soma `valor` à lotação dos vizinhos a pé de `local`.",
    "agl_zona":          "Soma `valor` à lotação de todos os locais das `zonas`.",
    "agl_tipo":          "Soma `valor` à lotação de todos os locais do `tipo_area`.",
    "agl_global":        "Soma `valor` à lotação de todos os locais.",
    "ignora_madrugada":  "Os `locais` não sofrem o −2 de madrugada.",
    "viatura_custo":     "Viatura custa `valor` PA a mais nas `zonas` (ou `locais`).",
    "viatura_proibida":  "Viaturas não entram nos `locais` (ou `zonas`).",
    "transporte_fechado": "Fecha o `modo` (onibus, trem, barco, bike, app). `linhas` restringe a linhas de ônibus; `trecho` restringe a paradas.",
    "transporte_horario": "Mantém o `modo` (ou `linhas`) aberto até a rodada `ate`.",
    "local_fechado":     "Ninguém entra nem sai dos `locais` por terra.",
    "vira_loja":         "Os `locais` passam a permitir Trocar Disfarce.",
    "vira_esconderijo":  "Os `locais` passam a permitir Esconder-se.",
    "disfarce_custo":    "Disfarce custa `valor` R$ a mais (negativo = desconto) nos `locais`.",
    "denuncia_mod":      "Soma `valor` pontos percentuais à chance de denúncia (em `zonas`, se houver).",
    "retrato_global":    "Retrato Falado ativo em todas as zonas.",
    "camera_off":        "Câmeras desligadas (em `zonas`/`locais`, ou numa zona sorteada se `sorteio`).",
    "camera_mod":        "Soma `valor` pontos percentuais ao alerta de câmera (em `zonas`).",
    "caixa_off":         "Caixas eletrônicos desligados (mesma área de camera_off).",
    "interceptar_bloqueado": "Nenhuma interceptação nesta rodada; as transmissões não envelhecem.",
    "interceptar_bonus": "A transmissão mais antiga da fila ganha `valor` pontos percentuais.",
    "exposicao":         "Soma `valor` à Exposição do espião.",
    "revela_tipo_pista": "Revela publicamente o tipo da última pista recolhida.",
    "orcamento":         "Soma `valor` créditos ao Orçamento dos detetives.",
    "dinheiro_espiao":   "Soma `valor` R$ ao dinheiro do espião.",
    "movimento_extra":   "O espião pode se mover 2 vezes nesta rodada (2 bilhetes).",
    "app_gratis":        "Uma viagem de App grátis para o espião nesta rodada.",
    "app_custo":         "App custa `valor` R$ a mais.",
    "barco_clandestino": "Barcos operam fora do horário para o espião, a R$ `valor`.",
    "interrogar_gratis": "Os detetives ganham um Interrogar grátis, com alcance `alcance`, em qualquer local.",
    "bloqueio_gratis":   "Os detetives ganham `quantidade` Bloqueio(s) grátis por `duracao` rodadas.",
    "movimento_detetive": "Um detetive move de graça até um local das `zonas`.",
    "contato_extra":     "Um contato candidato não sorteado recebe cópia de uma pista ONDE ainda não recolhida.",
    "silencio_suspenso": "A regra de zona quente (denúncia ×0,5, Interrogar bloqueado) fica suspensa nos `locais`.",
    "assalto_mod":       "Soma `valor` pontos percentuais à chance de assalto em zona quente.",
    "nenhum":            "Sem efeito.",
}

def L(*nomes):
    for n in nomes:
        assert n in ID, f"local desconhecido: {n}"
    return [ID[n] for n in nomes]

# ------------------------------------------------------------------------------------------
# Eventos agendados: 4 por partida, agenda pública. Cartas do mesmo `grupo` não saem juntas.
AGENDADOS = [
 dict(id="grenal-arena", grupo="grenal", nome="Gre-Nal na Arena", rodadas=[10, 12],
      texto="Clássico em Humaitá. A Zona Norte para.",
      sabor="Quarenta mil pessoas de azul e vermelho, e ninguém olhando para o lado.",
      efeitos=[dict(tipo="agl", locais=L("Arena"), valor=3), dict(tipo="agl_vizinhos", local=ID["Arena"], valor=1),
               dict(tipo="viatura_custo", zonas=["NOR"], valor=1)]),
 dict(id="grenal-beirario", grupo="grenal", nome="Gre-Nal no Beira-Rio", rodadas=[10, 12],
      texto="Clássico na beira do Guaíba. A orla vira um mar de gente.",
      sabor="Do Gasômetro ao Iberê, só se ouve o estádio.",
      efeitos=[dict(tipo="agl", locais=L("Beira-Rio"), valor=3), dict(tipo="agl_vizinhos", local=ID["Beira-Rio"], valor=1),
               dict(tipo="viatura_custo", zonas=["CBX", "SUL"], valor=1)]),
 dict(id="show-por-do-sol", nome="Show no Anfiteatro Pôr do Sol", rodadas=[12, 14],
      texto="Show gratuito na orla, bem na hora do pôr do sol.",
      sabor="O sol cai atrás do Guaíba e o palco acende.",
      efeitos=[dict(tipo="agl", locais=L("Pôr do Sol"), valor=3), dict(tipo="agl", locais=L("Gasômetro", "Harmonia", "Parque Marinha"), valor=1)]),
 dict(id="feira-do-livro", nome="Feira do Livro", rodadas=[4, 12],
      texto="Barracas de livros tomam a Praça da Alfândega.",
      sabor="Entre sebos e autógrafos, um envelope passa de mão em mão.",
      efeitos=[dict(tipo="agl", locais=L("Alfândega"), valor=2), dict(tipo="agl", locais=L("Casa de Cultura", "Mercado Público"), valor=1),
               dict(tipo="contato_extra")]),
 dict(id="brique", nome="Brique da Redenção", rodadas=[3, 8],
      texto="Domingo de Brique: antiguidades, artesanato e chimarrão.",
      sabor="Tem disfarce para vender em qualquer barraca.",
      efeitos=[dict(tipo="agl", locais=L("Redenção"), valor=2), dict(tipo="vira_loja", locais=L("Redenção")),
               dict(tipo="agl", locais=L("Bom Fim"), valor=1)]),
 dict(id="acampamento-farroupilha", nome="Acampamento Farroupilha", rodadas=[8, 16],
      texto="Piquetes, cavalos e churrasco no Parque Harmonia.",
      sabor="Ninguém estranha um forasteiro de bombacha.",
      efeitos=[dict(tipo="agl", locais=L("Harmonia"), valor=3), dict(tipo="viatura_custo", zonas=["CBX"], valor=1),
               dict(tipo="vira_loja", locais=L("Harmonia"))]),
 dict(id="carnaval-porto-seco", nome="Carnaval no Porto Seco", rodadas=[19, 23],
      texto="Desfile das escolas de samba vara a madrugada.",
      sabor="Fantasia é o melhor disfarce que existe.",
      efeitos=[dict(tipo="agl", locais=L("Porto Seco"), valor=5), dict(tipo="ignora_madrugada", locais=L("Porto Seco")),
               dict(tipo="transporte_horario", modo="onibus", linhas=["L11", "L1"], ate=24), dict(tipo="vira_loja", locais=L("Porto Seco"))]),
 dict(id="procissao-navegantes", nome="Procissão de Navegantes", rodadas=[5, 8],
      texto="A procissão fluvial e a romaria tomam a Zona Norte.",
      sabor="Barcos enfeitados no rio, fiéis na Av. Farrapos.",
      efeitos=[dict(tipo="agl", locais=L("Navegantes", "São Pedro", "Cais Mauá"), valor=2),
               dict(tipo="viatura_proibida", locais=L("Navegantes", "Farrapos"))]),
 dict(id="maratona", nome="Maratona de Porto Alegre", rodadas=[1, 4],
      texto="Corredores ocupam a orla desde cedo.",
      sabor="Quem corre de tênis e boné passa despercebido.",
      efeitos=[dict(tipo="agl", locais=L("Gasômetro", "Pôr do Sol", "Parque Marinha", "Beira-Rio", "Iberê Camargo"), valor=1),
               dict(tipo="viatura_proibida", locais=L("Gasômetro", "Pôr do Sol", "Parque Marinha", "Beira-Rio", "Iberê Camargo"))]),
 dict(id="festival-ipanema", nome="Festival de Verão em Ipanema", rodadas=[12, 16],
      texto="Palco na areia e a orla da Zona Sul lotada.",
      sabor="Guarda-sol, caixa de som e um barco esperando no fim da praia.",
      efeitos=[dict(tipo="agl", locais=L("Ipanema"), valor=3), dict(tipo="agl", locais=L("Pedra Redonda", "Guarujá", "Tristeza"), valor=1)]),
 dict(id="grande-premio", nome="Grande Prêmio no Hipódromo", rodadas=[9, 13],
      texto="O páreo mais importante do ano no Cristal.",
      sabor="Chapéus, binóculos e apostas: todo mundo olha para a pista.",
      efeitos=[dict(tipo="agl", locais=L("Hipódromo"), valor=3), dict(tipo="agl", locais=L("Cristal", "BarraShopping"), valor=1)]),
 dict(id="vestibular", nome="Dia de Vestibular", rodadas=[7, 11],
      texto="Milhares de candidatos nos campi da UFRGS e da PUCRS.",
      sabor="Mochila nas costas e cara de nervoso: igual a todo mundo.",
      efeitos=[dict(tipo="agl", locais=L("UFRGS", "PUCRS", "Campus do Vale"), valor=2), dict(tipo="viatura_custo", zonas=["LES"], valor=1)]),
 dict(id="parada-livre", nome="Parada Livre", rodadas=[9, 14],
      texto="A parada colorida sai da Redenção e segue pelo Bom Fim.",
      sabor="Glitter, música e uma multidão que não para de crescer.",
      efeitos=[dict(tipo="agl", locais=L("Redenção"), valor=3), dict(tipo="agl", locais=L("Bom Fim", "Cidade Baixa"), valor=2),
               dict(tipo="viatura_proibida", locais=L("Redenção", "Bom Fim"))]),
]

# ------------------------------------------------------------------------------------------
# Baralho aleatório: 1 carta por rodada a partir da rodada 2. `copias` = quantas no baralho.
# `rodadas_validas`: se sair fora delas, descarta e compra outra.
ALEATORIOS = [
 # Trânsito e transporte
 dict(id="engarrafamento-perimetral", cat="transito", copias=2, duracao=2, nome="Engarrafamento na III Perimetral",
      texto="Tudo parado entre o Aeroporto e o Cristal.", efeitos=[dict(tipo="viatura_custo", zonas=["MOI", "LES"], valor=1)]),
 dict(id="freeway-parada", cat="transito", copias=1, duracao=2, nome="Freeway parada",
      texto="Acidente na saída da cidade. A ponte trava.", efeitos=[dict(tipo="local_fechado", locais=L("Ponte do Guaíba")), dict(tipo="transporte_fechado", modo="onibus", linhas=["L13"])]),
 dict(id="vao-movel", cat="transito", copias=1, duracao=1, nome="Vão móvel da ponte içado",
      texto="A ponte do Guaíba levanta para um navio passar.", sabor="Vinte minutos com a cidade cortada em duas.",
      efeitos=[dict(tipo="local_fechado", locais=L("Ponte do Guaíba"))]),
 dict(id="greve-onibus", cat="transito", copias=1, duracao=3, nome="Greve de ônibus",
      texto="Rodoviários cruzam os braços. Estações do trem lotam.", efeitos=[dict(tipo="transporte_fechado", modo="onibus"), dict(tipo="agl", locais=L("Mercado Público", "Rodoviária", "São Pedro", "Farrapos", "Aeroporto", "Ceasa"), valor=1)]),
 dict(id="pane-trensurb", cat="transito", copias=1, duracao=2, nome="Pane no Trensurb",
      texto="Trens parados entre o Mercado e o Aeroporto.", efeitos=[dict(tipo="transporte_fechado", modo="trem")]),
 dict(id="obras-bento", cat="transito", copias=1, duracao=2, nome="Obras na Av. Bento Gonçalves",
      texto="Desvio na Bento. A linha L3 não passa do Partenon.", efeitos=[dict(tipo="transporte_fechado", modo="onibus", linhas=["L3"], trecho=L("PUCRS", "São José", "Campus do Vale", "Lomba do Pinheiro"))]),
 dict(id="acidente-assis-brasil", cat="transito", copias=1, duracao=2, nome="Acidente na Av. Assis Brasil",
      texto="Corredor de ônibus interditado na Zona Norte.", efeitos=[dict(tipo="transporte_fechado", modo="onibus", linhas=["L1"]), dict(tipo="viatura_custo", zonas=["NOR"], valor=1)]),
 dict(id="blitz-eptc", cat="transito", copias=2, duracao=2, nome="Blitz da EPTC",
      texto="Fiscalização em todas as saídas. Motoristas de app desconfiados.", efeitos=[dict(tipo="bloqueio_gratis", quantidade=1, duracao=2), dict(tipo="app_custo", valor=1)]),
 # Clima
 dict(id="chuva-forte", cat="clima", copias=2, duracao=2, nome="Chuva forte",
      texto="Temporal sobre a cidade. As ruas esvaziam.", sabor="A chuva apaga pegadas.",
      efeitos=[dict(tipo="agl_global", valor=-1), dict(tipo="transporte_fechado", modo="barco"), dict(tipo="transporte_fechado", modo="bike"), dict(tipo="nenhum", nota="Helicóptero proibido; Investigar só lê 4 rodadas.")]),
 dict(id="alagamento-centro", cat="clima", copias=1, duracao=3, nome="Alagamento no Centro",
      texto="O Guaíba sobe e invade o Centro Histórico.", sabor="O muro da Mauá nunca pareceu tão pequeno.",
      efeitos=[dict(tipo="viatura_proibida", locais=L("Mercado Público", "Cais Mauá", "Embarcadero", "Gasômetro", "Rodoviária")),
               dict(tipo="agl", locais=L("Mercado Público", "Cais Mauá", "Embarcadero", "Gasômetro", "Rodoviária"), valor=-2),
               dict(tipo="transporte_fechado", modo="trem", trecho=L("Mercado Público"))]),
 dict(id="cheia-ilhas", cat="clima", copias=1, duracao=3, nome="Cheia nas Ilhas",
      texto="As ilhas do Delta ficam isoladas pela água.", efeitos=[dict(tipo="local_fechado", locais=L("Ilha dos Marinheiros", "Ilha da Pintada", "Ilha das Flores")), dict(tipo="transporte_fechado", modo="barco")]),
 dict(id="enchente-extremo-sul", cat="clima", copias=1, duracao=2, nome="Estrada alagada no Extremo Sul",
      texto="A estrada do Lami some debaixo d'água.", efeitos=[dict(tipo="transporte_fechado", modo="onibus", linhas=["L10"]), dict(tipo="viatura_proibida", zonas=["EXT"])]),
 dict(id="minuano", cat="clima", copias=2, duracao=2, nome="Minuano",
      texto="Vento gelado do sul. Ninguém fica na rua.", efeitos=[dict(tipo="agl_tipo", tipo_area="lazer", valor=-1), dict(tipo="agl_tipo", tipo_area="boemio", valor=1), dict(tipo="transporte_fechado", modo="barco")]),
 dict(id="calorao", cat="clima", copias=2, duracao=2, nome="Calorão de 40 graus",
      texto="Todo mundo foge para a orla e para os shoppings.", efeitos=[dict(tipo="agl", locais=L("Ipanema", "Pôr do Sol", "Parque Marinha", "Lami"), valor=2), dict(tipo="agl", locais=L("Praia de Belas", "Iguatemi", "BarraShopping", "Bourbon Wallig"), valor=1)]),
 dict(id="neblina", cat="clima", copias=1, duracao=2, nome="Neblina no Guaíba",
      texto="Não se vê a outra margem. Voos atrasados.", efeitos=[dict(tipo="transporte_fechado", modo="barco"), dict(tipo="agl", locais=L("Aeroporto"), valor=2), dict(tipo="camera_off", locais=L("Cais Mauá", "Gasômetro", "Pôr do Sol", "Ipanema"))]),
 # Cidade
 dict(id="manifestacao", cat="cidade", copias=2, duracao=2, nome="Manifestação na Esquina Democrática",
      texto="Protesto fecha o Centro.", efeitos=[dict(tipo="agl", locais=L("Mercado Público", "Alfândega"), valor=3), dict(tipo="viatura_proibida", zonas=["CEN"])]),
 dict(id="apagao", cat="cidade", copias=2, duracao=2, nome="Apagão no bairro",
      texto="Uma zona inteira fica no escuro.", efeitos=[dict(tipo="camera_off", sorteio=True), dict(tipo="caixa_off", sorteio=True), dict(tipo="denuncia_mod", valor=-10)]),
 dict(id="festa-cidade-baixa", cat="cidade", copias=2, duracao=2, nome="Festa na Cidade Baixa", rodadas_validas=[14, 22],
      texto="A República está fechada de tanta gente.", efeitos=[dict(tipo="agl", locais=L("Cidade Baixa"), valor=2), dict(tipo="agl", locais=L("Bom Fim", "Padre Chagas"), valor=1)]),
 dict(id="feirao-shopping", cat="cidade", copias=2, duracao=2, nome="Feirão no shopping",
      texto="Promoção relâmpago num shopping sorteado.", efeitos=[dict(tipo="agl", locais=L("Praia de Belas", "Iguatemi", "BarraShopping", "Bourbon Ipiranga", "Bourbon Wallig", "Parcão"), valor=2, sorteio=1),
                                                                   dict(tipo="disfarce_custo", valor=-1, mesmo_local=True)]),
 dict(id="show-araujo-vianna", cat="cidade", copias=1, duracao=2, nome="Show no Araújo Vianna", rodadas_validas=[14, 19],
      texto="Noite de show dentro da Redenção.", efeitos=[dict(tipo="agl", locais=L("Redenção"), valor=2), dict(tipo="vira_esconderijo", locais=L("Redenção"))]),
 dict(id="jogo-na-tv", cat="cidade", copias=1, duracao=1, nome="Jogo da dupla na TV",
      texto="A cidade inteira para na frente da televisão.", sabor="Rua vazia, bar lotado.",
      efeitos=[dict(tipo="agl_global", valor=-1), dict(tipo="agl_tipo", tipo_area="boemio", valor=2)]),
 dict(id="feira-ecologica", cat="cidade", copias=1, duracao=2, nome="Feira Ecológica do Bom Fim", rodadas_validas=[2, 6],
      texto="Sábado de manhã: orgânicos na José Bonifácio.", efeitos=[dict(tipo="agl", locais=L("Bom Fim", "Redenção"), valor=2)]),
 dict(id="madrugada-ceasa", cat="cidade", copias=1, duracao=2, nome="Madrugada de carga na Ceasa", rodadas_validas=[19, 24],
      texto="Caminhões chegam do interior. A Ceasa ferve.", efeitos=[dict(tipo="agl", locais=L("Ceasa", "Anchieta"), valor=2), dict(tipo="app_gratis")]),
 dict(id="onibus-lotado-restinga", cat="cidade", copias=1, duracao=1, nome="Terminal da Restinga lotado", rodadas_validas=[2, 4],
      texto="Hora de ir trabalhar: filas no terminal.", efeitos=[dict(tipo="agl", locais=L("Restinga"), valor=2)]),
 dict(id="por-do-sol-gasometro", cat="cidade", copias=1, duracao=1, nome="Pôr do sol no Gasômetro", rodadas_validas=[11, 14],
      texto="Todo mundo para olhar o sol cair no Guaíba.", efeitos=[dict(tipo="agl", locais=L("Gasômetro", "Pôr do Sol"), valor=2)]),
 dict(id="operacao-morro", cat="cidade", copias=1, duracao=2, nome="Operação policial em zona quente",
      texto="A Brigada ocupa uma zona quente sorteada.", efeitos=[dict(tipo="silencio_suspenso", locais=L("Vila Cruzeiro", "Bom Jesus", "Lomba do Pinheiro", "Rubem Berta", "Mário Quintana", "Restinga"), sorteio=1),
                                                                dict(tipo="agl", locais=[], valor=-1, mesmo_local=True)]),
 # Mídia, polícia e informantes
 dict(id="vazamento", cat="midia", copias=1, duracao=0, nome="Vazamento na imprensa",
      texto="Um jornal publica que há um espião na cidade.", efeitos=[dict(tipo="exposicao", valor=1), dict(tipo="revela_tipo_pista")]),
 dict(id="retrato-jornal", cat="midia", copias=1, duracao=3, nome="Retrato no jornal",
      texto="O retrato falado sai na capa.", efeitos=[dict(tipo="retrato_global")]),
 dict(id="informante", cat="policia", copias=2, duracao=0, nome="Informante anônimo",
      texto="Uma ligação para o disque-denúncia.", efeitos=[dict(tipo="interrogar_gratis", alcance=3)]),
 dict(id="disque-saturado", cat="policia", copias=1, duracao=2, nome="Disque-denúncia saturado",
      texto="Trote atrás de trote. As denúncias se perdem.", efeitos=[dict(tipo="denuncia_mod", valor=-10)]),
 dict(id="corte-verbas", cat="policia", copias=1, duracao=0, nome="Corte de verbas",
      texto="O governo congela o orçamento da força-tarefa.", efeitos=[dict(tipo="orcamento", valor=-3)]),
 dict(id="reforco-brigada", cat="policia", copias=1, duracao=3, nome="Reforço da Brigada Militar",
      texto="Viaturas extras nas ruas.", efeitos=[dict(tipo="bloqueio_gratis", quantidade=1, duracao=3)]),
 dict(id="radio-amador", cat="policia", copias=1, duracao=0, nome="Rádio-amador xereta",
      texto="Um radioamador grava parte de uma transmissão.", efeitos=[dict(tipo="interceptar_bonus", valor=25)]),
 dict(id="queda-sinal", cat="policia", copias=1, duracao=1, nome="Queda de sinal",
      texto="Torres de celular fora do ar.", efeitos=[dict(tipo="interceptar_bloqueado")]),
 dict(id="camera-quebrada", cat="policia", copias=1, duracao=3, nome="Câmera quebrada",
      texto="Vandalismo derruba uma câmera sorteada.", efeitos=[dict(tipo="camera_off", sorteio=True, um_local=True)]),
 dict(id="operacao-orla", cat="policia", copias=1, duracao=0, nome="Operação na orla",
      texto="A polícia ganha apoio para patrulhar a Zona Sul.", efeitos=[dict(tipo="movimento_detetive", zonas=["SUL", "EXT"])]),
 # A favor do espião
 dict(id="simpatizante", cat="rede", copias=1, duracao=0, nome="Simpatizante da rede",
      texto="Alguém oferece carona sem fazer perguntas.", efeitos=[dict(tipo="movimento_extra")]),
 dict(id="caminhoneiro", cat="rede", copias=1, duracao=0, nome="Carona de caminhoneiro",
      texto="Um frete vai para onde o espião precisa.", efeitos=[dict(tipo="app_gratis")]),
 dict(id="barqueiro", cat="rede", copias=1, duracao=2, nome="Barqueiro clandestino",
      texto="Um pescador das Ilhas leva qualquer um, a qualquer hora.", efeitos=[dict(tipo="barco_clandestino", valor=3)]),
 dict(id="envelope-extra", cat="rede", copias=1, duracao=0, nome="Envelope extra",
      texto="A rede deixa uma cópia de uma pista em outro lugar.", efeitos=[dict(tipo="contato_extra")]),
 dict(id="dinheiro-rede", cat="rede", copias=1, duracao=0, nome="Remessa da rede",
      texto="Um envelope com dinheiro aparece no bolso do casaco.", efeitos=[dict(tipo="dinheiro_espiao", valor=3)]),
 dict(id="calmaria", cat="neutro", copias=2, duracao=0, nome="Calmaria",
      texto="Nada acontece. Um alívio...", efeitos=[dict(tipo="nenhum")]),
]

# ------------------------------------------------------------------------------------------
ITENS = [
 dict(id="grampo", nome="Grampo", custo=3, texto="Instale num Ponto de Contato (1 PA). Se o espião recolher ali: local exato e conteúdo decifrado na hora."),
 dict(id="retrato", nome="Retrato Falado", custo=2, texto="Por 3 rodadas: +15% de denúncia numa zona."),
 dict(id="ceic", nome="Monitoramento CEIC", custo=3, texto="Por 2 rodadas: câmeras de uma zona com 50% de alerta."),
 dict(id="k9", nome="Cão K9", custo=3, usos=3, texto="Investigar alcança 12 rodadas e mostra o próximo local do rastro."),
 dict(id="drone", nome="Drone", custo=4, usos=1, texto="Escolha um local: diz se o espião está nele ou num vizinho (sem dizer qual)."),
 dict(id="quebra-sigilo", nome="Quebra de Sigilo Telemático", custo=4, usos=1, texto="Revela origem, destino e rodada da última corrida de App do espião."),
 dict(id="escuta-movel", nome="Escuta Móvel", custo=3, texto="Este detetive pode Interceptar de qualquer lugar. Permanente."),
 dict(id="decodificador", nome="Decodificador", custo=5, texto="+20% em todas as interceptações do time. Permanente."),
 dict(id="cones", nome="Cones de Barreira", custo=2, texto="Bloqueio sem detetive num local vizinho por 3 rodadas. Se o espião entrar a pé, é avistado."),
 dict(id="lancha", nome="Lancha da Patrulha Fluvial", custo=3, texto="Nesta rodada o time usa as travessias de barco (2 PA), em qualquer horário."),
 dict(id="helicoptero", nome="Helicóptero Águia", custo=6, usos=1, texto="Um detetive vai a qualquer local por 0 PA. Proibido com chuva forte."),
]
PERFIS = [
 dict(id="sombra", nome="Sombra", especialidade="Infiltração", texto="Disfarce custa R$ 1. A primeira denúncia da partida é ignorada."),
 dict(id="corredor", nome="Corredor", especialidade="Logística", texto="Uma viagem de ônibus ou Trensurb grátis por rodada. App custa R$ 2."),
 dict(id="criptografo", nome="Criptógrafo", especialidade="Comunicação", texto="Interceptar suas transmissões tem −15%. Pode usar Mensagem Falsa 3 vezes."),
]
PAPEIS = [
 dict(id="delegada", letra="D", nome="Delegada", especialidade="Comando", texto="1×/rodada transfere 1 PA a outro detetive. Acusação custa 2 PA e vale de qualquer lugar. Itens custam 1 crédito a menos."),
 dict(id="perito", letra="P", nome="Perito Criminal", especialidade="Forense", texto="Investigar também mostra o próximo local se o rastro tem até 3 rodadas. Periciar Contato custa 1 PA."),
 dict(id="analista", letra="A", nome="Analista de Inteligência", especialidade="Inteligência", texto="Interceptar custa 1 PA, +15%, de qualquer lugar. Não pode Abordar."),
 dict(id="tatico", letra="T", nome="Agente Tático", especialidade="Operações", texto="Abordar custa 1 PA e ignora 1 nível de lotação. Viatura alcança 5 ligações. Interceptar custa 3 PA."),
 dict(id="rua", letra="R", nome="Investigadora de Rua", especialidade="Campo", so_com_6=True, texto="Interrogar grátis 1×/rodada, com alcance 3. Um Retrato Falado grátis por partida."),
]

# ------------------------------------------------------------------------------------------
def checar(ev):
    for e in ev["efeitos"]:
        assert e["tipo"] in EFEITOS, f'{ev["id"]}: efeito desconhecido {e["tipo"]}'
        for z in e.get("zonas", []): assert z in ZONAS, f'{ev["id"]}: zona {z}'
        for l in e.get("linhas", []): assert l in LINHAS, f'{ev["id"]}: linha {l}'
for ev in AGENDADOS + ALEATORIOS: checar(ev)
ids = [e["id"] for e in AGENDADOS + ALEATORIOS]; assert len(ids) == len(set(ids)), "id repetido"

def regioes(ev):
    z = set()
    for e in ev["efeitos"]:
        z |= set(e.get("zonas", []))
        for i in e.get("locais", []): z.add(next(n["zona"] for n in MAPA["locais"] if n["id"] == i))
        if "local" in e: z.add(next(n["zona"] for n in MAPA["locais"] if n["id"] == e["local"]))
    return sorted(z)
for ev in AGENDADOS + ALEATORIOS: ev["regioes"] = regioes(ev)
cobertas = set().union(*[set(e["regioes"]) for e in AGENDADOS + ALEATORIOS])
assert cobertas >= ZONAS, "zonas sem nenhum evento: " + ", ".join(sorted(ZONAS - cobertas))

saida = {
    "versao": 1,
    "regras_eventos": {"agendados_por_partida": 4, "aleatorio_a_partir_da_rodada": 2, "aleatorios_por_rodada": 1},
    "efeitos": EFEITOS,
    "eventos_agendados": AGENDADOS,
    "eventos_aleatorios": ALEATORIOS,
    "itens": ITENS, "perfis_espiao": PERFIS, "papeis_detetives": PAPEIS,
}
json.dump(saida, open(os.path.join(HERE, "cartas.json"), "w"), ensure_ascii=False, indent=1)
print(f"{len(AGENDADOS)} agendados, {len(ALEATORIOS)} aleatórios ({sum(e['copias'] for e in ALEATORIOS)} cartas no baralho), "
      f"{len(ITENS)} itens, {len(PERFIS)} perfis, {len(PAPEIS)} papéis; zonas cobertas: {', '.join(sorted(cobertas))}")

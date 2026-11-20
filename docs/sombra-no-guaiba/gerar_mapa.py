"""Gera o tabuleiro de Sombra no Guaíba a partir de uma lista de locais reais de Porto Alegre.

Saídas (na mesma pasta):
  mapa.json        locais, ligações a pé, linhas de ônibus, Trensurb, barcos, tipos de área
  mapa-arte.json   desenho do tabuleiro: terra, ilhas, territórios dos locais (em metros)

Uso: python3 gerar_mapa.py   (requer shapely e scipy)
"""
import json, math, os
from itertools import combinations
from shapely.geometry import Polygon, LineString, Point, MultiPolygon
from shapely.ops import unary_union
from scipy.spatial import Voronoi, Delaunay

HERE = os.path.dirname(os.path.abspath(__file__))
LAT0, LON0 = -30.06, -51.18
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
def P(lat, lon): return ((lon - LON0) * KX, (LAT0 - lat) * KY)

# --------------------------------------------------------------------------------------------
# Tipos de área (efeitos de jogo descritos no GDD, seção 4)
TIPOS = {
    "comercial":     "Comercial / Centro",
    "boemio":        "Boêmio",
    "nobre":         "Bairro nobre",
    "residencial":   "Residencial",
    "universitario": "Universitário / Hospitalar",
    "industrial":    "Industrial / Logístico",
    "quente":        "Zona quente",
    "lazer":         "Parque / Orla",
    "rural":         "Rural / Extremo Sul",
    "ilha":          "Ilhas",
}
ZONAS = {"CEN": "Centro Histórico", "CBX": "Cidade Baixa e Menino Deus", "BOM": "Bom Fim e Farroupilha",
         "MOI": "Moinhos e bairros nobres", "NOR": "Zona Norte", "LES": "Zona Leste",
         "SUL": "Zona Sul", "EXT": "Extremo Sul", "ILH": "Ilhas"}

# nome, curto, zona, tipo, aglomeração base (0-5), etiquetas, lat, lon
L = [
 # Centro Histórico
 ("Mercado Público / Largo Glênio Peres", "Mercado Público", "CEN", "comercial", 4, "T TERM CAM TUR BIKE EMERGENCIA", -30.0272, -51.2283),
 ("Praça da Alfândega / Rua da Praia", "Alfândega", "CEN", "comercial", 3, "CON CAM TUR BIKE", -30.0298, -51.2318),
 ("Cais Mauá", "Cais Mauá", "CEN", "lazer", 2, "EXT:agua B TUR", -30.0258, -51.2345),
 ("Casa de Cultura Mario Quintana", "Casa de Cultura", "CEN", "comercial", 2, "CON TUR BIKE", -30.0313, -51.2365),
 ("Cais Embarcadero", "Embarcadero", "CEN", "boemio", 2, "B TUR", -30.0298, -51.2400),
 ("Usina do Gasômetro", "Gasômetro", "CEN", "lazer", 3, "TUR BIKE", -30.0345, -51.2422),
 ("Praça da Matriz / Catedral / Theatro São Pedro", "Matriz", "CEN", "comercial", 2, "TUR BIKE", -30.0335, -51.2300),
 ("Estação Rodoviária", "Rodoviária", "CEN", "comercial", 4, "EXT:terra T TERM CAM ATM", -30.0222, -51.2188),
 ("Floresta / Av. Cristóvão Colombo", "Floresta", "CEN", "residencial", 2, "BIKE", -30.0205, -51.2080),
 # Cidade Baixa, Menino Deus, Azenha
 ("Cidade Baixa / Rua da República", "Cidade Baixa", "CBX", "boemio", 3, "CON BIKE NOITE+1", -30.0408, -51.2235),
 ("Parque Harmonia", "Harmonia", "CBX", "lazer", 1, "PARQUE ESC", -30.0428, -51.2330),
 ("Orla do Guaíba / Anfiteatro Pôr do Sol", "Pôr do Sol", "CBX", "lazer", 2, "TUR BIKE", -30.0462, -51.2405),
 ("Shopping Praia de Belas", "Praia de Belas", "CBX", "comercial", 3, "CAM ATM LOJ BIKE", -30.0500, -51.2290),
 ("Parque Marinha do Brasil", "Parque Marinha", "CBX", "lazer", 1, "PARQUE ESC BIKE", -30.0580, -51.2330),
 ("Estádio Beira-Rio", "Beira-Rio", "CBX", "lazer", 1, "ESTADIO TUR BIKE", -30.0655, -51.2360),
 ("Menino Deus / Av. Getúlio Vargas", "Menino Deus", "CBX", "residencial", 2, "CON BIKE", -30.0560, -51.2205),
 ("Azenha / Av. da Azenha", "Azenha", "CBX", "comercial", 2, "BIKE", -30.0590, -51.2125),
 ("Palácio da Polícia", "Palácio da Polícia", "CBX", "comercial", 2, "HQ", -30.0478, -51.2140),
 ("Medianeira / Santo Antônio", "Medianeira", "CBX", "residencial", 2, "", -30.0705, -51.2055),
 ("Vila Cruzeiro / Santa Tereza", "Vila Cruzeiro", "CBX", "quente", 2, "ESC", -30.0760, -51.2215),
 ("Morro Santa Tereza (torres de TV)", "Morro Santa Tereza", "CBX", "lazer", 0, "ANT ESC MORRO", -30.0695, -51.2295),
 # Bom Fim e Farroupilha
 ("Parque da Redenção / Brique / Araújo Vianna", "Redenção", "BOM", "lazer", 3, "CON PARQUE TUR BIKE", -30.0378, -51.2150),
 ("UFRGS – Campus Centro", "UFRGS", "BOM", "universitario", 2, "BIKE", -30.0335, -51.2190),
 ("Bom Fim / Av. Osvaldo Aranha", "Bom Fim", "BOM", "boemio", 2, "BIKE NOITE+1", -30.0318, -51.2100),
 ("Hospital de Clínicas / Santa Cecília", "Clínicas", "BOM", "universitario", 3, "", -30.0390, -51.2063),
 ("Av. Independência", "Independência", "BOM", "residencial", 2, "BIKE", -30.0270, -51.2090),
 # Moinhos e bairros nobres
 ("Rua Padre Chagas", "Padre Chagas", "MOI", "nobre", 2, "CON BIKE NOITE+1", -30.0268, -51.2018),
 ("Parcão / Shopping Moinhos", "Parcão", "MOI", "nobre", 2, "PARQUE LOJ ATM BIKE", -30.0232, -51.1955),
 ("Mont'Serrat", "Mont'Serrat", "MOI", "nobre", 1, "", -30.0262, -51.1865),
 ("Bela Vista / Praça da Encol", "Bela Vista", "MOI", "nobre", 1, "CON BIKE", -30.0352, -51.1848),
 ("Petrópolis / Av. Protásio Alves", "Petrópolis", "MOI", "residencial", 2, "BIKE", -30.0442, -51.1858),
 ("Auxiliadora / Av. Plínio Brasil Milano", "Auxiliadora", "MOI", "nobre", 2, "", -30.0185, -51.1855),
 ("Três Figueiras", "Três Figueiras", "MOI", "nobre", 1, "", -30.0357, -51.1665),
 ("Shopping Iguatemi", "Iguatemi", "MOI", "nobre", 3, "CAM ATM LOJ", -30.0265, -51.1628),
 ("Chácara das Pedras", "Chácara das Pedras", "MOI", "nobre", 1, "", -30.0302, -51.1505),
 ("Boa Vista / Country Club", "Boa Vista", "MOI", "nobre", 1, "", -30.0183, -51.1705),
 # Zona Leste
 ("Jardim Botânico", "Jardim Botânico", "LES", "lazer", 1, "CON PARQUE TUR", -30.0515, -51.1765),
 ("Bourbon Ipiranga / Av. Ipiranga", "Bourbon Ipiranga", "LES", "comercial", 2, "CAM ATM LOJ", -30.0572, -51.1845),
 ("PUCRS", "PUCRS", "LES", "universitario", 3, "CON", -30.0598, -51.1728),
 ("Partenon / Av. Bento Gonçalves", "Partenon", "LES", "residencial", 2, "", -30.0620, -51.1965),
 ("São José", "São José", "LES", "residencial", 2, "", -30.0612, -51.1480),
 ("Vila Bom Jesus", "Bom Jesus", "LES", "quente", 2, "ESC", -30.0442, -51.1545),
 ("Jardim Carvalho / Protásio Alves", "Jardim Carvalho", "LES", "residencial", 2, "", -30.0420, -51.1355),
 ("Morro Santana", "Morro Santana", "LES", "lazer", 0, "ESC MORRO", -30.0565, -51.1295),
 ("Agronomia / UFRGS Campus do Vale", "Campus do Vale", "LES", "universitario", 1, "", -30.0720, -51.1210),
 ("Lomba do Pinheiro", "Lomba do Pinheiro", "LES", "quente", 2, "ESC", -30.1060, -51.1200),
 # Zona Norte
 ("Igreja dos Navegantes / Av. Farrapos", "Navegantes", "NOR", "industrial", 2, "TUR", -30.0110, -51.2110),
 ("Estação São Pedro", "São Pedro", "NOR", "industrial", 2, "T", -30.0152, -51.2068),
 ("Ponte do Guaíba (Travessia Régis Bittencourt)", "Ponte do Guaíba", "NOR", "industrial", 1, "EXT:terra", -30.0045, -51.2235),
 ("Estação Farrapos", "Farrapos", "NOR", "industrial", 2, "T", -30.0035, -51.2008),
 ("Humaitá", "Humaitá", "NOR", "industrial", 1, "ESC", -29.9890, -51.2000),
 ("Arena do Grêmio", "Arena", "NOR", "lazer", 1, "ESTADIO TUR", -29.9740, -51.1955),
 ("São João / Higienópolis", "São João", "NOR", "residencial", 2, "", -30.0110, -51.1905),
 ("Aeroporto Salgado Filho", "Aeroporto", "NOR", "comercial", 3, "EXT:ar T CAM ATM", -29.9935, -51.1715),
 ("Anchieta / Ceasa", "Ceasa", "NOR", "industrial", 1, "CON T MADRUGADA+2", -29.9795, -51.1640),
 ("Passo d'Areia / Av. Assis Brasil", "Passo d'Areia", "NOR", "comercial", 3, "TERM", -30.0068, -51.1772),
 ("Bourbon Wallig", "Bourbon Wallig", "NOR", "comercial", 3, "CAM ATM LOJ", -30.0092, -51.1590),
 ("Cristo Redentor", "Cristo Redentor", "NOR", "residencial", 2, "", -30.0045, -51.1450),
 ("Jardim Lindóia", "Lindóia", "NOR", "residencial", 1, "", -29.9962, -51.1555),
 ("Sarandi", "Sarandi", "NOR", "residencial", 2, "", -29.9860, -51.1320),
 ("Passo das Pedras", "Passo das Pedras", "NOR", "residencial", 2, "", -29.9995, -51.1180),
 ("Complexo Cultural do Porto Seco", "Porto Seco", "NOR", "lazer", 0, "ESC", -29.9925, -51.1065),
 ("Rubem Berta", "Rubem Berta", "NOR", "quente", 2, "ESC TERM", -29.9835, -51.0955),
 ("Jardim Itu-Sabará", "Jardim Itu", "NOR", "residencial", 2, "", -30.0185, -51.1395),
 ("Mário Quintana", "Mário Quintana", "NOR", "quente", 2, "ESC", -30.0250, -51.0955),
 # Ilhas
 ("Ilha Grande dos Marinheiros", "Ilha dos Marinheiros", "ILH", "ilha", 1, "CON ESC B", -30.0005, -51.2475),
 ("Ilha da Pintada", "Ilha da Pintada", "ILH", "ilha", 1, "EXT:agua B", -30.0310, -51.2625),
 ("Ilha das Flores", "Ilha das Flores", "ILH", "ilha", 0, "ESC", -29.9862, -51.2380),
 # Zona Sul
 ("Fundação Iberê Camargo", "Iberê Camargo", "SUL", "lazer", 1, "CON TUR", -30.0775, -51.2450),
 ("BarraShoppingSul", "BarraShopping", "SUL", "comercial", 3, "CAM ATM LOJ", -30.0858, -51.2438),
 ("Cristal / Av. Diário de Notícias", "Cristal", "SUL", "residencial", 2, "", -30.0835, -51.2290),
 ("Hipódromo do Cristal", "Hipódromo", "SUL", "lazer", 1, "ESC", -30.0960, -51.2390),
 ("Glória / Av. Oscar Pereira", "Glória", "SUL", "residencial", 2, "", -30.0795, -51.1990),
 ("Teresópolis", "Teresópolis", "SUL", "residencial", 2, "", -30.0880, -51.2140),
 ("Morro da Polícia", "Morro da Polícia", "SUL", "lazer", 0, "ESC ANT MORRO", -30.0895, -51.1885),
 ("Nonoai", "Nonoai", "SUL", "residencial", 2, "", -30.0985, -51.2010),
 ("Cascata", "Cascata", "SUL", "residencial", 1, "", -30.0905, -51.1720),
 ("Vila Assunção", "Vila Assunção", "SUL", "nobre", 1, "", -30.1040, -51.2495),
 ("Tristeza / Av. Wenceslau Escobar", "Tristeza", "SUL", "residencial", 2, "CON", -30.1130, -51.2410),
 ("Cavalhada", "Cavalhada", "SUL", "residencial", 2, "", -30.1050, -51.2210),
 ("Morro do Osso", "Morro do Osso", "SUL", "lazer", 0, "ESC MORRO", -30.1185, -51.2240),
 ("Orla de Ipanema", "Ipanema", "SUL", "lazer", 2, "B TUR", -30.1355, -51.2325),
 ("Vila Nova", "Vila Nova", "SUL", "residencial", 1, "", -30.1265, -51.2010),
 ("Belém Velho", "Belém Velho", "SUL", "rural", 1, "", -30.1180, -51.1760),
 ("Espírito Santo / Guarujá", "Guarujá", "SUL", "residencial", 1, "", -30.1600, -51.2285),
 ("Hípica / Aberta dos Morros", "Hípica", "SUL", "residencial", 1, "", -30.1450, -51.1990),
 ("Restinga", "Restinga", "SUL", "quente", 3, "ESC TERM", -30.1500, -51.1440),
 # Extremo Sul
 ("Serraria", "Serraria", "EXT", "rural", 1, "", -30.1750, -51.2160),
 ("Ponta Grossa", "Ponta Grossa", "EXT", "rural", 0, "ESC", -30.1880, -51.2075),
 ("Píer de Belém Novo", "Belém Novo", "EXT", "rural", 1, "EXT:agua B", -30.2050, -51.1840),
 ("Chapéu do Sol", "Chapéu do Sol", "EXT", "rural", 1, "", -30.1980, -51.1500),
 ("Lageado", "Lageado", "EXT", "rural", 0, "ESC", -30.2100, -51.1200),
 ("Lami", "Lami", "EXT", "rural", 1, "", -30.2370, -51.1000),
 ("Reserva Biológica do Lami", "Reserva do Lami", "EXT", "lazer", 0, "CON ESC", -30.2445, -51.0880),
]

# Locais adicionados para cobrir a cidade inteira
L += [
 ("Santana / Av. Ipiranga", "Santana", "CBX", "residencial", 2, "BIKE", -30.0492, -51.2005),
 ("Coronel Aparício Borges", "Aparício Borges", "LES", "residencial", 2, "", -30.0712, -51.1858),
 ("Vila Ipiranga", "Vila Ipiranga", "NOR", "residencial", 2, "", -30.0150, -51.1530),
 ("Santa Maria Goretti", "Maria Goretti", "NOR", "residencial", 2, "", -29.9985, -51.1890),
 ("Anchieta (distrito industrial)", "Anchieta", "NOR", "industrial", 1, "ESC", -29.9842, -51.1800),
 ("Parque Santa Fé", "Parque Santa Fé", "NOR", "residencial", 2, "", -29.9765, -51.1185),
 ("Costa e Silva", "Costa e Silva", "NOR", "residencial", 2, "", -30.0118, -51.1205),
 ("Pedra Redonda", "Pedra Redonda", "SUL", "nobre", 1, "", -30.1238, -51.2470),
 ("Jardim Isabel", "Jardim Isabel", "SUL", "residencial", 1, "", -30.1345, -51.2170),
 ("Campo Novo", "Campo Novo", "SUL", "residencial", 1, "", -30.1525, -51.2140),
 ("Extrema", "Extrema", "EXT", "rural", 0, "ESC", -30.2230, -51.1440),
]
nodes = []
for i, (n, s, z, t, a, tags, lat, lon) in enumerate(L, 1):
    x, y = P(lat, lon)
    nodes.append({"id": i, "nome": n, "curto": s, "zona": z, "tipo": t, "aglomeracao_base": a,
                  "etiquetas": tags.split(), "lat": lat, "lon": lon, "x": round(x), "y": round(y)})
ID = {n["curto"]: n["id"] for n in nodes}
N = {n["id"]: n for n in nodes}

# --------------------------------------------------------------------------------------------
# Terra e ilhas
SHORE = [(-29.952, -51.207), (-29.962, -51.206), (-29.975, -51.209), (-29.990, -51.211), (-30.000, -51.212),
 (-30.008, -51.215), (-30.015, -51.219), (-30.020, -51.225), (-30.0235, -51.232), (-30.0265, -51.2385),
 (-30.0295, -51.2425), (-30.0335, -51.2455), (-30.0375, -51.2440), (-30.0430, -51.2425), (-30.050, -51.2415),
 (-30.058, -51.2400), (-30.065, -51.2405), (-30.072, -51.2445), (-30.078, -51.2478), (-30.086, -51.2485),
 (-30.095, -51.2505), (-30.102, -51.2545), (-30.110, -51.2570), (-30.118, -51.2555), (-30.126, -51.2490),
 (-30.133, -51.2405), (-30.142, -51.2365), (-30.152, -51.2370), (-30.160, -51.2350), (-30.170, -51.2285),
 (-30.180, -51.2225), (-30.188, -51.2165), (-30.196, -51.2050), (-30.203, -51.1910), (-30.212, -51.1795),
 (-30.222, -51.1600), (-30.232, -51.1300), (-30.240, -51.1050), (-30.250, -51.0900), (-30.262, -51.0750), (-30.275, -51.0600)]
EAST, NORTH, SOUTH = -51.050, -29.952, -30.275
land = Polygon([P(*p) for p in SHORE] + [P(SOUTH, EAST), P(NORTH, EAST)])
def ellipse(lat, lon, rx, ry, rot, n=28):
    cx, cy = P(lat, lon); a = math.radians(rot)
    return Polygon([(cx + rx * math.cos(t) * math.cos(a) - ry * math.sin(t) * math.sin(a),
                     cy + rx * math.cos(t) * math.sin(a) + ry * math.sin(t) * math.cos(a))
                    for t in [2 * math.pi * k / n for k in range(n)]])
ISLANDS = {"Ilha Grande dos Marinheiros": ellipse(-30.0010, -51.2475, 700, 2300, 12),
           "Ilha da Pintada": ellipse(-30.0310, -51.2625, 950, 620, -25),
           "Ilha das Flores": ellipse(-29.9850, -51.2370, 520, 1100, 20),
           "Ilha do Pavão": ellipse(-30.0085, -51.2295, 300, 650, 35),
           "Ilha do Chico Inglês": ellipse(-29.9930, -51.2650, 450, 1500, 5)}
islands = unary_union(list(ISLANDS.values()))
allland = unary_union([land, islands])
# Rio Gravataí (limite norte), como faixa de água
gravatai = LineString([P(-29.962, -51.206), P(-29.966, -51.185), P(-29.963, -51.160), P(-29.968, -51.135),
                       P(-29.964, -51.110), P(-29.968, -51.085), P(-29.965, -51.050)]).buffer(170)
allland = allland.difference(gravatai)
# Municípios vizinhos (fora do tabuleiro): Canoas, Alvorada e Viamão
fora = Polygon([P(-29.80, -51.215), P(-29.80, -50.75), P(-30.38, -50.75), P(-30.33, -51.010), P(-30.295, -51.040)] +
               [P(*p) for p in reversed(SHORE)] + [P(-29.940, -51.208), P(-29.900, -51.215)]).difference(land)
fora = fora.difference(gravatai)

# --------------------------------------------------------------------------------------------
# Ligações a pé: grafo de Gabriel sobre a triangulação de Delaunay, sem atravessar água
pts = [(n["x"], n["y"]) for n in nodes]
tri = Delaunay(pts)
cand = set()
for s in tri.simplices:
    for a, b in combinations(sorted(s), 2): cand.add((a, b))
def maxlen(a, b):
    sparse = {"rural", "quente", "lazer"}
    ta, tb = nodes[a]["tipo"], nodes[b]["tipo"]
    if nodes[a]["zona"] == "EXT" or nodes[b]["zona"] == "EXT": return 4600
    if "quente" in (ta, tb) or "rural" in (ta, tb): return 5000
    if "lazer" in (ta, tb): return 3000
    return 2600
edges = []
for a, b in sorted(cand):
    pa, pb = pts[a], pts[b]; d = math.dist(pa, pb)
    if d > maxlen(a, b): continue
    mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
    if any(math.dist(mid, pts[k]) < d / 2 * 0.98 for k in range(len(pts)) if k not in (a, b)): continue
    seg = LineString([pa, pb])
    if not allland.buffer(60).contains(seg): continue
    edges.append([int(a) + 1, int(b) + 1])
BRIDGES = [("Ponte do Guaíba", "Ilha dos Marinheiros"), ("Ilha dos Marinheiros", "Ilha das Flores"),
           ("Ilha dos Marinheiros", "Ilha da Pintada"), ("Ponte do Guaíba", "Navegantes"),
           ("Arena", "Ceasa")]
REMOVE = []
for a, b in BRIDGES:
    e = sorted([ID[a], ID[b]])
    if e not in edges: edges.append(e)
edges = [e for e in edges if sorted(e) not in [sorted([ID[a], ID[b]]) for a, b in REMOVE]]
edges.sort()

# --------------------------------------------------------------------------------------------
# Transporte
LINHAS = [
 ("L1", "Assis Brasil", True, ["Mercado Público", "Rodoviária", "Floresta", "São João", "Passo d'Areia", "Bourbon Wallig", "Cristo Redentor", "Sarandi", "Passo das Pedras", "Rubem Berta"]),
 ("L2", "Protásio Alves", False, ["Mercado Público", "UFRGS", "Bom Fim", "Bela Vista", "Petrópolis", "Três Figueiras", "Chácara das Pedras", "Bom Jesus", "Jardim Carvalho", "Mário Quintana"]),
 ("L3", "Bento Gonçalves", True, ["Mercado Público", "Matriz", "Redenção", "Clínicas", "Partenon", "PUCRS", "São José", "Campus do Vale", "Lomba do Pinheiro"]),
 ("L4", "Ipiranga", False, ["Praia de Belas", "Menino Deus", "Palácio da Polícia", "Santana", "Bourbon Ipiranga", "PUCRS", "São José", "Jardim Carvalho"]),
 ("L5", "Zona Sul / Orla", True, ["Mercado Público", "Gasômetro", "Pôr do Sol", "Parque Marinha", "Beira-Rio", "Iberê Camargo", "BarraShopping", "Hipódromo", "Vila Assunção", "Tristeza", "Pedra Redonda", "Ipanema", "Guarujá", "Serraria", "Belém Novo"]),
 ("L6", "Cavalhada / Restinga", False, ["Mercado Público", "Cidade Baixa", "Azenha", "Medianeira", "Vila Cruzeiro", "Teresópolis", "Nonoai", "Cavalhada", "Vila Nova", "Hípica", "Restinga"]),
 ("L7", "Farrapos / Arena", False, ["Mercado Público", "Rodoviária", "São Pedro", "Navegantes", "Farrapos", "Humaitá", "Arena", "Anchieta", "Ceasa"]),
 ("L8", "Independência / Moinhos", False, ["Matriz", "Independência", "Padre Chagas", "Parcão", "Mont'Serrat", "Auxiliadora", "São João", "Maria Goretti", "Anchieta"]),
 ("L9", "Oscar Pereira / Belém Velho", False, ["Azenha", "Glória", "Cascata", "Belém Velho", "Restinga"]),
 ("L10", "Lotação Extremo Sul", False, ["Restinga", "Chapéu do Sol", "Belém Novo", "Lageado", "Extrema", "Lami", "Reserva do Lami"]),
 ("L11", "Nilo Peçanha / Sertório", False, ["Iguatemi", "Boa Vista", "Vila Ipiranga", "Lindóia", "Aeroporto", "Sarandi", "Parque Santa Fé", "Porto Seco"]),
 ("L12", "III Perimetral", True, ["Aeroporto", "Passo d'Areia", "Boa Vista", "Iguatemi", "Três Figueiras", "Jardim Botânico", "Aparício Borges", "Glória", "Teresópolis", "Cristal", "BarraShopping"]),
 ("L13", "Ilhas", False, ["Mercado Público", "Rodoviária", "Navegantes", "Ponte do Guaíba", "Ilha dos Marinheiros", "Ilha das Flores", "Ilha da Pintada"]),
 ("L14", "Transversal Norte", False, ["Passo d'Areia", "Vila Ipiranga", "Jardim Itu", "Costa e Silva", "Mário Quintana"]),
 ("L15", "Juca Batista", False, ["Cavalhada", "Vila Nova", "Jardim Isabel", "Campo Novo", "Serraria", "Ponta Grossa", "Belém Novo"]),
 ("L16", "Lomba / Restinga", False, ["Campus do Vale", "Lomba do Pinheiro", "Belém Velho", "Restinga"]),
]
linhas = [{"id": i, "nome": n, "corujao": c, "paradas": [ID[s] for s in st]} for i, n, c, st in LINHAS]
TREM = [ID[s] for s in ["Mercado Público", "Rodoviária", "São Pedro", "Farrapos", "Aeroporto", "Ceasa"]]
BARCO = [sorted([ID[a], ID[b]]) for a, b in [("Cais Mauá", "Ilha da Pintada"), ("Embarcadero", "Ilha da Pintada"),
         ("Embarcadero", "Ipanema"), ("Ipanema", "Belém Novo"), ("Ilha da Pintada", "Ilha dos Marinheiros"),
         ("Cais Mauá", "Ilha das Flores")]]

# --------------------------------------------------------------------------------------------
# Verificações de distância (em ligações a pé)
adj = {n["id"]: set() for n in nodes}
for a, b in edges: adj[a].add(b); adj[b].add(a)
def hops(s):
    d = {s: 0}; q = [s]
    while q:
        x = q.pop(0)
        for y in adj[x]:
            if y not in d: d[y] = d[x] + 1; q.append(y)
    return d
h = hops(ID["Mercado Público"])
assert len(h) == len(nodes), "grafo desconexo: " + str([N[i]["curto"] for i in N if i not in h])
diam = max(max(hops(i).values()) for i in N)
lens = [math.dist(pts[a - 1], pts[b - 1]) for a, b in edges]
SEM_ONIBUS_OK = {"Alfândega", "Cais Mauá", "Casa de Cultura", "Embarcadero", "Harmonia", "Morro Santa Tereza", "Morro Santana", "Morro da Polícia", "Morro do Osso", "Higienópolis"}
com_onibus = {i for l in linhas for i in l["paradas"]}
sem = [n["curto"] for n in nodes if n["id"] not in com_onibus and n["curto"] not in SEM_ONIBUS_OK]
assert not sem, "locais sem ônibus: " + ", ".join(sem)
report = {
    "locais": len(nodes), "ligacoes_a_pe": len(edges),
    "comprimento_medio_m": round(sum(lens) / len(lens)), "maior_ligacao_m": round(max(lens)),
    "diametro_em_ligacoes": diam,
    "mercado_ate": {k: h[ID[k]] for k in ["Aeroporto", "Arena", "Beira-Rio", "Restinga", "Belém Novo", "Lami", "Rubem Berta"]},
}

# --------------------------------------------------------------------------------------------
# Arte: territórios (Voronoi recortado na terra e limitado a um raio)
far = [(-1e6, -1e6), (1e6, -1e6), (1e6, 1e6), (-1e6, 1e6)]
vor = Voronoi(pts + far)
def fmt(geom):
    polys = [geom] if geom.geom_type == "Polygon" else list(getattr(geom, "geoms", []))
    out = []
    for p in polys:
        if p.geom_type != "Polygon" or p.area < 2000: continue
        for ring in [p.exterior] + list(p.interiors):
            c = [(round(x), round(y)) for x, y in ring.coords]
            out.append("M" + " L".join(f"{x} {y}" for x, y in c) + "Z")
    return "".join(out)
cells = []; cellgeo = {}
for i, n in enumerate(nodes):
    reg = vor.regions[vor.point_region[i]]
    if -1 in reg or not reg: continue
    cell = Polygon([vor.vertices[k] for k in reg])
    rad = 3200 if n["zona"] != "EXT" else 5200
    cell = cell.intersection(Point(pts[i]).buffer(rad, 24)).intersection(allland)
    if n["tipo"] == "ilha": cell = cell.intersection(islands)
    elif n["zona"] != "ILH": cell = cell.difference(islands)
    cellgeo[n["id"]] = cell
    cells.append({"id": n["id"], "d": fmt(cell.simplify(25))})
# Quarteirões: grade de ruas recortada em cada território urbano
import random
rnd = random.Random(7)
ESP = {"comercial": 150, "boemio": 170, "nobre": 230, "residencial": 200, "universitario": 260, "industrial": 360, "quente": 130}
ANG = {"CEN": -32, "CBX": -8, "BOM": 14, "MOI": 22, "NOR": 34, "LES": 4, "SUL": -14, "EXT": 0, "ILH": 0}
from shapely.geometry import MultiLineString
from shapely import affinity
ruas = []
for n in nodes:
    c = cellgeo.get(n["id"])
    if c is None or c.is_empty or n["tipo"] not in ESP: continue
    inner = c.buffer(-70)
    if inner.is_empty: continue
    sp = ESP[n["tipo"]]; ang = ANG[n["zona"]] + rnd.uniform(-10, 10)
    x0, y0, x1, y1 = inner.bounds; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; R = math.hypot(x1 - x0, y1 - y0) / 2 + sp
    lines = []
    k = -R
    while k <= R:
        lines.append([(cx - R, cy + k), (cx + R, cy + k)])
        lines.append([(cx + k, cy - R), (cx + k, cy + R)])
        k += sp * (1.6 if len(lines) % 4 == 0 and n["tipo"] != "quente" else 1)
    g = affinity.rotate(MultiLineString(lines), ang, origin=(cx, cy)).intersection(inner)
    for ln in getattr(g, "geoms", [g]):
        if ln.geom_type == "LineString" and ln.length > 60:
            (ax, ay), (bx, by) = ln.coords[0], ln.coords[-1]
            ruas.append(f"M{round(ax)} {round(ay)}L{round(bx)} {round(by)}")
# Árvores: parques, morros, orla, ilhas e área rural
arv = []
def sprinkle(geom, step, jitter=0.45):
    if geom.is_empty: return
    x0, y0, x1, y1 = geom.bounds
    y = y0
    while y < y1:
        x = x0
        while x < x1:
            px, py = x + rnd.uniform(-jitter, jitter) * step, y + rnd.uniform(-jitter, jitter) * step
            if geom.contains(Point(px, py)) and all(math.dist((px, py), pts[i]) > 230 for i in range(len(pts))):
                arv.extend([round(px), round(py)])
            x += step
        y += step * 0.87
for n in nodes:
    c = cellgeo.get(n["id"])
    if c is None: continue
    p = Point(n["x"], n["y"])
    if "MORRO" in n["etiquetas"]: sprinkle(c.intersection(p.buffer(950)), 150)
    elif n["tipo"] == "lazer": sprinkle(c.intersection(p.buffer(700)), 210)
    elif n["tipo"] == "rural": sprinkle(c.buffer(-80), 420)
    elif n["tipo"] == "ilha": sprinkle(c.buffer(-60), 260)
    elif n["tipo"] == "nobre": sprinkle(c.buffer(-90), 520)
# Rodovias
RODOVIAS = {
 "Av. Castelo Branco · Freeway": [(-30.0222, -51.2188), (-30.0160, -51.2165), (-30.0080, -51.2140), (-29.9980, -51.2105), (-29.9860, -51.2075), (-29.9720, -51.2050), (-29.9540, -51.2020)],
 "BR-290 · Travessia": [(-30.0050, -51.2160), (-30.0045, -51.2235), (-30.0015, -51.2400), (-29.9990, -51.2600), (-29.9960, -51.2900)],
}
rodovias = [{"nome": k, "d": "M" + " L".join(f"{round(P(*q)[0])} {round(P(*q)[1])}" for q in v)} for k, v in RODOVIAS.items()]
arte = {
    "origem": [LAT0, LON0], "kx": KX, "ky": KY,
    "terra": fmt(allland.simplify(20)),
    "ilhas": [{"nome": k, "d": fmt(v.simplify(15)), "x": round(v.centroid.x), "y": round(v.centroid.y)} for k, v in ISLANDS.items()],
    "gravatai": fmt(gravatai.simplify(20)),
    "fora": fmt(fora.simplify(30)),
    "vizinhos": [{"nome": n, "x": round(P(la, lo)[0]), "y": round(P(la, lo)[1])} for n, la, lo in
                 [("CANOAS", -29.925, -51.175), ("ALVORADA", -29.990, -51.035), ("VIAMÃO", -30.120, -50.990)]],
    "territorios": cells,
    "ruas": "".join(ruas),
    "arvores": arv,
    "rodovias": rodovias,
    "limites": [round(v) for v in allland.bounds],
}

mapa = {
    "versao": 2,
    "escala": "1 ligação a pé ≈ 0,5 a 2 km (cidade) e até 4 km (Extremo Sul)",
    "rodadas": {"total": 24, "hora_da_rodada_1": 6, "revelacoes": [3, 8, 13, 18, 23]},
    "zonas": ZONAS, "tipos": TIPOS,
    "locais": nodes,
    "conexoes": {
        "a_pe": edges,
        "barco": {"rodadas": [2, 16], "arestas": BARCO},
        "trensurb": {"rodadas": [1, 18], "estacoes": TREM},
        "onibus": {"rodadas": [1, 18], "corujao_rodadas": [19, 23], "linhas": linhas},
        "bike": {"rodadas": [1, 18], "estacoes": [n["id"] for n in nodes if "BIKE" in n["etiquetas"]]},
    },
    "janelas_extracao": {"A": [9, 10], "B": [13, 14], "C": [17, 18], "D": [21, 22]},
    "pontos_extracao": [n["id"] for n in nodes if any(t.startswith("EXT:") for t in n["etiquetas"])],
    "contatos_candidatos": [n["id"] for n in nodes if "CON" in n["etiquetas"]],
    "contatos_sorteados": 8,
    "inicio_detetives": {"fixo": ID["Palácio da Polícia"], "opcoes": [ID[s] for s in ["Mercado Público", "Redenção", "Aeroporto", "BarraShopping", "Iguatemi", "Passo d'Areia"]]},
    "relatorio": report,
}
json.dump(mapa, open(os.path.join(HERE, "mapa.json"), "w"), ensure_ascii=False, indent=1)
json.dump(arte, open(os.path.join(HERE, "mapa-arte.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps(report, ensure_ascii=False, indent=1))
